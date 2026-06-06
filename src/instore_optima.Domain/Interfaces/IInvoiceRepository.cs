// IInvoiceRepository — contract for managing Invoice records.
// Invoices are auto-created when a payment is recorded against an order.
// Valid statuses: Draft | Issued | Paid | Overdue.
using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IInvoiceRepository
    {
        /// <summary>Returns all invoices in the system, ordered by issue date descending.</summary>
        Task<IEnumerable<Invoice>> GetAllInvoicesAsync();

        /// <summary>Returns a single invoice by its primary key. Returns null if not found.</summary>
        Task<Invoice?> GetInvoiceByIdAsync(int invoiceId);

        /// <summary>Returns all invoices linked to a specific order.</summary>
        Task<IEnumerable<Invoice>> GetInvoicesByOrderIdAsync(int orderId);   // renamed

        /// <summary>Persists a new invoice. IssuedDate is set server-side; initial Status is "Draft".</summary>
        Task<Invoice> CreateInvoiceAsync(Invoice invoice);

        /// <summary>
        /// Updates the status of an existing invoice. Allowed values: Draft, Issued, Paid, Overdue.
        /// Throws ArgumentException for invalid statuses and KeyNotFoundException if the invoice doesn't exist.
        /// </summary>
        Task<Invoice> UpdateInvoiceStatusAsync(int invoiceId, string status);
    }
}