using instore_optima.Infrastructure.Data;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class StockRepository : IStockRepository
    {
        private readonly AppDbContext _context;

        public StockRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Stock>> GetAllAsync()
            => await _context.Stocks
                .ToListAsync();

        public async Task<Stock?> GetByIdAsync(int stockId)
            => await _context.Stocks
                .FirstOrDefaultAsync(s => s.StockId == stockId);

        public async Task<Stock?> GetByProductIdAsync(int productId)
            => await _context.Stocks
                .FirstOrDefaultAsync(s => s.ProductId == productId);

        // Join against Products to compare CurrentStock vs MinStock
        // since Stock entity has no Product navigation property
        public async Task<IEnumerable<Stock>> GetBelowMinStockAsync()
            => await _context.Stocks
                .Join(
                    _context.Products,
                    stock => stock.ProductId,
                    product => product.ProductId,
                    (stock, product) => new { stock, product }
                )
                .Where(x => x.stock.CurrentStock < x.product.MinStock)
                .Select(x => x.stock)
                .ToListAsync();

        public async Task<Stock> CreateAsync(Stock stock)
        {
            stock.LastUpdated = DateTime.UtcNow;
            _context.Stocks.Add(stock);
            await _context.SaveChangesAsync();
            return stock;
        }

        public async Task<Stock?> UpdateAsync(int stockId, Stock updated)
        {
            var stock = await _context.Stocks
                .FirstOrDefaultAsync(s => s.StockId == stockId);
            if (stock == null) return null;

            stock.CurrentStock = updated.CurrentStock;
            stock.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return stock;
        }

        public async Task<bool> DeleteAsync(int stockId)
        {
            var stock = await _context.Stocks
                .FirstOrDefaultAsync(s => s.StockId == stockId);
            if (stock == null) return false;

            _context.Stocks.Remove(stock);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}