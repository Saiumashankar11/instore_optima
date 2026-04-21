using instore_optima.Domain.Entities;

namespace instore_optima.Api.Repositories.Interfaces
{
    public interface IOrderRepository
    {
        Task<IEnumerable<Orders>> GetAllOrdersAsync();
        Task<Orders?> GetOrderByIdAsync(int orderId);
        Task<Orders> CreateOrderAsync(Orders order);
        Task<Orders> UpdateOrderAsync(Orders order);
        Task DeleteOrderAsync(int orderId);
    }
}