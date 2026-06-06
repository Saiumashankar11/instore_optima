// ISupplierRepository — contract for managing Supplier records.
// Suppliers are linked to Products, PurchaseOrders, and ReplenishmentLogs.
// Deletion is blocked if any of those related records exist, preventing orphaned data.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface ISupplierRepository
    {
        /// <summary>Returns all supplier records in the system.</summary>
        Task<IEnumerable<Supplier>> GetAllSuppliersAsync();

        /// <summary>Returns a single supplier by its primary key. Returns null if not found.</summary>
        Task<Supplier?> GetSupplierByIdAsync(int supplierId);

        /// <summary>Adds a new supplier and returns it with its generated ID.</summary>
        Task<Supplier> CreateSupplierAsync(Supplier supplier);

        /// <summary>Updates an existing supplier record (uses EF Update — all fields are overwritten).</summary>
        Task<Supplier> UpdateSupplierAsync(Supplier supplier);

        /// <summary>
        /// Deletes a supplier. Returns false (without throwing) if the supplier doesn't exist or has
        /// linked products, purchase orders, or replenishment logs.
        /// </summary>
        Task<bool> DeleteSupplierAsync(int supplierId);
    }
}

