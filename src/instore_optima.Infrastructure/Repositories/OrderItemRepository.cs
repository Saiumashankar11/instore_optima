// OrderItemRepository — EF Core data access for the Order_Items entity.
// This is the most logic-heavy repository: adding, updating, or removing an item
// cascades into stock adjustments, stock movement audit records, order total recalculation,
// and auto-replenishment checks — all within the same database round-trip.
// Read queries eager-load the Product navigation property so the caller always gets
// a fully populated item without needing a separate product query.
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

        // ── Read methods — AsNoTracking for performance (no updates needed) ──

        public async Task<IEnumerable<Order_Items>> GetAllOrderItemsAsync()
        {
            return await _context.OrderItems.AsNoTracking()
                .Include(oi => oi.Product)  // load product details in one SQL join
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

        // ── Create — validates stock, sets price, adjusts stock, recalculates total ──

        public async Task<Order_Items> CreateOrderItemAsync(Order_Items item)
        {
            // 1. Fetch product to get the price
            var product = await _context.Products.FirstOrDefaultAsync(p => p.ProductId == item.ProductId)
                ?? throw new KeyNotFoundException($"Product with ID {item.ProductId} not found.");

            // 2. Check sufficient stock
            var stock = await _context.Stocks.FirstOrDefaultAsync(s => s.ProductId == item.ProductId)
                ?? throw new InvalidOperationException($"No stock record found for product {item.ProductId}.");

            if (stock.CurrentStock < item.Quantity)
                throw new InvalidOperationException(
                    $"Insufficient stock for '{product.Name}'. Available: {stock.CurrentStock}, Requested: {item.Quantity}.");

            // 3. Set price from product
            item.Price = product.Price;

            // 4. Save order item
            _context.OrderItems.Add(item);

            // 5. Decrement stock
            stock.CurrentStock -= item.Quantity;
            stock.LastUpdated = DateTime.UtcNow;

            // 6. Save and recalculate order total
            await _context.SaveChangesAsync();
            var allItems = await _context.OrderItems.Where(oi => oi.OrderId == item.OrderId).ToListAsync();
            var order = await _context.Orders.FindAsync(item.OrderId);
            if (order != null)
            {
                order.TotalAmount = allItems.Sum(oi => oi.Price * oi.Quantity);
                await _context.SaveChangesAsync();
            }

            // 7. Auto-record StockMovement OUT (audit trail)
            _context.StockMovements.Add(new StockMovement
            {
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                MovementType = "OUT",
                PerformedBy = order?.UserId ?? 1,
                Reason = $"Order #{item.OrderId} — item sold",
                PerformedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // 8. Trigger auto-replenishment if stock dropped below reorder point
            await TriggerReplenishmentIfNeededAsync(item.ProductId, stock.CurrentStock);

            // 9. Return with product navigation loaded
            item.Product = product;
            return item;
        }

        // ── Update — adjusts stock by the quantity delta, keeps movement record in sync ──

        public async Task<Order_Items> UpdateOrderItemAsync(Order_Items item)
        {
            var existing = await _context.OrderItems
                .Include(oi => oi.Product)
                .FirstOrDefaultAsync(oi => oi.OrderItemId == item.OrderItemId);
            if (existing == null)
                throw new KeyNotFoundException($"OrderItem with ID {item.OrderItemId} not found.");

            // quantityDelta = how many extra units are being requested (negative = fewer units)
            int quantityDelta = item.Quantity - existing.Quantity;
            var order = await _context.Orders.FindAsync(existing.OrderId);

            if (quantityDelta != 0)
            {
                // Adjust stock level
                var stock = await _context.Stocks.FirstOrDefaultAsync(s => s.ProductId == existing.ProductId);
                if (stock != null)
                {
                    if (quantityDelta > 0 && stock.CurrentStock < quantityDelta)
                        throw new InvalidOperationException(
                            $"Insufficient stock. Available: {stock.CurrentStock}, Additional requested: {quantityDelta}.");
                    stock.CurrentStock -= quantityDelta;  // positive delta reduces stock; negative delta restores it
                    stock.LastUpdated = DateTime.UtcNow;
                }

                // Update the original StockMovement row for this order+product
                // so it shows the new cumulative quantity (e.g. OUT 10 → OUT 20)
                var existingMovement = await _context.StockMovements
                    .Where(m => m.ProductId == existing.ProductId &&
                                m.Reason.Contains($"Order #{existing.OrderId}"))
                    .OrderByDescending(m => m.PerformedAt)
                    .FirstOrDefaultAsync();

                if (existingMovement != null)
                {
                    existingMovement.Quantity     = item.Quantity;  // new total
                    existingMovement.MovementType = "OUT";
                    existingMovement.Reason       = $"Order #{existing.OrderId} — item sold (updated to qty {item.Quantity})";
                    existingMovement.PerformedAt  = DateTime.UtcNow;
                }
                else
                {
                    // No prior movement found — create one
                    _context.StockMovements.Add(new StockMovement
                    {
                        ProductId    = existing.ProductId,
                        Quantity     = item.Quantity,
                        MovementType = "OUT",
                        PerformedBy  = order?.UserId ?? 1,
                        Reason       = $"Order #{existing.OrderId} — item sold (qty {item.Quantity})",
                        PerformedAt  = DateTime.UtcNow
                    });
                }

                if (stock != null)
                    await TriggerReplenishmentIfNeededAsync(existing.ProductId, stock.CurrentStock);
            }

            existing.Quantity = item.Quantity;

            await _context.SaveChangesAsync();

            // Recalculate order total after the quantity change
            var allItems = await _context.OrderItems.Where(oi => oi.OrderId == existing.OrderId).ToListAsync();
            if (order != null)
            {
                order.TotalAmount = allItems.Sum(oi => oi.Price * oi.Quantity);
                await _context.SaveChangesAsync();
            }

            return existing;
        }

        // ── Delete — restores stock, records movement IN, recalculates order total ──

        public async Task DeleteOrderItemAsync(int orderItemId)
        {
            var item = await _context.OrderItems.FindAsync(orderItemId);
            if (item == null)
                throw new KeyNotFoundException($"OrderItem with ID {orderItemId} not found.");

            int orderId = item.OrderId;
            int productId = item.ProductId;
            int qty = item.Quantity;

            // Restore stock
            var stock = await _context.Stocks.FirstOrDefaultAsync(s => s.ProductId == productId);
            if (stock == null)
            {
                // Stock record was deleted separately — recreate it
                stock = new Stock
                {
                    ProductId    = productId,
                    CurrentStock = 0,
                    LastUpdated  = DateTime.UtcNow
                };
                _context.Stocks.Add(stock);
                await _context.SaveChangesAsync();
            }
            stock.CurrentStock += qty;  // put the quantity back into stock
            stock.LastUpdated = DateTime.UtcNow;

            var order = await _context.Orders.FindAsync(orderId);

            _context.OrderItems.Remove(item);
            await _context.SaveChangesAsync();

            // Auto-record StockMovement IN (stock restored)
            _context.StockMovements.Add(new StockMovement
            {
                ProductId = productId,
                Quantity = qty,
                MovementType = "IN",
                PerformedBy = order?.UserId ?? 1,
                Reason = $"Order #{orderId} — item removed, stock restored",
                PerformedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Recalculate order total after removing the item
            var allItems = await _context.OrderItems.Where(oi => oi.OrderId == orderId).ToListAsync();
            if (order != null)
            {
                order.TotalAmount = allItems.Sum(oi => oi.Price * oi.Quantity);
                await _context.SaveChangesAsync();
            }
        }

        // ── Auto-replenishment trigger ────────────────────────────────
        // Called after any stock decrease to check whether a replenishment order should be raised.
        private async Task TriggerReplenishmentIfNeededAsync(int productId, int currentStock)
        {
            // Check if there's already a pending replenishment order for this product
            bool alreadyPending = await _context.ReplenishmentOrders
                .AnyAsync(o => o.ProductId == productId && o.Status == "Pending");
            if (alreadyPending) return;  // don't create a duplicate order

            // Try rule-based replenishment first
            var rule = await _context.ReplenishmentRules
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.Status == "Active");

            if (rule != null)
            {
                if (currentStock > rule.ReorderPoint) return;  // stock still above threshold — do nothing

                // Stock has hit or dropped below the reorder point: request enough to reach MaxLevel
                _context.ReplenishmentOrders.Add(new ReplenishmentOrder
                {
                    ProductId = productId,
                    QuantityRequested = rule.MaxLevel - currentStock,
                    GeneratedAt = DateTime.UtcNow,
                    Status = "Pending"
                });
                await _context.SaveChangesAsync();
                return;
            }

            // Fallback: use product MinStock as reorder point (midpoint trigger)
            // (used when no explicit replenishment rule exists for this product)
            var product = await _context.Products.FirstOrDefaultAsync(p => p.ProductId == productId);
            if (product == null || product.MinStock <= 0) return;

            int reorderPoint = product.MinStock; // trigger at or below MinStock
            if (currentStock > reorderPoint) return;

            int quantityToOrder = product.MaxStock - currentStock;
            if (quantityToOrder <= 0) quantityToOrder = product.MinStock * 2;  // safety fallback

            _context.ReplenishmentOrders.Add(new ReplenishmentOrder
            {
                ProductId = productId,
                QuantityRequested = quantityToOrder,
                GeneratedAt = DateTime.UtcNow,
                Status = "Pending"
            });
            await _context.SaveChangesAsync();
        }
    }
}
