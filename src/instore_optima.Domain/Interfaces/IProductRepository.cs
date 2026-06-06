// IProductRepository — contract for managing Product catalogue entries.
// Products have MinStock and MaxStock thresholds used by the replenishment system.
// Deletion is blocked when transaction records (order items, stock movements,
// replenishment orders, or logs) reference the product to preserve data integrity.
using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
	public interface IProductRepository
	{
		/// <summary>Returns all products in the catalogue.</summary>
		Task<IEnumerable<Products>> GetAllAsync();

		/// <summary>Returns a single product by its primary key. Returns null if not found.</summary>
		Task<Products?> GetByIdAsync(int productId);

		/// <summary>Adds a new product to the catalogue and returns it with its generated ID.</summary>
		Task<Products> CreateAsync(Products product);

		/// <summary>
		/// Updates the editable fields (Name, Description, Price, MinStock, MaxStock, SupplierId)
		/// of an existing product. Returns the updated product, or null if the product doesn't exist.
		/// </summary>
		Task<Products?> UpdateAsync(int productId, Products product);

		/// <summary>
		/// Deletes a product and its owned stock/replenishment rule records.
		/// Returns false (without throwing) if the product doesn't exist or has linked transaction data.
		/// </summary>
		Task<bool> DeleteAsync(int productId);
	}
}
