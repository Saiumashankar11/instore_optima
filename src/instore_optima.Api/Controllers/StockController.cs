using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;

using instore_optima.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StockController : ControllerBase
    {
        private readonly IStockRepository _repo;

        public StockController(IStockRepository repo)
        {
            _repo = repo;
        }

        // GET api/stock
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var stocks = await _repo.GetAllAsync();
            return Ok(stocks.Select(MapToResponse));
        }

        // GET api/stock/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var s = await _repo.GetByIdAsync(id);
            if (s == null) return NotFound(new { message = $"Stock {id} not found." });
            return Ok(MapToResponse(s));
        }

        // GET api/stock/low
        [HttpGet("low")]
        public async Task<IActionResult> GetLowStock()
        {
            var stocks = await _repo.GetBelowMinStockAsync();
            return Ok(stocks.Select(MapToResponse));
        }

        // POST api/stock
        [HttpPost]
        public async Task<IActionResult> Create(StockCreateDTO dto)
        {
            if (dto.ProductId <= 0)
                return BadRequest(new { message = "ProductId is required." });

            var existing = await _repo.GetByProductIdAsync(dto.ProductId);
            if (existing != null)
                return Conflict(new { message = $"Stock for product {dto.ProductId} already exists." });

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

            if (updated == null) return NotFound(new { message = $"Stock {id} not found." });
            return Ok(MapToResponse(updated));
        }

        // DELETE api/stock/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _repo.DeleteAsync(id);
            if (!result) return NotFound(new { message = $"Stock {id} not found." });
            return Ok(new { message = $"Stock {id} deleted successfully." });
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