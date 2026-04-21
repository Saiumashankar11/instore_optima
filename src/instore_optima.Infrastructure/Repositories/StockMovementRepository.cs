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
                .OrderByDescending(m => m.PerformedAt)
                .ToListAsync();

        public async Task<IEnumerable<StockMovement>> GetByProductIdAsync(int productId)
            => await _context.StockMovements
                .Where(m => m.ProductId == productId)
                .OrderByDescending(m => m.PerformedAt)
                .ToListAsync();

        public async Task<StockMovement?> GetByIdAsync(int movementId)
            => await _context.StockMovements
                .FirstOrDefaultAsync(m => m.MovementId == movementId);

        public async Task<StockMovement> CreateAsync(StockMovement movement)
        {
            movement.PerformedAt = DateTime.UtcNow;

            // Adjust CurrentStock in Stocks table
            var stock = await _context.Stocks
                .FirstOrDefaultAsync(s => s.ProductId == movement.ProductId);

            if (stock != null)
            {
                stock.CurrentStock = movement.MovementType.ToUpper() switch
                {
                    "IN" => stock.CurrentStock + movement.Quantity,
                    "OUT" => stock.CurrentStock - movement.Quantity,
                    "ADJUSTMENT" => movement.Quantity,
                    _ => stock.CurrentStock
                };
                stock.LastUpdated = DateTime.UtcNow;
            }

            _context.StockMovements.Add(movement);
            await _context.SaveChangesAsync();
            return movement;
        }

        public async Task<StockMovement?> UpdateAsync(int movementId, StockMovement updated)
        {
            var movement = await _context.StockMovements
                .FirstOrDefaultAsync(m => m.MovementId == movementId);
            if (movement == null) return null;

            movement.Reason = updated.Reason;

            await _context.SaveChangesAsync();
            return movement;
        }
    }
}