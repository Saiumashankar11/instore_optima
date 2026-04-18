using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PaymentController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Payments.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(Payment payment)
        {
            if (payment.OrderId <= 0)
                return BadRequest("OrderId is required");

            if (!await _context.Orders.AnyAsync(o => o.OrderId == payment.OrderId))
                return BadRequest($"Order with ID {payment.OrderId} not found");

            try
            {
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = payment.PaymentId }, payment);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Payment payment)
        {
            var existing = await _context.Payments.FindAsync(id);
            if (existing == null) return NotFound();

            existing.PaymentStatus = payment.PaymentStatus;
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.Payments.FindAsync(id);
            if (data == null) return NotFound();

            _context.Payments.Remove(data);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
