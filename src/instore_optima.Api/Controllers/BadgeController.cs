using instore_optima.Application.DTOs;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/badges")]
    [Authorize]
    public class BadgeController : ControllerBase
    {
        private readonly AppDbContext _db;

        public BadgeController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetCounts()
        {
            var lowStock = await _db.Stocks
                .Join(_db.Products,
                    s => s.ProductId,
                    p => p.ProductId,
                    (s, p) => new { s.CurrentStock, p.MinStock })
                .CountAsync(x => x.CurrentStock <= x.MinStock);

            var pendingReplenishment = await _db.ReplenishmentOrders
                .CountAsync(r => r.Status == "Pending");

            var pendingPOs = await _db.PurchaseOrders
                .CountAsync(po => po.Status == "Pending");

            var pendingOrders = await _db.Orders
                .CountAsync(o => o.Status == "Pending" || o.Status == "Processing");

            var pendingPayments = await _db.Payments
                .CountAsync(p => p.PaymentStatus == "Pending");

            // Invoices that have been issued but not yet paid
            var issuedInvoices = await _db.Invoices
                .CountAsync(i => i.Status == "Issued");

            return Ok(new BadgeCountsDto
            {
                LowStock             = lowStock,
                PendingReplenishment = pendingReplenishment,
                PendingPurchaseOrders = pendingPOs,
                PendingOrders        = pendingOrders,
                PendingPayments      = pendingPayments,
                IssuedInvoices       = issuedInvoices
            });
        }
    }
}
