// IOrderItemRepository — contract for managing individual line items within an order.
// Creating, updating, or deleting an item also adjusts stock levels and recalculates
// the parent order's total. Product details are eager-loaded via Include so callers
// get a fully populated item without a second query.
using instore_optima.Domain.Entities;

namespace instore_optima.Api.Repositories.Interfaces
{
    public interface IOrderItemRepository
    {
        /// <summary>Returns all order items across all orders, each with its associated product loaded.</summary>
        Task<IEnumerable<Order_Items>> GetAllOrderItemsAsync();

        /// <summary>Returns all items belonging to a specific order, with product details included.</summary>
        Task<IEnumerable<Order_Items>> GetItemsByOrderIdAsync(int orderId);

        /// <summary>Returns a single order item by its primary key, with product details. Returns null if not found.</summary>
        Task<Order_Items?> GetOrderItemByIdAsync(int orderItemId);

        /// <summary>
        /// Adds an item to an order. Validates stock availability, sets the price from the product,
        /// decrements CurrentStock, auto-records a StockMovement OUT, recalculates the order total,
        /// and triggers auto-replenishment if stock falls to or below the reorder point.
        /// </summary>
        Task<Order_Items> CreateOrderItemAsync(Order_Items item);

        /// <summary>
        /// Updates an existing order item's quantity. Adjusts stock by the delta,
        /// updates or creates the matching StockMovement record, and recalculates the order total.
        /// </summary>
        Task<Order_Items> UpdateOrderItemAsync(Order_Items item);

        /// <summary>
        /// Removes an item from an order, restores stock (creating the stock record if missing),
        /// records a StockMovement IN, and recalculates the order total.
        /// </summary>
        Task DeleteOrderItemAsync(int orderItemId);
    }
}