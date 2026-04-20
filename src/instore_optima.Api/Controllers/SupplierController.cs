using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SupplierController : ControllerBase
    {
        private readonly ISupplierRepository _supplierRepository;

        public SupplierController(ISupplierRepository supplierRepository)
        {
            _supplierRepository = supplierRepository;
        }

        // GET api/supplier
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var suppliers = await _supplierRepository.GetAllSuppliersAsync();
            return Ok(suppliers);
        }

        // GET api/supplier/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var supplier = await _supplierRepository.GetSupplierByIdAsync(id);
            if (supplier == null) return NotFound();
            return Ok(supplier);
        }

        // POST api/supplier
        [HttpPost]
        public async Task<IActionResult> Create(CreateSupplierDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("Name and Email are required");

            var supplier = new instore_optima.Domain.Entities.Supplier
            {
                Name = dto.Name,
                Contact = dto.Contact,
                Email = dto.Email,
                Address = dto.Address
            };

            var created = await _supplierRepository.CreateSupplierAsync(supplier);
            return CreatedAtAction(nameof(GetById), new { id = created.SupplierId }, created);
        }

        // PUT api/supplier/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateSupplierDto dto)
        {
            var existing = await _supplierRepository.GetSupplierByIdAsync(id);
            if (existing == null) return NotFound();

            existing.Name = dto.Name;
            existing.Contact = dto.Contact;
            existing.Email = dto.Email;
            existing.Address = dto.Address;

            var updated = await _supplierRepository.UpdateSupplierAsync(existing);
            return Ok(updated);
        }

        // DELETE api/supplier/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _supplierRepository.GetSupplierByIdAsync(id);
            if (existing == null) return NotFound();

            await _supplierRepository.DeleteSupplierAsync(id);
            return NoContent();
        }
    }
}
