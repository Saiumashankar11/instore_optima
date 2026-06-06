// ── SupplierController.cs ─────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/supplier
// (the [controller] token resolves to "Supplier").
//
// Suppliers are the vendors that provide products to the store.  Each Supplier
// can be linked to Products and Purchase Orders.  Deleting a supplier that is
// still referenced by those records will return a 409 Conflict.
//
// Authentication: no controller-level [Authorize] is applied; all endpoints
// here are accessible without authentication (or secured at the reverse-proxy level).
// ─────────────────────────────────────────────────────────────────────────────
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
        // ── Injected repository ───────────────────────────────────────────────
        private readonly ISupplierRepository _supplierRepository; // All DB operations for Supplier entities.

        // Constructor — the repository is provided by ASP.NET Core's DI container.
        public SupplierController(ISupplierRepository supplierRepository)
        {
            _supplierRepository = supplierRepository;
        }


        // ── GET api/supplier ──────────────────────────────────────────────────
        /// <summary>
        /// GET api/supplier
        /// Returns every supplier in the system.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with a list of Supplier objects.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var suppliers = await _supplierRepository.GetAllSuppliersAsync();
            return Ok(suppliers);
        }


        // ── GET api/supplier/{id} ─────────────────────────────────────────────
        /// <summary>
        /// GET api/supplier/{id}
        /// Returns a single supplier by its primary key.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with the supplier, or 404 if not found.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var supplier = await _supplierRepository.GetSupplierByIdAsync(id);
            if (supplier == null)
                throw new ResourceNotFoundException("Supplier", id); // Global handler → 404.

            return Ok(supplier);
        }


        // ── POST api/supplier ─────────────────────────────────────────────────
        /// <summary>
        /// POST api/supplier
        /// Creates a new supplier.
        /// Auth: none (open endpoint).
        /// Returns: 201 Created with the new supplier.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create(CreateSupplierDto dto)
        {
            // Map the DTO to the domain entity before persisting.
            var entity = new Supplier
            {
                Name = dto.Name,
                Contact = dto.Contact,
                Email = dto.Email,
                Address = dto.Address
            };
            var created = await _supplierRepository.CreateSupplierAsync(entity);
            // 201 Created — Location header points to GET api/supplier/{id}.
            return CreatedAtAction(nameof(GetById), new { id = created.SupplierId }, created);
        }

        // ── PUT api/supplier/{id} ─────────────────────────────────────────────
        /// <summary>
        /// PUT api/supplier/{id}
        /// Replaces all editable fields of an existing supplier.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with the updated supplier, or 404 if not found.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateSupplierDto dto)
        {
            // Verify the supplier exists before applying changes.
            var existing = await _supplierRepository.GetSupplierByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Supplier", id);

            // Apply the updated field values onto the tracked entity.
            existing.Name = dto.Name;
            existing.Contact = dto.Contact;
            existing.Email = dto.Email;
            existing.Address = dto.Address;

            var updated = await _supplierRepository.UpdateSupplierAsync(existing);
            return Ok(updated);
        }

        // ── DELETE api/supplier/{id} ──────────────────────────────────────────
        /// <summary>
        /// DELETE api/supplier/{id}
        /// Permanently removes a supplier. Fails with a 409 Conflict if the
        /// supplier is still referenced by products, purchase orders, or
        /// replenishment logs — protecting database referential integrity.
        /// Auth: none (open endpoint).
        /// Returns: 204 No Content on success, 404 if not found, or 409 on a FK constraint.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _supplierRepository.GetSupplierByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Supplier", id);

            // The repository returns false when a foreign-key constraint prevents deletion.
            var deleted = await _supplierRepository.DeleteSupplierAsync(id);
            if (!deleted)
                throw new ConflictException($"Supplier {id} cannot be deleted because it is referenced by existing products, purchase orders, or replenishment logs.");

            return NoContent(); // 204 — successful delete, no body needed.
        }
    }
}

