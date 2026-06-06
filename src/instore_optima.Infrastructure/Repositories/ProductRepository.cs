// ProductRepository — EF Core data access for the Products entity via AppDbContext.
// Manages the product catalogue. Update explicitly maps only the editable fields
// to prevent accidental overwrites of auto-managed fields (e.g. relationships).
// Delete is soft-blocked: returns false when transaction data references the product,
// then cascades to owned child records (Stocks, ReplenishmentRules) before removing the product row.
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

        // Returns all products in the catalogue
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

            // Explicitly map only the fields that are safe to update
            // (avoids overwriting auto-managed or relationship fields)
            product.Name = updated.Name;
            product.Description = updated.Description;
            product.Price = updated.Price;
            product.MinStock = updated.MinStock;  // replenishment trigger threshold
            product.MaxStock = updated.MaxStock;  // target stock level for replenishment orders
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
            // (keeps historical order, movement, and replenishment data intact)
            bool hasOrderItems      = await _context.OrderItems.AnyAsync(oi => oi.ProductId == productId);
            bool hasStockMovements  = await _context.StockMovements.AnyAsync(sm => sm.ProductId == productId);
            bool hasReplenishOrders = await _context.Set<ReplenishmentOrder>().AnyAsync(ro => ro.ProductId == productId);
            bool hasReplenishLogs   = await _context.ReplenishmentLogs.AnyAsync(rl => rl.ProductId == productId);

            if (hasOrderItems || hasStockMovements || hasReplenishOrders || hasReplenishLogs)
                return false;  // silently block deletion — caller can check return value

            // Cascade-delete product-owned records (auto-created, no standalone meaning)
            // EF doesn't auto-cascade these, so we delete them explicitly before removing the product
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