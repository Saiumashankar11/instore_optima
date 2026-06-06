// StockRepository — EF Core data access for the Stock entity via AppDbContext.
// Each Stock row holds the live CurrentStock level for exactly one product (1-to-1 relationship).
// GetBelowMinStockAsync uses a manual LINQ Join because the Stock entity has no Product
// navigation property configured in EF, so EF cannot do an implicit Include join.
// LastUpdated is always set server-side so the dashboard "last synced" timestamp is reliable.
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

        // Returns all stock records (one per product)
        public async Task<IEnumerable<Stock>> GetAllAsync()
            => await _context.Stocks
                .ToListAsync();

        // Looks up by StockId (the stock table's own PK, not the product ID)
        public async Task<Stock?> GetByIdAsync(int stockId)
            => await _context.Stocks
                .FirstOrDefaultAsync(s => s.StockId == stockId);

        // More commonly used than GetByIdAsync — looks up stock by the product it belongs to
        public async Task<Stock?> GetByProductIdAsync(int productId)
            => await _context.Stocks
                .FirstOrDefaultAsync(s => s.ProductId == productId);

        // Join against Products to compare CurrentStock vs MinStock
        // since Stock entity has no Product navigation property
        public async Task<IEnumerable<Stock>> GetBelowMinStockAsync()
            => await _context.Stocks
                .Join(
                    _context.Products,           // join the Products table
                    stock => stock.ProductId,    // Stock.ProductId = Products.ProductId
                    product => product.ProductId,
                    (stock, product) => new { stock, product }  // anonymous pair for the Where clause
                )
                .Where(x => x.stock.CurrentStock < x.product.MinStock)  // below threshold
                .Select(x => x.stock)   // return only the Stock row (not the product details)
                .ToListAsync();

        public async Task<Stock> CreateAsync(Stock stock)
        {
            stock.LastUpdated = DateTime.UtcNow;  // always set server-side
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
            stock.LastUpdated = DateTime.UtcNow;  // always refresh the timestamp on any stock change

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