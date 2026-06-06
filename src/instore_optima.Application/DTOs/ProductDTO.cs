// DTOs — request/response shapes for the Product resource (POST, PUT, GET /api/products).
namespace instore_optima.Application.DTOs
{
	// Request body for POST /api/products — registers a new product in the catalogue.
	public class ProductCreateDTO
	{
		public string Name { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public decimal Price { get; set; }      // selling price per unit
		public int MinStock { get; set; }       // low-stock alert threshold; replenishment is triggered when CurrentStock falls below this
		public int MaxStock { get; set; }       // maximum units to hold; replenishment orders should not exceed this level
		public int SupplierId { get; set; }     // FK reference — which supplier provides this product
	}

	// Request body for PUT /api/products/{id} — updates an existing product's details.
	public class ProductUpdateDTO
	{
		public string Name { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public decimal Price { get; set; }
		public int MinStock { get; set; }
		public int MaxStock { get; set; }
		public int SupplierId { get; set; }
	}

	// Response shape for GET /api/products and GET /api/products/{id}.
	public class ProductResponseDTO
	{
		public int ProductId { get; set; }
		public string Name { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public decimal Price { get; set; }
		public int MinStock { get; set; }
		public int MaxStock { get; set; }
		public int SupplierId { get; set; }
	}
}