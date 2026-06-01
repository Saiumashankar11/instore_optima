using instore_optima.Application.DTOs;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DashboardController(AppDbContext db) => _db = db;

        /// <summary>
        /// Aggregated dashboard figures computed in the database, replacing the
        /// client's previous "fetch six full tables and count in JS" approach.
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var products  = await _db.Products.CountAsync();
            var suppliers = await _db.Suppliers.CountAsync();
            var orders    = await _db.Orders.CountAsync();

            var today       = DateTime.Today;
            var todayOrders = await _db.Orders.CountAsync(o => o.OrderDate.Date == today);

            var lowStock = await _db.Stocks
                .Join(_db.Products, s => s.ProductId, p => p.ProductId,
                      (s, p) => new { s.CurrentStock, p.MinStock })
                .CountAsync(x => x.CurrentStock <= x.MinStock);

            // Replenishment pipeline counts in one pass.
            var replenByStatus = await _db.ReplenishmentOrders
                .GroupBy(r => r.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();
            int Replen(string s) => replenByStatus.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

            // Revenue = total of orders that have a completed payment.
            var completedOrderIds = _db.Payments
                .Where(p => p.PaymentStatus == "Completed")
                .Select(p => p.OrderId);
            var revenue = await _db.Orders
                .Where(o => completedOrderIds.Contains(o.OrderId))
                .SumAsync(o => (decimal?)(o.TotalAmount ?? 0)) ?? 0;

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
                ReplenTotal     = replenByStatus.Sum(x => x.Count),
                Revenue         = revenue,
                RecentOrders    = recentOrders
            });
        }
    }
}
