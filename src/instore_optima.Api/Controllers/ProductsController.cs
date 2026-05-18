using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Interfaces;
using instore_optima.Application.DTOs;
using instore_optima.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    /// <summary>
    /// API endpoints for managing products.
    /// </summary>
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _repo;

        public ProductsController(IProductRepository repo)
        {
            _repo = repo;
        }

        /// <summary>
        /// Gets all products in the system.
        /// </summary>
        /// <returns>A list of all products.</returns>
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _repo.GetAllAsync();

            var response = products.Select(p => new ProductResponseDTO
            {
                ProductId = p.ProductId,
                Name = p.Name,
                Description = p.Description,
                Price = p.Price,
                MinStock = p.MinStock,
                MaxStock = p.MaxStock,
                SupplierId = p.SupplierId
            });

            return Ok(response);
        }

        /// <summary>
        /// Gets a specific product by its ID.
        /// </summary>
        /// <param name="id">The ID of the product.</param>
        /// <returns>The product details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _repo.GetByIdAsync(id);
            if (p == null)
                throw new ResourceNotFoundException("Product", id);

            return Ok(new ProductResponseDTO
            {
                ProductId = p.ProductId,
                Name = p.Name,
                Description = p.Description,
                Price = p.Price,
                MinStock = p.MinStock,
                MaxStock = p.MaxStock,
                SupplierId = p.SupplierId
            });
        }

        /// <summary>
        /// Creates a new product.
        /// </summary>
        /// <param name="dto">The product creation data.</param>
        /// <returns>The created product.</returns>
        [HttpPost]
        public async Task<IActionResult> CreateProduct(ProductCreateDTO dto)
        {
            var entity = new Products
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                MinStock = dto.MinStock,
                MaxStock = dto.MaxStock,
                SupplierId = dto.SupplierId
            };

            var created = await _repo.CreateAsync(entity);

            return Ok(new ProductResponseDTO
            {
                ProductId = created.ProductId,
                Name = created.Name,
                Description = created.Description,
                Price = created.Price,
                MinStock = created.MinStock,
                MaxStock = created.MaxStock,
                SupplierId = created.SupplierId
            });
        }

        // PUT api/products/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, ProductUpdateDTO dto)
        {
            var updated = await _repo.UpdateAsync(id, new Products
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                MinStock = dto.MinStock,
                MaxStock = dto.MaxStock,
                SupplierId = dto.SupplierId
            });

            if (updated == null)
                throw new ResourceNotFoundException("Product", id);

            return Ok(new ProductResponseDTO
            {
                ProductId = updated.ProductId,
                Name = updated.Name,
                Description = updated.Description,
                Price = updated.Price,
                MinStock = updated.MinStock,
                MaxStock = updated.MaxStock,
                SupplierId = updated.SupplierId
            });
        }

        // DELETE api/products/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Product", id);

            var result = await _repo.DeleteAsync(id);
            if (!result)
                throw new ConflictException($"Product {id} cannot be deleted because it is referenced by existing stock, orders, stock movements, or replenishment data.");

            return Ok(new { message = $"Product {id} deleted successfully." });
        }
    }
}