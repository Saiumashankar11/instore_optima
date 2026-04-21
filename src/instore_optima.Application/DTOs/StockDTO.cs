namespace instore_optima.Application.DTOs
{
	public class StockCreateDTO
	{
		public int ProductId { get; set; }
		public int CurrentStock { get; set; }
	}

	public class StockUpdateDTO
	{
		public int CurrentStock { get; set; }
	}

	public class StockResponseDTO
	{
		public int StockId { get; set; }
		public int ProductId { get; set; }
		public int CurrentStock { get; set; }
		public DateTime LastUpdated { get; set; }
	}
}