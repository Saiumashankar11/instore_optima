using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Repositories.Implementations
{
    public class OrderRepository : IOrderRepository
    {
        private readonly AppDbContext _context;

        public OrderRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Orders>> GetAllOrdersAsync()
        {
            return await _context.Orders.AsNoTracking().ToListAsync();
        }

        public async Task<Orders?> GetOrderByIdAsync(int orderId)
        {
            return await _context.Orders.AsNoTracking()
                .FirstOrDefaultAsync(o => o.OrderId == orderId);
        }

        public async Task<Orders> CreateOrderAsync(Orders order)
        {
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Pending";
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<Orders> UpdateOrderAsync(Orders order)
        {
            var existing = await _context.Orders.FindAsync(order.OrderId);
            if (existing == null)
                throw new KeyNotFoundException($"Order with ID {order.OrderId} not found.");
            existing.Status = order.Status;
            existing.TotalAmount = order.TotalAmount;
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task DeleteOrderAsync(int orderId)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                throw new KeyNotFoundException($"Order with ID {orderId} not found.");
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
        }
    }
}