using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Api.Exceptions;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    /// <summary>
    /// API endpoints for managing stock.
    /// </summary>
    public class StockController : ControllerBase
    {
        private readonly IStockRepository _repo;
        private readonly IStockMovementRepository _movementRepo;

        public StockController(IStockRepository repo, IStockMovementRepository movementRepo)
        {
            _repo = repo;
            _movementRepo = movementRepo;
        }

        /// <summary>
        /// Gets all stock records in the system.
        /// </summary>
        /// <returns>A list of all stock records.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var stocks = await _repo.GetAllAsync();
            return Ok(stocks.Select(MapToResponse));
        }

        /// <summary>
        /// Gets a specific stock record by its ID.
        /// </summary>
        /// <param name="id">The ID of the stock record.</param>
        /// <returns>The stock record details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var s = await _repo.GetByIdAsync(id);
            if (s == null)
                throw new ResourceNotFoundException("Stock", id);

            return Ok(MapToResponse(s));
        }

        /// <summary>
        /// Gets all stock records that are below the minimum stock level.
        /// </summary>
        /// <returns>A list of stock records below the minimum stock level.</returns>
        [HttpGet("low")]
        public async Task<IActionResult> GetLowStock()
        {
            var stocks = await _repo.GetBelowMinStockAsync();
            return Ok(stocks.Select(MapToResponse));
        }

        /// <summary>
        /// Creates a new stock record.
        /// </summary>
        /// <param name="dto">The stock creation data.</param>
        /// <returns>The created stock record.</returns>
        [HttpPost]
        public async Task<IActionResult> Create(StockCreateDTO dto)
        {
            if (dto.ProductId <= 0)
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "ProductId", new[] { "ProductId is required and must be greater than 0" } }
                });

            var existing = await _repo.GetByProductIdAsync(dto.ProductId);
            if (existing != null)
                throw new ConflictException($"Stock for product {dto.ProductId} already exists.");

            var entity = new Stock
            {
                ProductId = dto.ProductId,
                CurrentStock = dto.CurrentStock
            };

            var created = await _repo.CreateAsync(entity);
            return CreatedAtAction(nameof(GetById), new { id = created.StockId }, MapToResponse(created));
        }

        // PUT api/stock/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, StockUpdateDTO dto)
        {
            var updated = await _repo.UpdateAsync(id, new Stock
            {
                CurrentStock = dto.CurrentStock
            });

            if (updated == null)
                throw new ResourceNotFoundException("Stock", id);

            return Ok(MapToResponse(updated));
        }

        // DELETE api/stock/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var stock = await _repo.GetByIdAsync(id);
            if (stock == null)
                throw new ResourceNotFoundException("Stock", id);

            // Read the calling admin's userId from the JWT claim
            var userIdClaim = User.FindFirst("userId")?.Value
                           ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int performedBy = int.TryParse(userIdClaim, out int uid) ? uid : 1;

            // Auto-record a WRITE_OFF movement so the audit trail is preserved
            if (stock.CurrentStock > 0)
            {
                await _movementRepo.CreateAsync(new StockMovement
                {
                    ProductId    = stock.ProductId,
                    Quantity     = stock.CurrentStock,
                    MovementType = "WRITE_OFF",
                    PerformedBy  = performedBy,
                    Reason       = "Stock record deleted — remaining units written off",
                    PerformedAt  = DateTime.UtcNow
                });
            }

            var result = await _repo.DeleteAsync(id);
            if (!result)
                throw new ResourceNotFoundException("Stock", id);

            return Ok(new { message = $"Stock {id} deleted and {stock.CurrentStock} units written off." });
        }

        // ── Mapping ──────────────────────────────────────────────────
        private static StockResponseDTO MapToResponse(Stock s) => new()
        {
            StockId = s.StockId,
            ProductId = s.ProductId,
            CurrentStock = s.CurrentStock,
            LastUpdated = s.LastUpdated
        };
    }
}