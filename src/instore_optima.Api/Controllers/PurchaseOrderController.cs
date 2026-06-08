// ── PurchaseOrderController.cs ────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/purchaseorder
// (the [controller] token resolves to "PurchaseOrder").
//
// A Purchase Order (PO) is a formal request sent to a Supplier to deliver goods.
// It is typically created when a Replenishment Order is approved. Only
// Admin/Manager roles may create or delete POs; status updates are open to all
// authenticated users.
//
// Authentication: every endpoint requires a valid JWT ([Authorize]).
// Create / Delete are additionally restricted to Admin or Manager roles.
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Api.Exceptions;
using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // All endpoints require a valid JWT token.
    /// <summary>
    /// API endpoints for managing purchase orders.
    /// </summary>
    public class PurchaseOrderController : ControllerBase
    {
        // ── Injected services ─────────────────────────────────────────────────
        private readonly IPurchaseOrderRepository _purchaseOrderRepository; // DB access for POs.
        private readonly IPONotificationService   _poNotifier;              // Sends email/notifications when a PO is created.

        // Constructor — ASP.NET Core injects both services at runtime.
        public PurchaseOrderController(
            IPurchaseOrderRepository purchaseOrderRepository,
            IPONotificationService poNotifier)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _poNotifier              = poNotifier;
        }

        // ── GET api/purchaseorder ─────────────────────────────────────────────
        /// <summary>
        /// Returns every purchase order in the system.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _purchaseOrderRepository.GetAllPurchaseOrdersAsync();
            return Ok(orders);
        }

        // ── GET api/purchaseorder/{id} ────────────────────────────────────────
        /// <summary>
        /// Returns a single purchase order by its primary key.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var po = await _purchaseOrderRepository.GetPOByIdAsync(id);
            if (po == null)
                throw new ResourceNotFoundException("PurchaseOrder", id); // Global handler → 404.

            return Ok(po);
        }

        // ── POST api/purchaseorder ────────────────────────────────────────────
        /// <summary>
        /// Creates a new purchase order with status "Pending" and notifies the
        /// creator via the PO notification service (e.g. email to the creator).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Manager")] // Only Admin and Manager may raise purchase orders.
        public async Task<IActionResult> Create(CreatePurchaseOrderDto dto)
        {
            // Basic guard checks — these fields are mandatory for a valid PO.
            if (dto.SupplierId <= 0)
                return BadRequest("SupplierId is required");

            if (dto.ReplenishmentOrderId <= 0)
                return BadRequest("ReplenishmentOrderId is required");

            // Map the incoming DTO to the domain entity.
            var po = new instore_optima.Domain.Entities.PurchaseOrder
            {
                SupplierId = dto.SupplierId,
                ReplenishmentOrderId = dto.ReplenishmentOrderId,
                IssuedAt = dto.IssuedAt,
                ExpectedDeliveryDate = dto.ExpectedDeliveryDate,
                Status = "Pending" // All new POs start in Pending state.
            };

            var created = await _purchaseOrderRepository.CreatePurchaseOrderAsync(po);

            // Extract the creator's userId from the JWT claims so the notification
            // service knows who raised this PO.  Falls back to 0 if the claim is absent.
            var creatorId = int.TryParse(User.FindFirst("userId")?.Value, out var uid) ? uid : 0;
            if (creatorId > 0)
                await _poNotifier.NotifyPOCreatedAsync(created, creatorId);

            // 201 Created — Location header points to GET api/purchaseorder/{id}.
            return CreatedAtAction(nameof(GetById), new { id = created.PurchaseOrderId }, created);
        }

        // PUT api/purchaseorder/{id}
        /// <summary>
        /// Updates the status of an existing purchase order.
        /// Allowed statuses: "Pending", "Delivered", "Cancelled".
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStatus(int id, UpdatePurchaseOrderDto dto)
        {
            // Reject empty or missing status values before hitting the database.
            if (string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest("Status is required");

            // Enforce a closed set of valid statuses.
            var validStatuses = new[] { "Pending", "Delivered", "Cancelled" };
            if (!validStatuses.Contains(dto.Status))
                return BadRequest("Status must be Pending, Delivered or Cancelled");

            var po = await _purchaseOrderRepository.GetPOByIdAsync(id);
            if (po == null) return NotFound();

            try
            {
                var updated = await _purchaseOrderRepository.UpdatePOStatusAsync(id, dto.Status);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                // The repository throws this for invalid state transitions (e.g. re-delivering a cancelled PO).
                throw new ConflictException(ex.Message);
            }
        }

        // DELETE api/purchaseorder/{id}
        /// <summary>
        /// Permanently removes a purchase order. Fails with 409 Conflict if the
        /// PO cannot be deleted due to related data constraints.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // Only Admins may delete purchase orders.
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var result = await _purchaseOrderRepository.DeletePurchaseOrderAsync(id);
                if (!result) throw new ResourceNotFoundException("PurchaseOrder", id);
                return Ok(new { message = $"Purchase order #{id} deleted successfully." });
            }
            catch (InvalidOperationException ex)
            {
                // Thrown when the PO is in a state that prevents deletion (e.g. already Delivered).
                throw new ConflictException(ex.Message);
            }
        }
    }
}
