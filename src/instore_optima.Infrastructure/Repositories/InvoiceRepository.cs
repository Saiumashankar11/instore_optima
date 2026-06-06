// InvoiceRepository — EF Core data access for the Invoice entity via AppDbContext.
// Invoices are typically auto-created by PaymentRepository when a payment is recorded.
// Read queries use AsNoTracking() for better performance since they don't need to track changes.
// Valid statuses: Draft | Issued | Paid | Overdue.
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class InvoiceRepository : IInvoiceRepository
    {
        private readonly AppDbContext _context;

        public InvoiceRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Invoice>> GetAllInvoicesAsync()
        {
            return await _context.Invoices
                .AsNoTracking()                          // read-only: skip EF change tracking for performance
                .OrderByDescending(i => i.IssuedDate)   // most recently issued first
                .ToListAsync();
        }

        public async Task<Invoice?> GetInvoiceByIdAsync(int invoiceId)
        {
            return await _context.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);
        }

        public async Task<IEnumerable<Invoice>> GetInvoicesByOrderIdAsync(int orderId)
        {
            return await _context.Invoices
                .AsNoTracking()
                .Where(i => i.OrderId == orderId)   // ← fixed property name
                .ToListAsync();
        }

        public async Task<Invoice> CreateInvoiceAsync(Invoice invoice)
        {
            invoice.IssuedDate = DateTime.UtcNow;  // always set server-side
            invoice.Status = "Draft";               // new invoices start as Draft

            await _context.Invoices.AddAsync(invoice);
            await _context.SaveChangesAsync();
            return invoice;
        }

        public async Task<Invoice> UpdateInvoiceStatusAsync(int invoiceId, string status)
        {
            // Note: no AsNoTracking here — we need EF to track changes so SaveChanges works
            var invoice = await _context.Invoices
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
                throw new KeyNotFoundException($"Invoice {invoiceId} not found");

            // Whitelist check: reject any status value not in the allowed set
            var allowed = new[] { "Draft", "Issued", "Paid", "Overdue" };
            if (!allowed.Contains(status))
                throw new ArgumentException(
                    $"Invalid status '{status}'. Allowed: Draft, Issued, Paid, Overdue");

            invoice.Status = status;
            await _context.SaveChangesAsync();
            return invoice;
        }
    }
}