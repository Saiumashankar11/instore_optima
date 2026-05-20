using instore_optima.Infrastructure.Data;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly AppDbContext _context;

        public ProductRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Products>> GetAllAsync()
            => await _context.Products
                .ToListAsync();

        public async Task<Products?> GetByIdAsync(int productId)
            => await _context.Products
                .FirstOrDefaultAsync(p => p.ProductId == productId);

        public async Task<Products> CreateAsync(Products product)
        {
            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            return product;
        }

        public async Task<Products?> UpdateAsync(int productId, Products updated)
        {
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.ProductId == productId);
            if (product == null) return null;

            product.Name = updated.Name;
            product.Description = updated.Description;
            product.Price = updated.Price;
            product.MinStock = updated.MinStock;
            product.MaxStock = updated.MaxStock;
            product.SupplierId = updated.SupplierId;

            await _context.SaveChangesAsync();
            return product;
        }

        public async Task<bool> DeleteAsync(int productId)
        {
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.ProductId == productId);
            if (product == null) return false;

            // Block deletion if real transaction records exist
            bool hasOrderItems      = await _context.OrderItems.AnyAsync(oi => oi.ProductId == productId);
            bool hasStockMovements  = await _context.StockMovements.AnyAsync(sm => sm.ProductId == productId);
            bool hasReplenishOrders = await _context.Set<ReplenishmentOrder>().AnyAsync(ro => ro.ProductId == productId);
            bool hasReplenishLogs   = await _context.ReplenishmentLogs.AnyAsync(rl => rl.ProductId == productId);

            if (hasOrderItems || hasStockMovements || hasReplenishOrders || hasReplenishLogs)
                return false;

            // Cascade-delete product-owned records (auto-created, no standalone meaning)
            var stocks = await _context.Stocks.Where(s => s.ProductId == productId).ToListAsync();
            _context.Stocks.RemoveRange(stocks);

            var rules = await _context.Set<ReplenishmentRule>().Where(r => r.ProductId == productId).ToListAsync();
            _context.Set<ReplenishmentRule>().RemoveRange(rules);

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}