// StockMovementRepository — EF Core data access for the StockMovement entity via AppDbContext.
// StockMovement is the audit log of all stock quantity changes. CreateAsync is the main entry
// point: it records the event AND updates the live CurrentStock in the Stocks table atomically.
// RecordOnlyAsync is a lightweight alternative when another operation (e.g. OrderItemRepository)
// has already adjusted CurrentStock directly. Only the Reason field is editable after creation
// to preserve the integrity of the historical audit trail.
using instore_optima.Infrastructure.Data;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class StockMovementRepository : IStockMovementRepository
    {
        private readonly AppDbContext _context;

        public StockMovementRepository(AppDbContext context)
        {
            _context = context;
        }

        // No navigation properties on StockMovement entity
        // so all .Include() calls removed
        public async Task<IEnumerable<StockMovement>> GetAllAsync()
            => await _context.StockMovements
                .OrderByDescending(m => m.PerformedAt)  // most recent events first
                .ToListAsync();

        // Returns movement history for a specific product — useful for the product detail page
        public async Task<IEnumerable<StockMovement>> GetByProductIdAsync(int productId)
            => await _context.StockMovements
                .Where(m => m.ProductId == productId)
                .OrderByDescending(m => m.PerformedAt)
                .ToListAsync();

        public async Task<StockMovement?> GetByIdAsync(int movementId)
            => await _context.StockMovements
                .FirstOrDefaultAsync(m => m.MovementId == movementId);

        // ── CreateAsync — records event AND adjusts live stock ──
        public async Task<StockMovement> CreateAsync(StockMovement movement)
        {
            movement.PerformedAt = DateTime.UtcNow;

            // Adjust CurrentStock in Stocks table
            var stock = await _context.Stocks
                .FirstOrDefaultAsync(s => s.ProductId == movement.ProductId);

            if (stock == null)
            {
                // Auto-create stock record if it doesn't exist (e.g. after manual restore)
                stock = new Stock
                {
                    ProductId    = movement.ProductId,
                    CurrentStock = 0,
                    LastUpdated  = DateTime.UtcNow
                };
                _context.Stocks.Add(stock);
                await _context.SaveChangesAsync();
            }

            // Apply the stock change based on movement type:
            // IN/ADJUSTMENT add quantity; OUT/WRITE_OFF subtract (floored at 0 to avoid negatives)
            stock.CurrentStock = movement.MovementType.ToUpper() switch
            {
                "IN"         => stock.CurrentStock + movement.Quantity,
                "OUT"        => Math.Max(0, stock.CurrentStock - movement.Quantity),
                "WRITE_OFF"  => Math.Max(0, stock.CurrentStock - movement.Quantity),
                "ADJUSTMENT" => stock.CurrentStock + movement.Quantity,  // can be negative to correct overstatements
                _            => stock.CurrentStock  // unknown type — leave stock unchanged
            };
            stock.LastUpdated = DateTime.UtcNow;

            _context.StockMovements.Add(movement);
            await _context.SaveChangesAsync();
            return movement;
        }

        // ── RecordOnlyAsync — records the event WITHOUT touching CurrentStock ──
        // Use this when the stock adjustment has already been made by another operation
        public async Task<StockMovement> RecordOnlyAsync(StockMovement movement)
        {
            movement.PerformedAt = DateTime.UtcNow;
            _context.StockMovements.Add(movement);
            await _context.SaveChangesAsync();
            return movement;
        }

        // Only the Reason field is editable — quantity and type are immutable to preserve the audit trail
        public async Task<StockMovement?> UpdateAsync(int movementId, StockMovement updated)
        {
            var movement = await _context.StockMovements
                .FirstOrDefaultAsync(m => m.MovementId == movementId);
            if (movement == null) return null;

            movement.Reason = updated.Reason;

            await _context.SaveChangesAsync();
            return movement;
        }

        public async Task<bool> DeleteAsync(int movementId)
        {
            var movement = await _context.StockMovements.FindAsync(movementId);
            if (movement == null) return false;
            _context.StockMovements.Remove(movement);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}