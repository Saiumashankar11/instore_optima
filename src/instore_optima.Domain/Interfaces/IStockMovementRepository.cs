// IStockMovementRepository — contract for recording and querying stock movement history.
// Each StockMovement entry captures a quantity change event (IN / OUT / WRITE_OFF / ADJUSTMENT)
// for a product. CreateAsync both records the event AND adjusts the live CurrentStock in the
// Stocks table. RecordOnlyAsync records the event without touching CurrentStock (used when
// another operation has already adjusted stock directly).
using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
    public interface IStockMovementRepository
    {
        /// <summary>Returns all stock movement entries ordered by most recent first.</summary>
        Task<IEnumerable<StockMovement>> GetAllAsync();

        /// <summary>Returns all movement entries for a specific product, ordered most recent first.</summary>
        Task<IEnumerable<StockMovement>> GetByProductIdAsync(int productId);

        /// <summary>Returns a single movement record by its primary key. Returns null if not found.</summary>
        Task<StockMovement?> GetByIdAsync(int movementId);

        /// <summary>
        /// Records a stock movement AND updates the product's CurrentStock in the Stocks table.
        /// Movement types and their effect: IN adds, OUT subtracts (floor 0), WRITE_OFF subtracts (floor 0),
        /// ADJUSTMENT adds (can be negative to correct overstated stock).
        /// </summary>
        Task<StockMovement> CreateAsync(StockMovement movement);

        /// <summary>
        /// Records a stock movement entry without touching CurrentStock.
        /// Use this when the stock adjustment has already been made elsewhere (e.g. in OrderItemRepository).
        /// </summary>
        Task<StockMovement> RecordOnlyAsync(StockMovement movement);

        /// <summary>Updates the Reason field of an existing movement. Only the Reason is editable to preserve the audit trail.</summary>
        Task<StockMovement?> UpdateAsync(int movementId, StockMovement movement);  // ← add this line

        /// <summary>Deletes a movement record. Returns false if not found.</summary>
        Task<bool> DeleteAsync(int movementId);
    }
}