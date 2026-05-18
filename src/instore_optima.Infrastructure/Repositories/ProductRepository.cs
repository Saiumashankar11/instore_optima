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

            bool hasStock = await _context.Stocks.AnyAsync(s => s.ProductId == productId);
            bool hasOrderItems = await _context.OrderItems.AnyAsync(oi => oi.ProductId == productId);
            bool hasStockMovements = await _context.StockMovements.AnyAsync(sm => sm.ProductId == productId);
            bool hasReplenishmentRules = await _context.Set<ReplenishmentRule>().AnyAsync(r => r.ProductId == productId);
            bool hasReplenishmentOrders = await _context.Set<ReplenishmentOrder>().AnyAsync(ro => ro.ProductId == productId);
            bool hasReplenishmentLogs = await _context.ReplenishmentLogs.AnyAsync(rl => rl.ProductId == productId);

            if (hasStock || hasOrderItems || hasStockMovements || hasReplenishmentRules || hasReplenishmentOrders || hasReplenishmentLogs)
                return false;

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}