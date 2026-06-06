// ── LiveController.cs ─────────────────────────────────────────────────────────
// Handles the HTTP endpoint under the route  api/live.
//
// This controller powers the public-facing "live terminal" widget on the landing
// page.  It returns a lightweight snapshot of real-time store metrics without
// requiring the visitor to log in.
//
// Authentication: no [Authorize] attribute — this endpoint is intentionally public.
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/live")]
    public class LiveController : ControllerBase
    {
        // ── Injected DbContext ────────────────────────────────────────────────
        // AppDbContext is the EF Core database context; all DB queries go through it.
        private readonly AppDbContext _db;

        // Constructor — the DbContext is provided by ASP.NET Core's DI container.
        public LiveController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Public endpoint — returns a live system snapshot for the landing page terminal.
        /// No authentication required.
        /// </summary>
        // ── GET api/live/snapshot ─────────────────────────────────────────────
        /// <summary>
        /// GET api/live/snapshot
        /// Gathers several quick counts and recent records from the database and
        /// returns them as a single anonymous JSON object for the landing-page widget.
        /// Auth: none (publicly accessible — no JWT needed).
        /// Returns: 200 OK with the snapshot object.
        /// </summary>
        [HttpGet("snapshot")]
        public async Task<IActionResult> GetSnapshot()
        {
            var today = DateTime.Today; // Used to filter "today's" orders.

            // Active (non-inactive) users
            // "Inactive" is the soft-deleted role; all other roles count as active.
            var activeUsers = await _db.Users
                .CountAsync(u => u.Role != "Inactive");

            // Total products
            var totalProducts = await _db.Products.CountAsync();

            // Low stock items (current stock below product min stock)
            // We JOIN Stocks to Products to compare CurrentStock against each product's MinStock.
            // Only the top 2 are returned to keep the snapshot payload small.
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
            // Grab the first 2 orders placed today for the preview list.
            var todayOrders = await _db.Orders
                .Where(o => o.OrderDate.Date == today)
                .Select(o => new { o.OrderId, o.Status, o.TotalAmount })
                .Take(2)
                .ToListAsync();

            // Full count and total revenue for today's orders.
            var todayOrderCount = await _db.Orders
                .CountAsync(o => o.OrderDate.Date == today);

            // Sum today's TotalAmount; ?? 0 prevents null returns when there are no orders.
            var todayRevenue = await _db.Orders
                .Where(o => o.OrderDate.Date == today)
                .SumAsync(o => (decimal?)(o.TotalAmount ?? 0)) ?? 0;

            // Last replenishment order (approved)
            // Find the most recently approved replenishment and include the product name.
            var lastApproved = await _db.ReplenishmentOrders
                .Where(r => r.Status == "Approved")
                .OrderByDescending(r => r.ApprovedAt)
                .Join(_db.Products,
                    r => r.ProductId,
                    p => p.ProductId,
                    (r, p) => new { r.ReplenishmentOrderId, p.Name, r.ApprovedAt })
                .FirstOrDefaultAsync();

            // Build and return the anonymous snapshot object.
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
                    Amount = o.TotalAmount ?? 0 // Null-coalesce so the client always gets a number.
                }),
                lastApproved = lastApproved == null ? null : new
                {
                    id = $"REP-{lastApproved.ReplenishmentOrderId}", // Format as a human-readable reference code.
                    lastApproved.Name,
                    approvedAt = lastApproved.ApprovedAt
                },
                timestamp = DateTime.Now.ToString("HH:mm:ss") // Server-local time for the terminal clock display.
            });
        }
    }
}
