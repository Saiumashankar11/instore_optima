using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StockMovementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StockMovementController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.StockMovements.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(StockMovement movement)
        {
            if (movement.ProductId <= 0)
                return BadRequest("ProductId is required");

            if (movement.PerformedBy <= 0)
                return BadRequest("PerformedBy (User) is required");

            if (!await _context.Products.AnyAsync(p => p.ProductId == movement.ProductId))
                return BadRequest($"Product with ID {movement.ProductId} not found");

            if (!await _context.Users.AnyAsync(u => u.UserId == movement.PerformedBy))
                return BadRequest($"User with ID {movement.PerformedBy} not found");

            try
            {
                movement.PerformedAt = DateTime.Now;
                _context.StockMovements.Add(movement);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = movement.MovementId }, movement);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }
    }
}
