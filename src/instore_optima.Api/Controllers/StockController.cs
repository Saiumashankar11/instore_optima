using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StockController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StockController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Stocks.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(Stock stock)
        {
            if (stock.ProductId <= 0)
                return BadRequest("ProductId is required");

            if (!await _context.Products.AnyAsync(p => p.ProductId == stock.ProductId))
                return BadRequest($"Product with ID {stock.ProductId} not found");

            try
            {
                _context.Stocks.Add(stock);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = stock.StockId }, stock);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Stock stock)
        {
            var existing = await _context.Stocks.FindAsync(id);
            if (existing == null) return NotFound();

            existing.CurrentStock = stock.CurrentStock;
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.Stocks.FindAsync(id);
            if (data == null) return NotFound();

            _context.Stocks.Remove(data);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
