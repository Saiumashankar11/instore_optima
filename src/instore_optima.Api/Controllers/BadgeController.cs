// ── BadgeController.cs ────────────────────────────────────────────────────────
// Handles the HTTP endpoint under the route  api/badges.
//
// The badge counts are the small red notification bubbles that appear on sidebar
// navigation links in the React frontend (e.g. "3 pending orders").  This
// controller computes all of those counts in a single DB round-trip so the UI
// only has to make one request on mount.
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
    [Route("api/badges")]
    [Authorize] // All endpoints require a valid JWT token.
    public class BadgeController : ControllerBase
    {
        // ── Injected DbContext ────────────────────────────────────────────────
        // AppDbContext gives direct EF Core access to all database tables.
        private readonly AppDbContext _db;

        // Constructor shorthand — single-statement body assigns the injected context.
        public BadgeController(AppDbContext db) => _db = db;

        // ── GET api/badges ────────────────────────────────────────────────────
        /// <summary>
        /// GET api/badges
        /// Returns the counts used to render sidebar notification badges in the UI.
        /// Each count is a separate COUNT(*) query against the relevant table/status.
        /// Auth: any authenticated user.
        /// Returns: 200 OK with a BadgeCountsDto.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCounts()
        {
            // Count products whose on-hand stock is at or below their minimum threshold.
            // Requires a JOIN because MinStock lives on the Products table, not Stocks.
            var lowStock = await _db.Stocks
                .Join(_db.Products,
                    s => s.ProductId,
                    p => p.ProductId,
                    (s, p) => new { s.CurrentStock, p.MinStock })
                .CountAsync(x => x.CurrentStock <= x.MinStock);

            // Replenishment orders waiting for manager/admin approval.
            var pendingReplenishment = await _db.ReplenishmentOrders
                .CountAsync(r => r.Status == "Pending");

            // Purchase orders sent to suppliers that haven't been delivered yet.
            var pendingPOs = await _db.PurchaseOrders
                .CountAsync(po => po.Status == "Pending");

            // Customer orders that are still being processed (not yet shipped/completed).
            var pendingOrders = await _db.Orders
                .CountAsync(o => o.Status == "Pending" || o.Status == "Processing");

            // Payments that have been recorded but not yet marked as Completed.
            var pendingPayments = await _db.Payments
                .CountAsync(p => p.PaymentStatus == "Pending");

            // Invoices that have been issued but not yet paid
            // An "Issued" invoice is one that has been sent but awaits payment.
            var issuedInvoices = await _db.Invoices
                .CountAsync(i => i.Status == "Issued");

            // Return all counts in a single DTO.
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
