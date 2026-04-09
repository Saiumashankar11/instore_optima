using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseOrderController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PurchaseOrderController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.PurchaseOrders.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(PurchaseOrder po)
        {
            if (po.SupplierId <= 0)
                return BadRequest("SupplierId is required");

            if (!await _context.Suppliers.AnyAsync(s => s.SupplierId == po.SupplierId))
                return BadRequest($"Supplier with ID {po.SupplierId} not found");

            try
            {
                _context.PurchaseOrders.Add(po);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetAll), new { id = po.PurchaseOrderId }, po);
            }
            catch (DbUpdateException ex)
            {
                return BadRequest("Error: " + ex.InnerException?.Message);
            }
        }
    }
}
