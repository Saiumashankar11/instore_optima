using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrderItemsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrderItemsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.OrderItems.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(Order_Items item)
        {
            if (item.OrderId <= 0)
                return BadRequest("OrderId is required");

            if (item.ProductId <= 0)
                return BadRequest("ProductId is required");

            if (!await _context.Orders.AnyAsync(o => o.OrderId == item.OrderId))
                return BadRequest($"Order with ID {item.OrderId} not found");

            if (!await _context.Products.AnyAsync(p => p.ProductId == item.ProductId))
                return BadRequest($"Product with ID {item.ProductId} not found");

            try
            {
                _context.OrderItems.Add(item);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = item.OrderItemId }, item);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.OrderItems.FindAsync(id);
            if (data == null) return NotFound();

            _context.OrderItems.Remove(data);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
