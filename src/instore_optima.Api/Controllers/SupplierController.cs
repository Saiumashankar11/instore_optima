using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using instore_optima.Api.Exceptions;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    /// <summary>
    /// API endpoints for managing suppliers.
    /// </summary>
    public class SupplierController : ControllerBase
    {
        private readonly ISupplierRepository _supplierRepository;

        public SupplierController(ISupplierRepository supplierRepository)
        {
            _supplierRepository = supplierRepository;
        }


        /// <summary>
        /// Gets all suppliers.
        /// </summary>
        /// <returns>List of suppliers.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var suppliers = await _supplierRepository.GetAllSuppliersAsync();
            return Ok(suppliers);
        }


        /// <summary>
        /// Gets a supplier by ID.
        /// </summary>
        /// <param name="id">Supplier ID.</param>
        /// <returns>Supplier details.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var supplier = await _supplierRepository.GetSupplierByIdAsync(id);
            if (supplier == null)
                throw new ResourceNotFoundException("Supplier", id);

            return Ok(supplier);
        }


        /// <summary>
        /// Creates a new supplier.
        /// </summary>
        /// <param name="dto">Supplier creation data.</param>
        /// <returns>The created supplier.</returns>
        [HttpPost]
        public async Task<IActionResult> Create(CreateSupplierDto dto)
        {
            var entity = new Supplier
            {
                Name = dto.Name,
                Contact = dto.Contact,
                Email = dto.Email,
                Address = dto.Address
            };
            var created = await _supplierRepository.CreateSupplierAsync(entity);
            return CreatedAtAction(nameof(GetById), new { id = created.SupplierId }, created);
        }

        /// <summary>
        /// Updates an existing supplier.
        /// </summary>
        /// <param name="id">Supplier ID.</param>
        /// <param name="dto">Supplier update data.</param>
        /// <returns>The updated supplier.</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateSupplierDto dto)
        {
            var existing = await _supplierRepository.GetSupplierByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Supplier", id);

            existing.Name = dto.Name;
            existing.Contact = dto.Contact;
            existing.Email = dto.Email;
            existing.Address = dto.Address;

            var updated = await _supplierRepository.UpdateSupplierAsync(existing);
            return Ok(updated);
        }

        /// <summary>
        /// Deletes a supplier by ID.
        /// </summary>
        /// <param name="id">Supplier ID.</param>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _supplierRepository.GetSupplierByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Supplier", id);

            var deleted = await _supplierRepository.DeleteSupplierAsync(id);
            if (!deleted)
                throw new ConflictException($"Supplier {id} cannot be deleted because it is referenced by existing products, purchase orders, or replenishment logs.");

            return NoContent();
        }
    }
}
