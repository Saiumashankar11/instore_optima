using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SupplierController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SupplierController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Suppliers.ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null) return NotFound();
            return Ok(supplier);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Supplier supplier)
        {
            var entity = new Supplier
            {
                Name = supplier.Name,
                Contact = supplier.Contact,
                Email = supplier.Email,
                Address = supplier.Address
                // SupplierId is NOT set — SQL Server auto-generates it
            };

            _context.Suppliers.Add(entity);
            await _context.SaveChangesAsync();
            return Ok(entity);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Supplier supplier)
        {
            var existing = await _context.Suppliers.FindAsync(id);
            if (existing == null) return NotFound();

            if (string.IsNullOrWhiteSpace(supplier.Name) || string.IsNullOrWhiteSpace(supplier.Email))
                return BadRequest("Name and Email are required");

            existing.Name = supplier.Name;
            existing.Email = supplier.Email;
            existing.Contact = supplier.Contact;
            existing.Address = supplier.Address;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _context.Suppliers.FindAsync(id);
            if (data == null) return NotFound();

            _context.Suppliers.Remove(data);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
