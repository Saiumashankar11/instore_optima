namespace instore_optima.Application.DTOs
{
	public class StockMovementCreateDTO
	{
		public int ProductId { get; set; }
		public int Quantity { get; set; }
		public string MovementType { get; set; } = string.Empty;  // IN | OUT | ADJUSTMENT
		public int PerformedBy { get; set; }
		public string Reason { get; set; } = string.Empty;
	}

	public class StockMovementUpdateDTO
	{
		public string Reason { get; set; } = string.Empty;
	}

	public class StockMovementResponseDTO
	{
		public int MovementId { get; set; }
		public int ProductId { get; set; }
		public int Quantity { get; set; }
		public string MovementType { get; set; } = string.Empty;
		public int PerformedBy { get; set; }
		public DateTime PerformedAt { get; set; }
		public string Reason { get; set; } = string.Empty;
	}
}