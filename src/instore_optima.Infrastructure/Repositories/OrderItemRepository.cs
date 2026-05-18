using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Repositories.Implementations
{
    public class OrderItemRepository : IOrderItemRepository
    {
        private readonly AppDbContext _context;

        public OrderItemRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Order_Items>> GetAllOrderItemsAsync()
        {
            return await _context.OrderItems.AsNoTracking()
                .Include(oi => oi.Product)
                .ToListAsync();
        }

        public async Task<IEnumerable<Order_Items>> GetItemsByOrderIdAsync(int orderId)
        {
            return await _context.OrderItems.AsNoTracking()
                .Include(oi => oi.Product)
                .Where(oi => oi.OrderId == orderId).ToListAsync();
        }

        public async Task<Order_Items?> GetOrderItemByIdAsync(int orderItemId)
        {
            return await _context.OrderItems.AsNoTracking()
                .Include(oi => oi.Product)
                .FirstOrDefaultAsync(oi => oi.OrderItemId == orderItemId);
        }

        public async Task<Order_Items> CreateOrderItemAsync(Order_Items item)
        {
            _context.OrderItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<Order_Items> UpdateOrderItemAsync(Order_Items item)
        {
            var existing = await _context.OrderItems.FindAsync(item.OrderItemId);
            if (existing == null)
                throw new KeyNotFoundException($"OrderItem with ID {item.OrderItemId} not found.");
            existing.Quantity = item.Quantity;
            existing.Price = item.Price;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task DeleteOrderItemAsync(int orderItemId)
        {
            var item = await _context.OrderItems.FindAsync(orderItemId);
            if (item == null)
                throw new KeyNotFoundException($"OrderItem with ID {orderItemId} not found.");
            _context.OrderItems.Remove(item);
            await _context.SaveChangesAsync();
        }
    }
}
