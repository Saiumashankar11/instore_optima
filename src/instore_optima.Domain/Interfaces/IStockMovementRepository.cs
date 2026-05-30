using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
    public interface IStockMovementRepository
    {
        Task<IEnumerable<StockMovement>> GetAllAsync();
        Task<IEnumerable<StockMovement>> GetByProductIdAsync(int productId);
        Task<StockMovement?> GetByIdAsync(int movementId);
        Task<StockMovement> CreateAsync(StockMovement movement);
        Task<StockMovement> RecordOnlyAsync(StockMovement movement);
        Task<StockMovement?> UpdateAsync(int movementId, StockMovement movement);  // ← add this line
        Task<bool> DeleteAsync(int movementId);
    }
}