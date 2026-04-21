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
                .AsNoTracking()
                .OrderByDescending(i => i.IssuedDate)
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
            invoice.IssuedDate = DateTime.UtcNow;
            invoice.Status = "Draft";

            await _context.Invoices.AddAsync(invoice);
            await _context.SaveChangesAsync();
            return invoice;
        }

        public async Task<Invoice> UpdateInvoiceStatusAsync(int invoiceId, string status)
        {
            var invoice = await _context.Invoices
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
                throw new KeyNotFoundException($"Invoice {invoiceId} not found");

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