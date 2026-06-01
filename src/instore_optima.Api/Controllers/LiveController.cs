using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/live")]
    public class LiveController : ControllerBase
    {
        private readonly AppDbContext _db;

        public LiveController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Public endpoint — returns a live system snapshot for the landing page terminal.
        /// No authentication required.
        /// </summary>
        [HttpGet("snapshot")]
        public async Task<IActionResult> GetSnapshot()
        {
            var today = DateTime.Today;

            // Active (non-inactive) users
            var activeUsers = await _db.Users
                .CountAsync(u => u.Role != "Inactive");

            // Total products
            var totalProducts = await _db.Products.CountAsync();

            // Low stock items (current stock below product min stock)
            var lowStockItems = await _db.Stocks
                .Join(_db.Products,
                    s => s.ProductId,
                    p => p.ProductId,
                    (s, p) => new { s.CurrentStock, p.MinStock, p.Name })
                .Where(x => x.CurrentStock <= x.MinStock)
                .Select(x => new { x.Name, x.CurrentStock, x.MinStock })
                .Take(2)
                .ToListAsync();

            // Pending replenishment orders
            var pendingReplenishment = await _db.ReplenishmentOrders
                .CountAsync(r => r.Status == "Pending");

            // Today's orders
            var todayOrders = await _db.Orders
                .Where(o => o.OrderDate.Date == today)
                .Select(o => new { o.OrderId, o.Status, o.TotalAmount })
                .Take(2)
                .ToListAsync();

            var todayOrderCount = await _db.Orders
                .CountAsync(o => o.OrderDate.Date == today);

            var todayRevenue = await _db.Orders
                .Where(o => o.OrderDate.Date == today)
                .SumAsync(o => (decimal?)(o.TotalAmount ?? 0)) ?? 0;

            // Last replenishment order (approved)
            var lastApproved = await _db.ReplenishmentOrders
                .Where(r => r.Status == "Approved")
                .OrderByDescending(r => r.ApprovedAt)
                .Join(_db.Products,
                    r => r.ProductId,
                    p => p.ProductId,
                    (r, p) => new { r.ReplenishmentOrderId, p.Name, r.ApprovedAt })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                activeUsers,
                totalProducts,
                lowStockItems = lowStockItems.Select(x => new
                {
                    x.Name,
                    x.CurrentStock,
                    x.MinStock
                }),
                pendingReplenishment,
                todayOrderCount,
                todayRevenue,
                todayOrders = todayOrders.Select(o => new
                {
                    o.OrderId,
                    o.Status,
                    Amount = o.TotalAmount ?? 0
                }),
                lastApproved = lastApproved == null ? null : new
                {
                    id = $"REP-{lastApproved.ReplenishmentOrderId}",
                    lastApproved.Name,
                    approvedAt = lastApproved.ApprovedAt
                },
                timestamp = DateTime.Now.ToString("HH:mm:ss")
            });
        }
    }
}
