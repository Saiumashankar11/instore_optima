using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IInvoiceRepository
    {
        Task<IEnumerable<Invoice>> GetAllInvoicesAsync();
        Task<Invoice?> GetInvoiceByIdAsync(int invoiceId);
        Task<IEnumerable<Invoice>> GetInvoicesByOrderIdAsync(int orderId);   // renamed
        Task<Invoice> CreateInvoiceAsync(Invoice invoice);
        Task<Invoice> UpdateInvoiceStatusAsync(int invoiceId, string status);
    }
}