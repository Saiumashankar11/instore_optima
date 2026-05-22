using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Repositories.Implementations
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly AppDbContext _context;

        public PaymentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Payment>> GetAllPaymentsAsync()
        {
            return await _context.Payments.AsNoTracking().ToListAsync();
        }

        public async Task<Payment?> GetPaymentByIdAsync(int paymentId)
        {
            return await _context.Payments.AsNoTracking()
                .FirstOrDefaultAsync(p => p.PaymentId == paymentId);
        }

        public async Task<Payment?> GetPaymentByOrderIdAsync(int orderId)
        {
            return await _context.Payments.AsNoTracking()
                .FirstOrDefaultAsync(p => p.OrderId == orderId);
        }

        public async Task<Payment> CreatePaymentAsync(Payment payment)
        {
            // Guard: only one payment per order
            bool exists = await _context.Payments.AnyAsync(p => p.OrderId == payment.OrderId);
            if (exists)
                throw new InvalidOperationException(
                    $"A payment already exists for Order #{payment.OrderId}. Update its status instead.");

            payment.PaymentDate = DateTime.UtcNow;
            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            // Auto-create invoice if one doesn't exist for this order
            try
            {
                bool hasInvoice = await _context.Invoices.AnyAsync(i => i.OrderId == payment.OrderId);
                if (!hasInvoice)
                {
                    var order = await _context.Orders.FindAsync(payment.OrderId);
                    _context.Invoices.Add(new Invoice
                    {
                        OrderId = payment.OrderId,
                        InvoiceNumber = $"INV-{DateTime.UtcNow.Year}-{payment.PaymentId:D4}",
                        TotalAmount = order?.TotalAmount ?? 0,
                        TaxAmount = 0,
                        IssuedDate = DateTime.UtcNow,
                        DueDate = DateTime.UtcNow.AddDays(30),
                        Status = "Issued"
                    });
                    await _context.SaveChangesAsync();
                }
            }
            catch { /* Invoice auto-creation is best-effort; never block payment */ }

            return payment;
        }

        public async Task<Payment> UpdatePaymentStatusAsync(int paymentId, string status)
        {
            var payment = await _context.Payments.FindAsync(paymentId);
            if (payment == null)
                throw new KeyNotFoundException($"Payment with ID {paymentId} not found.");
            var validStatuses = new[] { "Pending", "Completed", "Failed", "Refunded" };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status: '{status}'.");
            payment.PaymentStatus = status;
            await _context.SaveChangesAsync();

            // Auto-create receipt and complete the order when payment is marked Completed
            if (status == "Completed")
            {
                try
                {
                    bool hasReceipt = await _context.Receipts.AnyAsync(r => r.PaymentId == paymentId);
                    if (!hasReceipt)
                    {
                        var order = await _context.Orders.FindAsync(payment.OrderId);
                        _context.Receipts.Add(new Receipt
                        {
                            PaymentId = paymentId,
                            ReceiptNumber = $"RCP-{DateTime.UtcNow.Year}-{paymentId:D4}",
                            AmountPaid = order?.TotalAmount ?? 0,
                            PaymentDate = DateTime.UtcNow,
                            GeneratedAt = DateTime.UtcNow
                        });
                        await _context.SaveChangesAsync();
                    }
                }
                catch { /* Receipt auto-creation is best-effort; never block status update */ }

                // Auto-complete the linked order
                try
                {
                    var linkedOrder = await _context.Orders.FindAsync(payment.OrderId);
                    if (linkedOrder != null && linkedOrder.Status != "Completed" && linkedOrder.Status != "Cancelled")
                    {
                        linkedOrder.Status = "Completed";
                        await _context.SaveChangesAsync();
                    }
                }
                catch { /* Order status update is best-effort; never block payment completion */ }
            }

            return payment;
        }

        public async Task<bool> DeletePaymentAsync(int paymentId)
        {
            var payment = await _context.Payments.FindAsync(paymentId);
            if (payment == null) return false;

            // Cascade: delete linked receipt
            var receipt = await _context.Receipts.FirstOrDefaultAsync(r => r.PaymentId == paymentId);
            if (receipt != null) _context.Receipts.Remove(receipt);

            // Cascade: delete linked invoice
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.OrderId == payment.OrderId);
            if (invoice != null) _context.Invoices.Remove(invoice);

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}