using instore_optima.Domain.Entities;

namespace instore_optima.Api.Repositories.Interfaces
{
    public interface IOrderItemRepository
    {
        Task<IEnumerable<Order_Items>> GetAllOrderItemsAsync();
        Task<IEnumerable<Order_Items>> GetItemsByOrderIdAsync(int orderId);
        Task<Order_Items?> GetOrderItemByIdAsync(int orderItemId);
        Task<Order_Items> CreateOrderItemAsync(Order_Items item);
        Task<Order_Items> UpdateOrderItemAsync(Order_Items item);
        Task DeleteOrderItemAsync(int orderItemId);
    }
}