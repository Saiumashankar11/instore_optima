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
        private readonly IStockMovementRepository _repo;

        public StockMovementController(IStockMovementRepository repo)
        {
            _repo = repo;
        }

        /// <summary>
        /// Gets all stock movements in the system.
        /// </summary>
        /// <returns>A list of all stock movements.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var movements = await _repo.GetAllAsync();
            return Ok(movements.Select(MapToResponse));
        }

        /// <summary>
        /// Gets all stock movements for a specific product.
        /// </summary>
        /// <param name="productId">The ID of the product.</param>
        /// <returns>A list of stock movements for the specified product.</returns>
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetByProduct(int productId)
        {
            var movements = await _repo.GetByProductIdAsync(productId);
            return Ok(movements.Select(MapToResponse));
        }

        /// <summary>
        /// Gets a specific stock movement by its ID.
        /// </summary>
        /// <param name="id">The ID of the stock movement.</param>
        /// <returns>The stock movement details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var movement = await _repo.GetByIdAsync(id);
            if (movement == null)
                throw new ResourceNotFoundException("StockMovement", id);

            return Ok(MapToResponse(movement));
        }

        /// <summary>
        /// Creates a new stock movement.
        /// </summary>
        /// <param name="dto">The stock movement creation data.</param>
        /// <returns>The created stock movement.</returns>
        [HttpPost]
        public async Task<IActionResult> Create(StockMovementCreateDTO dto)
        {
            if (dto.ProductId <= 0)
                throw new ValidationException(new Dictionary<string, string[]> { { "ProductId", new[] { "ProductId is required." } } });

            if (dto.PerformedBy <= 0)
                throw new ValidationException(new Dictionary<string, string[]> { { "PerformedBy", new[] { "PerformedBy (UserId) is required." } } });

            var entity = new StockMovement
            {
                ProductId = dto.ProductId,
                Quantity = dto.Quantity,
                MovementType = dto.MovementType.ToUpper(),
                PerformedBy = dto.PerformedBy,
                Reason = dto.Reason
            };

            var created = await _repo.CreateAsync(entity);
            return CreatedAtAction(nameof(GetById), new { id = created.MovementId }, MapToResponse(created));
        }

        // PATCH api/stockmovement/{id}
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateReason(int id, StockMovementUpdateDTO dto)
        {
            var updated = await _repo.UpdateAsync(id, new StockMovement
            {
                Reason = dto.Reason
            });

            if (updated == null)
                throw new ResourceNotFoundException("StockMovement", id);
            return Ok(MapToResponse(updated));
        }

        // ── Mapping ──────────────────────────────────────────────────
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