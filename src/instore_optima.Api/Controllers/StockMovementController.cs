// ── StockMovementController.cs ────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/stockmovement
// (the [controller] token resolves to "StockMovement").
//
// A Stock Movement records any change to the on-hand quantity of a product —
// for example a delivery ("IN"), a sale ("OUT"), or an adjustment ("ADJUSTMENT").
// Each movement is linked to a product and the user who performed it.
//
// Authentication: no controller-level [Authorize] is applied; the Delete endpoint
// is individually locked to the Admin role.
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Api.Exceptions;
using instore_optima.Domain.Entities;
using instore_optima.Application.DTOs;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    /// <summary>
    /// API endpoints for managing stock movements.
    /// </summary>
    public class StockMovementController : ControllerBase
    {
        // ── Injected repository ───────────────────────────────────────────────
        private readonly IStockMovementRepository _repo; // All database operations for StockMovement.

        // Constructor — the repository is injected by ASP.NET Core's DI container.
        public StockMovementController(IStockMovementRepository repo)
        {
            _repo = repo;
        }

        // ── GET api/stockmovement ─────────────────────────────────────────────
        /// <summary>
        /// Returns every stock movement in the system across all products.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var movements = await _repo.GetAllAsync();
            // Project each domain entity to a DTO before returning.
            return Ok(movements.Select(MapToResponse));
        }

        // ── GET api/stockmovement/product/{productId} ─────────────────────────
        /// <summary>
        /// Returns all stock movements for a specific product, useful for
        /// auditing the history of stock changes for that item.
        /// </summary>
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetByProduct(int productId)
        {
            var movements = await _repo.GetByProductIdAsync(productId);
            return Ok(movements.Select(MapToResponse));
        }

        // ── GET api/stockmovement/{id} ────────────────────────────────────────
        /// <summary>
        /// Returns a single stock movement by its primary key.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var movement = await _repo.GetByIdAsync(id);
            if (movement == null)
                throw new ResourceNotFoundException("StockMovement", id); // Global handler → 404.

            return Ok(MapToResponse(movement));
        }

        // ── POST api/stockmovement ────────────────────────────────────────────
        /// <summary>
        /// Records a new stock movement for a product.
        /// MovementType is normalised to uppercase (e.g. "in" → "IN").
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create(StockMovementCreateDTO dto)
        {
            // Validate required foreign keys before touching the database.
            if (dto.ProductId <= 0)
                throw new ValidationException(new Dictionary<string, string[]> { { "ProductId", new[] { "ProductId is required." } } });

            if (dto.PerformedBy <= 0)
                throw new ValidationException(new Dictionary<string, string[]> { { "PerformedBy", new[] { "PerformedBy (UserId) is required." } } });

            // Map the DTO to the domain entity; MovementType is uppercased for consistency.
            var entity = new StockMovement
            {
                ProductId = dto.ProductId,
                Quantity = dto.Quantity,
                MovementType = dto.MovementType.ToUpper(), // Normalise to "IN", "OUT", etc.
                PerformedBy = dto.PerformedBy,
                Reason = dto.Reason
            };

            var created = await _repo.CreateAsync(entity);
            // 201 Created — Location header points to GET api/stockmovement/{id}.
            return CreatedAtAction(nameof(GetById), new { id = created.MovementId }, MapToResponse(created));
        }

        // PATCH api/stockmovement/{id}
        /// <summary>
        /// Updates only the Reason field of an existing stock movement.
        /// (A partial update — hence PATCH rather than PUT.)
        /// </summary>
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateReason(int id, StockMovementUpdateDTO dto)
        {
            // Pass a partially-populated entity; the repository will only update Reason.
            var updated = await _repo.UpdateAsync(id, new StockMovement
            {
                Reason = dto.Reason
            });

            if (updated == null)
                throw new ResourceNotFoundException("StockMovement", id);
            return Ok(MapToResponse(updated));
        }

        // DELETE api/stockmovement/{id} — Admin only
        /// <summary>
        /// Permanently removes a stock movement record.
        /// </summary>
        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")] // Only Admins may delete movement records.
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _repo.DeleteAsync(id);
            if (!result)
                throw new ResourceNotFoundException("StockMovement", id);
            return Ok(new { message = $"StockMovement {id} deleted." });
        }

        // ── Mapping ──────────────────────────────────────────────────
        // Converts the StockMovement domain entity to the DTO returned by all endpoints.
        private static StockMovementResponseDTO MapToResponse(StockMovement m) => new()
        {
            MovementId = m.MovementId,
            ProductId = m.ProductId,
            Quantity = m.Quantity,
            MovementType = m.MovementType,
            PerformedBy = m.PerformedBy,
            PerformedAt = m.PerformedAt,
            Reason = m.Reason
        };
    }
}
