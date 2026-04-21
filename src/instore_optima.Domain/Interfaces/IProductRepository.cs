using instore_optima.Domain.Entities;

namespace instore_optima.Infrastructure.Interfaces
{
	public interface IProductRepository
	{
		Task<IEnumerable<Products>> GetAllAsync();
		Task<Products?> GetByIdAsync(int productId);
		Task<Products> CreateAsync(Products product);
		Task<Products?> UpdateAsync(int productId, Products product);
		Task<bool> DeleteAsync(int productId);
	}
}
