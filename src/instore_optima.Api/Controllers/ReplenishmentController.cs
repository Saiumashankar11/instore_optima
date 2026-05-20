using instore_optima.Api.Exceptions;
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;

using instore_optima.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    /// <summary>
    /// API endpoints for managing replenishment rules and operations.
    /// </summary>
    public class ReplenishmentController : ControllerBase
    {
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
        [HttpGet("rules")]
        public async Task<IActionResult> GetRules()
        {
            var rules = await _repo.GetAllRulesAsync();
            return Ok(rules.Select(MapRuleToResponse));
        }

        /// <summary>
        /// Gets a specific replenishment rule by its ID.
        /// </summary>
        /// <param name="id">The ID of the replenishment rule.</param>
        /// <returns>The replenishment rule details if found; otherwise, NotFound.</returns>
        [HttpGet("rules/{id}")]
        public async Task<IActionResult> GetRuleById(int id)
        {
            var rule = await _repo.GetRuleByIdAsync(id);
            if (rule == null)
                throw new ResourceNotFoundException("ReplenishmentRule", id);

            return Ok(MapRuleToResponse(rule));
        }

        /// <summary>
        /// Creates a new replenishment rule.
        /// </summary>
        /// <param name="dto">The replenishment rule creation data.</param>
        /// <returns>The created replenishment rule.</returns>
        [HttpPost("rules")]
        public async Task<IActionResult> CreateRule(ReplenishmentRuleCreateDTO dto)
        {
            var existing = await _repo.GetRuleByProductIdAsync(dto.ProductId);
            if (existing != null)
                return Conflict(new { message = $"A rule for product {dto.ProductId} already exists." });

            var entity = new ReplenishmentRule
            {
                ProductId = dto.ProductId,
                MinLevel = dto.MinLevel,
                MaxLevel = dto.MaxLevel,
                ReorderPoint = dto.ReorderPoint
            };

            var created = await _repo.CreateRuleAsync(entity);
            return CreatedAtAction(nameof(GetRuleById), new { id = created.RuleId },
                MapRuleToResponse(created));
        }

        // PUT api/replenishment/rules/{id}
        [HttpPut("rules/{id}")]
        public async Task<IActionResult> UpdateRule(int id, ReplenishmentRuleUpdateDTO dto)
        {
            var updated = await _repo.UpdateRuleAsync(id, new ReplenishmentRule
            {
                MinLevel = dto.MinLevel,
                MaxLevel = dto.MaxLevel,
                ReorderPoint = dto.ReorderPoint,
                Status = dto.Status
            });

            if (updated == null) return NotFound(new { message = $"Rule {id} not found." });
            return Ok(MapRuleToResponse(updated));
        }

        // DELETE api/replenishment/rules/{id}
        [HttpDelete("rules/{id}")]
        public async Task<IActionResult> DeleteRule(int id)
        {
            var result = await _repo.DeleteRuleAsync(id);
            if (!result) return NotFound(new { message = $"Rule {id} not found." });
            return Ok(new { message = $"Rule {id} deleted successfully." });
        }

        // ── Replenishment Orders ──────────────────────────────────────

        // GET api/replenishment/orders
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            var orders = await _repo.GetAllOrdersAsync();
            return Ok(orders.Select(MapOrderToResponse));
        }

        // GET api/replenishment/orders/{id}
        [HttpGet("orders/{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _repo.GetOrderByIdAsync(id);
            if (order == null) return NotFound(new { message = $"Replenishment order {id} not found." });
            return Ok(MapOrderToResponse(order));
        }

        // POST api/replenishment/orders
        [HttpPost("orders")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> CreateOrder(ReplenishmentOrderCreateDTO dto)
        {
            var entity = new ReplenishmentOrder
            {
                ProductId = dto.ProductId,
                QuantityRequested = dto.QuantityRequested
            };

            var created = await _repo.CreateOrderAsync(entity);
            return CreatedAtAction(nameof(GetOrderById), new { id = created.ReplenishmentOrderId },
                MapOrderToResponse(created));
        }

        // PATCH api/replenishment/orders/{id}/status
        [HttpPatch("orders/{id}/status")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateStatus(int id, ReplenishmentOrderUpdateDTO dto)
        {
            var updated = await _repo.UpdateOrderStatusAsync(id, dto.Status, dto.ApprovedBy);
            if (updated == null) return NotFound(new { message = $"Replenishment order {id} not found." });
            return Ok(MapOrderToResponse(updated));
        }

        // POST api/replenishment/trigger
        [HttpPost("trigger")]
        public async Task<IActionResult> TriggerAuto()
        {
            await _repo.TriggerAutoReplenishmentAsync();
            return Ok(new { message = "Auto-replenishment check complete." });
        }

        // ── Mapping ──────────────────────────────────────────────────

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