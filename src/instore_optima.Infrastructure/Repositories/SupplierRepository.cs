// SupplierRepository — EF Core data access for the Supplier entity via AppDbContext.
// Suppliers are linked to Products (they supply them), PurchaseOrders (raised against them),
// and ReplenishmentLogs. Deletion is silently blocked when any of those references exist
// so the system never ends up with orphaned foreign-key records.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class SupplierRepository : ISupplierRepository
    {
        private readonly AppDbContext _context;

        public SupplierRepository(AppDbContext context)
        {
            _context = context;
        }

        // Returns all supplier records in the system
        public async Task<IEnumerable<Supplier>> GetAllSuppliersAsync()
        {
            return await _context.Suppliers.ToListAsync();
        }

        public async Task<Supplier?> GetSupplierByIdAsync(int supplierId)
        {
            return await _context.Suppliers
                .FirstOrDefaultAsync(s => s.SupplierId == supplierId);
        }

        public async Task<Supplier> CreateSupplierAsync(Supplier supplier)
        {
            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();
            return supplier;
        }

        public async Task<Supplier> UpdateSupplierAsync(Supplier supplier)
        {
            // EF Update marks every column as modified — caller is responsible for providing all fields
            _context.Suppliers.Update(supplier);
            await _context.SaveChangesAsync();
            return supplier;
        }

        public async Task<bool> DeleteSupplierAsync(int supplierId)
        {
            var supplier = await _context.Suppliers
                .FirstOrDefaultAsync(s => s.SupplierId == supplierId);
            if (supplier == null) return false;

            // Block deletion if any related records still reference this supplier
            // to prevent orphaned foreign-key data
            bool hasProducts = await _context.Products.AnyAsync(p => p.SupplierId == supplierId);
            bool hasPurchaseOrders = await _context.PurchaseOrders.AnyAsync(po => po.SupplierId == supplierId);
            bool hasReplenishmentLogs = await _context.ReplenishmentLogs.AnyAsync(rl => rl.SupplierId == supplierId);

            if (hasProducts || hasPurchaseOrders || hasReplenishmentLogs)
                return false;  // silently blocked — caller should inform the user to reassign first

            _context.Suppliers.Remove(supplier);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

