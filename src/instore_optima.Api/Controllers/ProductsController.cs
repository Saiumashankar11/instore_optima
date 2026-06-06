// ── ProductsController.cs ─────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/products  (the [controller]
// token in [Route("api/[controller]")] resolves to "products").
//
// Products are the goods that the store sells or stocks. Each product can have
// a minimum and maximum stock threshold, and belongs to a Supplier.
//
// Authentication: no [Authorize] attribute is applied at the controller level,
// so all endpoints here are publicly accessible (or secured elsewhere in the pipeline).
// ─────────────────────────────────────────────────────────────────────────────
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
        // ── Injected repositories ─────────────────────────────────────────────
        private readonly IProductRepository _repo;       // For CRUD on Products.
        private readonly IStockRepository _stockRepo;    // For creating the initial stock record.

        // Constructor — repositories are provided by ASP.NET Core's DI container.
        public ProductsController(IProductRepository repo, IStockRepository stockRepo)
        {
            _repo = repo;
            _stockRepo = stockRepo;
        }

        // ── GET api/products ──────────────────────────────────────────────────
        /// <summary>
        /// GET api/products
        /// Returns every product in the catalogue.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with a list of ProductResponseDTO objects.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _repo.GetAllAsync();

            // Project each domain entity to a DTO so the API response only
            // exposes the fields the client needs (not internal EF navigation props).
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

        // ── GET api/products/{id} ─────────────────────────────────────────────
        /// <summary>
        /// GET api/products/{id}
        /// Returns a single product by its primary key.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with the product, or 404 if not found.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _repo.GetByIdAsync(id);
            if (p == null)
                throw new ResourceNotFoundException("Product", id); // Handled globally → 404 response.

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

        // ── POST api/products ─────────────────────────────────────────────────
        /// <summary>
        /// POST api/products
        /// Creates a new product and immediately creates a matching Stock record
        /// with a CurrentStock of 0 so the product appears in the stock management page.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with the created product.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateProduct(ProductCreateDTO dto)
        {
            // Map the incoming DTO to the domain entity before persisting.
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

            // Automatically create a stock record for the new product
            // This ensures the product appears in the Stock page
            var stock = new Stock
            {
                ProductId = created.ProductId,
                CurrentStock = 0,            // New products start with zero on-hand stock.
                LastUpdated = DateTime.UtcNow
            };
            await _stockRepo.CreateAsync(stock);

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
        /// <summary>
        /// PUT api/products/{id}
        /// Replaces all editable fields of an existing product.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK with the updated product, or 404 if not found.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, ProductUpdateDTO dto)
        {
            // The repository applies the new values and returns the updated entity,
            // or null when the ID doesn't exist.
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
        /// <summary>
        /// DELETE api/products/{id}
        /// Permanently removes a product. Fails with a 409 Conflict if the product
        /// is still referenced by stock records, orders, stock movements, or
        /// replenishment data — protecting database referential integrity.
        /// Auth: none (open endpoint).
        /// Returns: 200 OK on success, 404 if not found, or 409 on a FK constraint.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Product", id);

            // The repository returns false when a foreign-key constraint prevents deletion.
            var result = await _repo.DeleteAsync(id);
            if (!result)
                throw new ConflictException($"Product {id} cannot be deleted because it is referenced by existing stock, orders, stock movements, or replenishment data.");

            return Ok(new { message = $"Product {id} deleted successfully." });
        }
    }
}
