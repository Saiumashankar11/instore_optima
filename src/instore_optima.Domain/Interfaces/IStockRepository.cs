// IStockRepository — contract for managing the Stock table.
// Each Stock row stores the live CurrentStock level for one product.
// There is a one-to-one relationship between Products and Stocks.
// GetBelowMinStockAsync is used by the dashboard and alert system to flag low-stock products.
using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
	public interface IStockRepository
	{
		/// <summary>Returns all stock records (one per product).</summary>
		Task<IEnumerable<Stock>> GetAllAsync();

		/// <summary>Returns a stock record by its own primary key (StockId). Returns null if not found.</summary>
		Task<Stock?> GetByIdAsync(int stockId);

		/// <summary>Returns the stock record for a given product. Returns null if no stock record exists.</summary>
		Task<Stock?> GetByProductIdAsync(int productId);

		/// <summary>
		/// Returns all stock records where CurrentStock is below the product's MinStock threshold.
		/// Uses a join against the Products table because Stock has no navigation property to Product.
		/// </summary>
		Task<IEnumerable<Stock>> GetBelowMinStockAsync();

		/// <summary>Creates a new stock record. LastUpdated is set server-side.</summary>
		Task<Stock> CreateAsync(Stock stock);

		/// <summary>Updates the CurrentStock level for an existing record. Returns null if the record doesn't exist.</summary>
		Task<Stock?> UpdateAsync(int stockId, Stock stock);

		/// <summary>Deletes a stock record. Returns false if not found.</summary>
		Task<bool> DeleteAsync(int stockId);
	}
}
