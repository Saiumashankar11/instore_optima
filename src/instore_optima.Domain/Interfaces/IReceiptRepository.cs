using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IReceiptRepository
    {
        Task<IEnumerable<Receipt>> GetAllReceiptsAsync();
        Task<Receipt?> GetReceiptByIdAsync(int receiptId);
        Task<Receipt> CreateReceiptAsync(Receipt receipt);
        Task<Receipt> UpdateReceiptAsync(Receipt receipt);
    }
}