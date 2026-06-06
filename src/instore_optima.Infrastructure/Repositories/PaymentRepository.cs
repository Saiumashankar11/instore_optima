// PaymentRepository — EF Core data access for the Payment entity.
// This is the financial hub: creating or updating a payment triggers cascading writes
// to Orders, Invoices, and Receipts. Every multi-step write is wrapped in a DB transaction
// via ExecuteAtomicallyAsync so the database never ends up in a half-written state.
// ILogger is injected so transaction rollbacks are captured in application logs.
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace instore_optima.Api.Repositories.Implementations
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PaymentRepository> _logger;  // used to log transaction failures

        public PaymentRepository(AppDbContext context, ILogger<PaymentRepository> logger)
        {
            _context = context;
            _logger  = logger;
        }

        // ── Read methods — AsNoTracking for read-only performance ──

        public async Task<IEnumerable<Payment>> GetAllPaymentsAsync()
            => await _context.Payments.AsNoTracking().ToListAsync();

        public async Task<Payment?> GetPaymentByIdAsync(int paymentId)
            => await _context.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        public async Task<Payment?> GetPaymentByOrderIdAsync(int orderId)
            => await _context.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.OrderId == orderId);

        // ── Create — atomically creates payment + updates order status + auto-creates invoice ──

        public async Task<Payment> CreatePaymentAsync(Payment payment)
        {
            // Guard: only one payment per order.
            bool exists = await _context.Payments.AnyAsync(p => p.OrderId == payment.OrderId);
            if (exists)
                throw new InvalidOperationException(
                    $"A payment already exists for Order #{payment.OrderId}. Update its status instead.");

            // Payment + order-status + invoice are written atomically: either all
            // succeed or none do (no orphaned invoice / half-processed order).
            await ExecuteAtomicallyAsync(async () =>
            {
                payment.PaymentDate = DateTime.UtcNow;
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();   // assigns PaymentId (needed for invoice number below)

                var order = await _context.Orders.FindAsync(payment.OrderId);

                // A payment has been recorded → move the order into "Processing"
                // (stays Processing until the payment is marked Completed; this also
                // locks the order from further editing on the frontend).
                if (order != null && order.Status == "Pending")
                    order.Status = "Processing";

                // Auto-create the invoice if one doesn't already exist.
                bool hasInvoice = await _context.Invoices.AnyAsync(i => i.OrderId == payment.OrderId);
                if (!hasInvoice)
                {
                    // Invoice number format: INV-YYYY-NNNN (e.g. INV-2025-0042)
                    _context.Invoices.Add(new Invoice
                    {
                        OrderId       = payment.OrderId,
                        InvoiceNumber = $"INV-{DateTime.UtcNow.Year}-{payment.PaymentId:D4}",
                        TotalAmount   = order?.TotalAmount ?? 0,
                        TaxAmount     = 0,
                        IssuedDate    = DateTime.UtcNow,
                        DueDate       = DateTime.UtcNow.AddDays(30),  // 30-day payment terms
                        Status        = "Issued"
                    });
                }

                await _context.SaveChangesAsync();
            }, $"create payment for order #{payment.OrderId}");

            return payment;
        }

        // ── UpdateStatus — atomically updates status, auto-creates receipt, closes order/invoice ──

        public async Task<Payment> UpdatePaymentStatusAsync(int paymentId, string status)
        {
            var payment = await _context.Payments.FindAsync(paymentId);
            if (payment == null)
                throw new KeyNotFoundException($"Payment with ID {paymentId} not found.");

            // Whitelist check: reject unknown status values
            var validStatuses = new[] { "Pending", "Completed", "Failed", "Refunded" };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status: '{status}'.");

            // Status change + receipt + order completion + invoice paid: one atomic unit.
            await ExecuteAtomicallyAsync(async () =>
            {
                payment.PaymentStatus = status;

                if (status == "Completed")
                {
                    var order = await _context.Orders.FindAsync(payment.OrderId);

                    // Auto-create the receipt if missing.
                    bool hasReceipt = await _context.Receipts.AnyAsync(r => r.PaymentId == paymentId);
                    if (!hasReceipt)
                    {
                        // Receipt number format: RCP-YYYY-NNNN (e.g. RCP-2025-0042)
                        _context.Receipts.Add(new Receipt
                        {
                            PaymentId     = paymentId,
                            ReceiptNumber = $"RCP-{DateTime.UtcNow.Year}-{paymentId:D4}",
                            AmountPaid    = order?.TotalAmount ?? 0,
                            PaymentDate   = DateTime.UtcNow,
                            GeneratedAt   = DateTime.UtcNow
                        });
                    }

                    // Complete the linked order.
                    if (order != null && order.Status != "Completed" && order.Status != "Cancelled")
                        order.Status = "Completed";

                    // Mark the linked invoice Paid (leaves the "Issued" badge count).
                    var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.OrderId == payment.OrderId);
                    if (invoice != null && invoice.Status != "Paid")
                        invoice.Status = "Paid";
                }

                await _context.SaveChangesAsync();
            }, $"update payment #{paymentId} to {status}");

            return payment;
        }

        // ── Delete — atomically removes receipt + invoice + payment ──

        public async Task<bool> DeletePaymentAsync(int paymentId)
        {
            var payment = await _context.Payments.FindAsync(paymentId);
            if (payment == null) return false;

            await ExecuteAtomicallyAsync(async () =>
            {
                // Cascade: delete linked receipt + invoice, then the payment.
                var receipt = await _context.Receipts.FirstOrDefaultAsync(r => r.PaymentId == paymentId);
                if (receipt != null) _context.Receipts.Remove(receipt);

                var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.OrderId == payment.OrderId);
                if (invoice != null) _context.Invoices.Remove(invoice);

                _context.Payments.Remove(payment);
                await _context.SaveChangesAsync();
            }, $"delete payment #{paymentId}");

            return true;
        }

        // ── Transaction helper ────────────────────────────────────────────────────────
        // Runs <paramref name="work"/> inside a DB transaction on relational providers
        // (SQL Server). On non-relational providers (EF InMemory, used by unit tests)
        // it runs directly, since those don't support transactions. Failures are logged
        // and rethrown so the caller / global handler can surface them.
        private async Task ExecuteAtomicallyAsync(Func<Task> work, string operation)
        {
            if (!_context.Database.IsRelational())
            {
                // InMemory provider used in unit tests — run without a transaction
                await work();
                return;
            }

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                await work();
                await tx.CommitAsync();  // commit only if all steps succeeded
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();  // undo all writes if anything failed
                _logger.LogError(ex, "Transaction rolled back during: {Operation}", operation);
                throw;  // rethrow so the controller can return an appropriate error response
            }
        }
    }
}
