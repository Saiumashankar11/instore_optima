using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
	public interface IStockRepository
	{
		Task<IEnumerable<Stock>> GetAllAsync();
		Task<Stock?> GetByIdAsync(int stockId);
		Task<Stock?> GetByProductIdAsync(int productId);
		Task<IEnumerable<Stock>> GetBelowMinStockAsync();
		Task<Stock> CreateAsync(Stock stock);
		Task<Stock?> UpdateAsync(int stockId, Stock stock);
		Task<bool> DeleteAsync(int stockId);
	}
}
