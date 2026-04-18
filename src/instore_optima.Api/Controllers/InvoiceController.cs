using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoiceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InvoiceController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Invoices.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(Invoice invoice)
        {
            if (invoice.OrderId <= 0)
                return BadRequest("OrderId is required");

            if (!await _context.Orders.AnyAsync(o => o.OrderId == invoice.OrderId))
                return BadRequest($"Order with ID {invoice.OrderId} not found");

            try
            {
                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = invoice.InvoiceId }, invoice);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.Invoices.FindAsync(id);
            if (data == null) return NotFound();

            _context.Invoices.Remove(data);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
