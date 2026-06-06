// ── StockController ───────────────────────────────────────────────────────────
// Manages product stock levels under /api/stock.
// Provides CRUD for stock records and tracks every quantity change as a
// StockMovement for audit/history purposes (WRITE_OFF or ADJUSTMENT).
// Deleting a stock record requires the Admin role; all other operations are
// open to any authenticated user.
// ─────────────────────────────────────────────────────────────────────────────

// DTOs, exception helpers, and repository interfaces
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Api.Exceptions;
using instore_optima.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // resolves to /api/stock
    /// <summary>
    /// API endpoints for managing stock.
    /// </summary>
    public class StockController : ControllerBase
    {
        // _repo         — CRUD for Stock records (one record per product)
        // _movementRepo — append-only log for stock quantity changes (audit trail)
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
        // GET /api/stock
        // Returns every stock record. No role restriction — any authenticated user can view stock.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var stocks = await _repo.GetAllAsync();
            // MapToResponse strips EF navigation properties to avoid circular-reference issues
            return Ok(stocks.Select(MapToResponse));
        }

        /// <summary>
        /// Gets a specific stock record by its ID.
        /// </summary>
        /// <param name="id">The ID of the stock record.</param>
        /// <returns>The stock record details if found; otherwise, NotFound.</returns>
        // GET /api/stock/{id}
        // Returns a single stock record. Throws ResourceNotFoundException (→ 404) if missing.
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
        // GET /api/stock/low
        // Returns products whose CurrentStock is below the configured minimum level.
        // Used by the dashboard to highlight items that need restocking.
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
        // POST /api/stock
        // Creates a stock tracking record for a product. One product → one stock record
        // (enforced by the ConflictException below). The initial quantity is set from the DTO.
        [HttpPost]
        public async Task<IActionResult> Create(StockCreateDTO dto)
        {
            // Reject invalid ProductId before hitting the database
            if (dto.ProductId <= 0)
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "ProductId", new[] { "ProductId is required and must be greater than 0" } }
                });

            // Enforce the one-record-per-product constraint
            var existing = await _repo.GetByProductIdAsync(dto.ProductId);
            if (existing != null)
                throw new ConflictException($"Stock for product {dto.ProductId} already exists.");

            var entity = new Stock
            {
                ProductId = dto.ProductId,
                CurrentStock = dto.CurrentStock
            };

            var created = await _repo.CreateAsync(entity);
            // 201 Created with a Location header pointing to GetById
            return CreatedAtAction(nameof(GetById), new { id = created.StockId }, MapToResponse(created));
        }

        // PUT api/stock/{id}
        // Updates the stock quantity for a record and automatically writes a movement log entry.
        // No role restriction — managers and staff can adjust stock.
        // Movement type is determined by whether stock went up (ADJUSTMENT) or down (WRITE_OFF).
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, StockUpdateDTO dto)
        {
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Stock", id);

            int oldStock = existing.CurrentStock;
            int newStock = dto.CurrentStock;

            var updated = await _repo.UpdateAsync(id, new Stock
            {
                CurrentStock = newStock
            });

            if (updated == null)
                throw new ResourceNotFoundException("Stock", id);

            // Record a stock movement for the difference
            // Extract the calling user's ID from the JWT claim for the audit record.
            // Falls back to userId 1 (system) if the claim is missing (should not happen in practice).
            var userIdClaim = User.FindFirst("userId")?.Value
                           ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int performedBy = int.TryParse(userIdClaim, out int uid) ? uid : 1;

            if (newStock < oldStock)
            {
                // Stock decreased — record a write-off (log only, stock already updated)
                await _movementRepo.RecordOnlyAsync(new StockMovement
                {
                    ProductId    = existing.ProductId,
                    Quantity     = oldStock - newStock, // how many units were removed
                    MovementType = "WRITE_OFF",
                    PerformedBy  = performedBy,
                    Reason       = $"Manual stock adjustment: reduced from {oldStock} to {newStock}",
                    PerformedAt  = DateTime.UtcNow
                });
            }
            else if (newStock > oldStock)
            {
                // Stock increased — record as adjustment (log only, stock already updated)
                await _movementRepo.RecordOnlyAsync(new StockMovement
                {
                    ProductId    = existing.ProductId,
                    Quantity     = newStock - oldStock, // how many units were added
                    MovementType = "ADJUSTMENT",
                    PerformedBy  = performedBy,
                    Reason       = $"Manual stock adjustment: increased from {oldStock} to {newStock}",
                    PerformedAt  = DateTime.UtcNow
                });
            }
            // If newStock == oldStock no movement record is needed

            return Ok(MapToResponse(updated));
        }

        // DELETE api/stock/{id}
        // Permanently deletes a stock record. Restricted to the Admin role.
        // Before deletion, any remaining units are written off via a WRITE_OFF movement
        // so the audit trail is complete and no inventory is silently lost.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // only Admins can remove stock records
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
                await _movementRepo.RecordOnlyAsync(new StockMovement
                {
                    ProductId    = stock.ProductId,
                    Quantity     = stock.CurrentStock, // all remaining units are written off
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
        // Converts a Stock entity to the StockResponseDTO returned by the API.
        // Keeps EF navigation properties (e.g. Product) out of the JSON response.
        private static StockResponseDTO MapToResponse(Stock s) => new()
        {
            StockId = s.StockId,
            ProductId = s.ProductId,
            CurrentStock = s.CurrentStock,
            LastUpdated = s.LastUpdated
        };
    }
}
