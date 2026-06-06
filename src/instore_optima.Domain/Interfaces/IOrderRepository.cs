// IOrderRepository — contract for managing customer Orders.
// Orders always start with Status = "Pending" and TotalAmount = 0;
// the total is recalculated automatically as items are added/removed.
// Deletion is blocked when linked payments or invoices exist.
using instore_optima.Domain.Entities;

namespace instore_optima.Api.Repositories.Interfaces
{
    public interface IOrderRepository
    {
        /// <summary>Returns all orders with their line items and associated products loaded.</summary>
        Task<IEnumerable<Orders>> GetAllOrdersAsync();

        /// <summary>Returns a single order by its primary key, with items and products. Returns null if not found.</summary>
        Task<Orders?> GetOrderByIdAsync(int orderId);

        /// <summary>Creates a new order (Status = "Pending", TotalAmount = 0) and returns it with its generated ID.</summary>
        Task<Orders> CreateOrderAsync(Orders order);

        /// <summary>Updates an order's status and total, then returns the order reloaded with all navigation data.</summary>
        Task<Orders> UpdateOrderAsync(Orders order);

        /// <summary>
        /// Deletes an order. Restores stock for every line item and records StockMovement IN entries.
        /// Throws InvalidOperationException if the order has linked payments or invoices.
        /// </summary>
        Task DeleteOrderAsync(int orderId);
    }
}