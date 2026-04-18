using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReceiptController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReceiptController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Receipts.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(Receipt receipt)
        {
            if (receipt.PaymentId <= 0)
                return BadRequest("PaymentId is required");

            if (!await _context.Payments.AnyAsync(p => p.PaymentId == receipt.PaymentId))
                return BadRequest($"Payment with ID {receipt.PaymentId} not found");

            try
            {
                _context.Receipts.Add(receipt);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = receipt.ReceiptId }, receipt);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.Receipts.FindAsync(id);
            if (data == null) return NotFound();

            _context.Receipts.Remove(data);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
