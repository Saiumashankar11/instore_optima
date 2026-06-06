// ── DashboardController.cs ───────────────────────────────────────────────────
// Handles the HTTP endpoint under the route  api/dashboard.
//
// This controller exposes a single aggregated "summary" endpoint that the
// React dashboard page calls on load.  All counts and revenue are computed
// server-side in one request, replacing an earlier pattern where the frontend
// fetched six separate tables and aggregated them in JavaScript.
//
// Authentication: every endpoint requires a valid JWT ([Authorize]).
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Application.DTOs;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize] // All endpoints require a valid JWT token.
    public class DashboardController : ControllerBase
    {
        // ── Injected DbContext ────────────────────────────────────────────────
        // AppDbContext is the EF Core database context; all DB queries go through it.
        private readonly AppDbContext _db;

        // Constructor shorthand — single-statement body assigns the injected context.
        public DashboardController(AppDbContext db) => _db = db;

        /// <summary>
        /// Aggregated dashboard figures computed in the database, replacing the
        /// client's previous "fetch six full tables and count in JS" approach.
        /// </summary>
        // ── GET api/dashboard/summary ─────────────────────────────────────────
        /// <summary>
        /// GET api/dashboard/summary
        /// Returns a DashboardSummaryDto with:
        ///   - Total product, supplier, and order counts.
        ///   - Today's order count.
        ///   - Low-stock item count (current stock at or below minimum).
        ///   - Replenishment order counts by status (Pending / Approved / Rejected / Fulfilled).
        ///   - Total revenue from orders with a Completed payment.
        ///   - The 6 most recent orders for the "Recent Orders" table.
        /// Auth: any authenticated user.
        /// Returns: 200 OK with a DashboardSummaryDto.
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            // Basic entity counts — each hits the DB with a COUNT(*) query.
            var products  = await _db.Products.CountAsync();
            var suppliers = await _db.Suppliers.CountAsync();
            var orders    = await _db.Orders.CountAsync();

            // Count orders created today (comparing only the date part, ignoring time).
            var today       = DateTime.Today;
            var todayOrders = await _db.Orders.CountAsync(o => o.OrderDate.Date == today);

            // Low-stock count: JOIN Stocks to Products so we can compare CurrentStock
            // to each product's individual MinStock threshold.
            var lowStock = await _db.Stocks
                .Join(_db.Products, s => s.ProductId, p => p.ProductId,
                      (s, p) => new { s.CurrentStock, p.MinStock })
                .CountAsync(x => x.CurrentStock <= x.MinStock);

            // Replenishment pipeline counts in one pass.
            // GroupBy status and count in SQL — avoids loading all rows into memory.
            var replenByStatus = await _db.ReplenishmentOrders
                .GroupBy(r => r.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();
            // Helper lambda: safely look up a count by status name, defaulting to 0.
            int Replen(string s) => replenByStatus.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

            // Revenue = total of orders that have a completed payment.
            // We build the subquery first (completedOrderIds) so EF Core can translate
            // the whole expression into a single SQL query with a subquery or join.
            var completedOrderIds = _db.Payments
                .Where(p => p.PaymentStatus == "Completed")
                .Select(p => p.OrderId);
            var revenue = await _db.Orders
                .Where(o => completedOrderIds.Contains(o.OrderId))
                .SumAsync(o => (decimal?)(o.TotalAmount ?? 0)) ?? 0; // ?? 0 handles the null case when there are no completed orders.

            // Fetch the 6 most recently placed orders for the dashboard preview table.
            var recentOrders = await _db.Orders
                .OrderByDescending(o => o.OrderDate)
                .Take(6)
                .Select(o => new RecentOrderDto
                {
                    OrderId     = o.OrderId,
                    OrderDate   = o.OrderDate,
                    TotalAmount = o.TotalAmount ?? 0,
                    Status      = o.Status
                })
                .ToListAsync();

            // Assemble and return the full summary DTO.
            return Ok(new DashboardSummaryDto
            {
                Products        = products,
                LowStock        = lowStock,
                Orders          = orders,
                TodayOrders     = todayOrders,
                Suppliers       = suppliers,
                ReplenPending   = Replen("Pending"),
                ReplenApproved  = Replen("Approved"),
                ReplenRejected  = Replen("Rejected"),
                ReplenFulfilled = Replen("Fulfilled"),
                ReplenTotal     = replenByStatus.Sum(x => x.Count), // Grand total across all statuses.
                Revenue         = revenue,
                RecentOrders    = recentOrders
            });
        }
    }
}
