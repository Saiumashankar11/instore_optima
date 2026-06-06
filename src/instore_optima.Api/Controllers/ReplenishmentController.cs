// ── ReplenishmentController ───────────────────────────────────────────────────
// Manages stock replenishment under /api/replenishment.
// Two sub-resources:
//   • Rules  — define per-product min/max stock thresholds and reorder points
//   • Orders — track requests to restock a product (Pending → Approved/Rejected)
// All endpoints require a valid JWT. Creating, approving, or deleting orders
// additionally requires the Admin or Manager role.
// ─────────────────────────────────────────────────────────────────────────────

// Standard API and domain namespaces
using instore_optima.Api.Exceptions;
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;

using instore_optima.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // resolves to /api/replenishment
    [Authorize]                 // all endpoints require a valid JWT
    /// <summary>
    /// API endpoints for managing replenishment rules and operations.
    /// </summary>
    public class ReplenishmentController : ControllerBase
    {
        // _repo — all replenishment data access (rules, orders, auto-trigger)
        private readonly IReplenishmentRepository _repo;

        public ReplenishmentController(IReplenishmentRepository repo)
        {
            _repo = repo;
        }

        // ── Rules ────────────────────────────────────────────────────

        /// <summary>
        /// Gets all replenishment rules in the system.
        /// </summary>
        /// <returns>A list of all replenishment rules.</returns>
        // GET /api/replenishment/rules
        // Returns every rule (one per product). Open to all authenticated users.
        [HttpGet("rules")]
        public async Task<IActionResult> GetRules()
        {
            var rules = await _repo.GetAllRulesAsync();
            // Project each entity to a response DTO so internal EF navigation properties
            // are not leaked in the API response.
            return Ok(rules.Select(MapRuleToResponse));
        }

        /// <summary>
        /// Gets a specific replenishment rule by its ID.
        /// </summary>
        /// <param name="id">The ID of the replenishment rule.</param>
        /// <returns>The replenishment rule details if found; otherwise, NotFound.</returns>
        // GET /api/replenishment/rules/{id}
        // Returns a single rule. Throws ResourceNotFoundException (→ 404) if missing.
        [HttpGet("rules/{id}")]
        public async Task<IActionResult> GetRuleById(int id)
        {
            var rule = await _repo.GetRuleByIdAsync(id);
            if (rule == null)
                throw new ResourceNotFoundException("ReplenishmentRule", id); // results in 404

            return Ok(MapRuleToResponse(rule));
        }

        /// <summary>
        /// Creates a new replenishment rule.
        /// </summary>
        /// <param name="dto">The replenishment rule creation data.</param>
        /// <returns>The created replenishment rule.</returns>
        // POST /api/replenishment/rules
        // Creates a rule for a product. Returns 409 Conflict if a rule already exists
        // for that product (only one rule per product is allowed).
        [HttpPost("rules")]
        public async Task<IActionResult> CreateRule(ReplenishmentRuleCreateDTO dto)
        {
            // Prevent duplicate rules: one product → one rule
            var existing = await _repo.GetRuleByProductIdAsync(dto.ProductId);
            if (existing != null)
                return Conflict(new { message = $"A rule for product {dto.ProductId} already exists." });

            // Map the DTO to the domain entity before persisting
            var entity = new ReplenishmentRule
            {
                ProductId = dto.ProductId,
                MinLevel = dto.MinLevel,
                MaxLevel = dto.MaxLevel,
                ReorderPoint = dto.ReorderPoint // stock level that triggers auto-replenishment
            };

            var created = await _repo.CreateRuleAsync(entity);
            // 201 Created with a Location header pointing to GetRuleById
            return CreatedAtAction(nameof(GetRuleById), new { id = created.RuleId },
                MapRuleToResponse(created));
        }

        // PUT api/replenishment/rules/{id}
        // Updates an existing rule's thresholds and status. Returns 404 if the rule is missing.
        [HttpPut("rules/{id}")]
        public async Task<IActionResult> UpdateRule(int id, ReplenishmentRuleUpdateDTO dto)
        {
            var updated = await _repo.UpdateRuleAsync(id, new ReplenishmentRule
            {
                MinLevel = dto.MinLevel,
                MaxLevel = dto.MaxLevel,
                ReorderPoint = dto.ReorderPoint,
                Status = dto.Status // e.g. "Active" or "Inactive"
            });

            if (updated == null) return NotFound(new { message = $"Rule {id} not found." });
            return Ok(MapRuleToResponse(updated));
        }

        // DELETE api/replenishment/rules/{id}
        // Permanently removes a replenishment rule. Returns 404 if not found.
        [HttpDelete("rules/{id}")]
        public async Task<IActionResult> DeleteRule(int id)
        {
            var result = await _repo.DeleteRuleAsync(id);
            if (!result) return NotFound(new { message = $"Rule {id} not found." });
            return Ok(new { message = $"Rule {id} deleted successfully." });
        }

        // ── Replenishment Orders ──────────────────────────────────────

        // GET api/replenishment/orders
        // Returns all replenishment orders. Open to all authenticated users so staff
        // can view the current replenishment queue.
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            var orders = await _repo.GetAllOrdersAsync();
            return Ok(orders.Select(MapOrderToResponse));
        }

        // GET api/replenishment/orders/{id}
        // Returns a single replenishment order. Returns 404 if not found.
        [HttpGet("orders/{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _repo.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = $"Replenishment order {id} not found." });
            return Ok(MapOrderToResponse(order));
        }

        // POST api/replenishment/orders
        // Creates a new replenishment order for a product. Restricted to Admin and Manager.
        // Returns 201 Created with the new order.
        [HttpPost("orders")]
        [Authorize(Roles = "Admin,Manager")] // Staff cannot raise replenishment orders
        public async Task<IActionResult> CreateOrder(ReplenishmentOrderCreateDTO dto)
        {
            var entity = new ReplenishmentOrder
            {
                ProductId = dto.ProductId,
                QuantityRequested = dto.QuantityRequested
                // Status defaults to "Pending" and GeneratedAt is set in the repository
            };

            var created = await _repo.CreateOrderAsync(entity);
            return CreatedAtAction(nameof(GetOrderById), new { id = created.ReplenishmentOrderId },
                MapOrderToResponse(created));
        }

        // PATCH api/replenishment/orders/{id}/status
        // Updates an order's status (e.g. Pending → Approved, Pending → Rejected).
        // Also records who approved/rejected it (ApprovedBy). Restricted to Admin and Manager.
        [HttpPatch("orders/{id}/status")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateStatus(int id, ReplenishmentOrderUpdateDTO dto)
        {
            var updated = await _repo.UpdateOrderStatusAsync(id, dto.Status, dto.ApprovedBy);
            if (updated == null) return NotFound(new { message = $"Replenishment order {id} not found." });
            return Ok(MapOrderToResponse(updated));
        }

        // DELETE api/replenishment/orders/{id}
        // Removes a replenishment order. Restricted to Admin and Manager.
        // Throws ConflictException (→ 409) if the order cannot be deleted in its current state
        // (e.g. already Approved orders may be locked).
        [HttpDelete("orders/{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            try
            {
                var result = await _repo.DeleteOrderAsync(id);
                if (!result) return NotFound(new { message = $"Replenishment order {id} not found." });
                return Ok(new { message = $"Replenishment order {id} deleted." });
            }
            catch (InvalidOperationException ex)
            {
                // Repository throws InvalidOperationException when the business rule prevents deletion;
                // wrap it in a ConflictException so the global error handler returns 409.
                throw new ConflictException(ex.Message);
            }
        }

        // POST api/replenishment/trigger
        // Runs the automatic replenishment check: evaluates all products against their rules
        // and creates Pending orders for any product below its reorder point.
        // Open to all authenticated users (typically called by a background scheduler or admin).
        [HttpPost("trigger")]
        public async Task<IActionResult> TriggerAuto()
        {
            await _repo.TriggerAutoReplenishmentAsync();
            return Ok(new { message = "Auto-replenishment check complete." });
        }

        // ── Mapping ──────────────────────────────────────────────────
        // Static helper methods that convert domain entities to API response DTOs.
        // Keeping the mapping here ensures we never accidentally expose EF navigation
        // properties (circular references) in the JSON response.

        private static ReplenishmentRuleResponseDTO MapRuleToResponse(ReplenishmentRule r) => new()
        {
            RuleId = r.RuleId,
            ProductId = r.ProductId,
            MinLevel = r.MinLevel,
            MaxLevel = r.MaxLevel,
            ReorderPoint = r.ReorderPoint,
            Status = r.Status,
            CreatedAt = r.CreatedAt
        };

        private static ReplenishmentOrderResponseDTO MapOrderToResponse(ReplenishmentOrder o) => new()
        {
            ReplenishmentOrderId = o.ReplenishmentOrderId,
            ProductId = o.ProductId,
            QuantityRequested = o.QuantityRequested,
            GeneratedAt = o.GeneratedAt,
            ApprovedBy = o.ApprovedBy,
            ApprovedAt = o.ApprovedAt,
            Status = o.Status
        };
    }
}
