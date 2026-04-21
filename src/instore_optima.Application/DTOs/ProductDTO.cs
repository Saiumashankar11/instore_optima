namespace instore_optima.Application.DTOs
{
	public class ProductCreateDTO
	{
		public string Name { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public decimal Price { get; set; }
		public int MinStock { get; set; }
		public int MaxStock { get; set; }
		public int SupplierId { get; set; }
	}

	public class ProductUpdateDTO
	{
		public string Name { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public decimal Price { get; set; }
		public int MinStock { get; set; }
		public int MaxStock { get; set; }
		public int SupplierId { get; set; }
	}

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