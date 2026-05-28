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
            return await _context.Orders.AsNoTracking()
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .ToListAsync();
        }

        public async Task<Orders?> GetOrderByIdAsync(int orderId)
        {
            return await _context.Orders.AsNoTracking()
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);
        }

        public async Task<Orders> CreateOrderAsync(Orders order)
        {
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Pending";
            order.TotalAmount = 0; // Always starts at zero; updated as items are added
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

            // Reload with OrderItems and Products
            return await _context.Orders.AsNoTracking()
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .FirstAsync(o => o.OrderId == order.OrderId);
        }

        public async Task DeleteOrderAsync(int orderId)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                throw new KeyNotFoundException($"Order with ID {orderId} not found.");

            bool hasPayments = await _context.Payments.AnyAsync(p => p.OrderId == orderId);
            bool hasInvoices = await _context.Invoices.AnyAsync(i => i.OrderId == orderId);
            if (hasPayments || hasInvoices)
                throw new InvalidOperationException(
                    $"Order #{orderId} cannot be deleted because it has linked payments or invoices. Delete those first.");

            // Restore stock for each order item and record StockMovement IN
            var items = await _context.OrderItems.Where(oi => oi.OrderId == orderId).ToListAsync();
            foreach (var item in items)
            {
                var stock = await _context.Stocks.FirstOrDefaultAsync(s => s.ProductId == item.ProductId);
                if (stock == null)
                {
                    // Stock record was deleted separately — recreate it
                    stock = new Stock
                    {
                        ProductId    = item.ProductId,
                        CurrentStock = 0,
                        LastUpdated  = DateTime.UtcNow
                    };
                    _context.Stocks.Add(stock);
                    await _context.SaveChangesAsync();
                }
                stock.CurrentStock += item.Quantity;
                stock.LastUpdated = DateTime.UtcNow;

                _context.StockMovements.Add(new StockMovement
                {
                    ProductId    = item.ProductId,
                    Quantity     = item.Quantity,
                    MovementType = "IN",
                    PerformedBy  = order.UserId,
                    Reason       = $"Order #{orderId} deleted — stock restored",
                    PerformedAt  = DateTime.UtcNow
                });
            }

            _context.OrderItems.RemoveRange(items);
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
        }
    }
}