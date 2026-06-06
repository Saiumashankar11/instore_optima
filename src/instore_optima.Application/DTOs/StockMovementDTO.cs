// DTOs — request/response shapes for the StockMovement resource (POST, PUT, GET /api/stock-movements).
// Each movement is an immutable record of a stock change event (goods in, goods out, manual correction).
namespace instore_optima.Application.DTOs
{
	// Request body for POST /api/stock-movements — records a new stock change event.
	public class StockMovementCreateDTO
	{
		public int ProductId { get; set; }
		public int Quantity { get; set; }                                 // number of units involved (always positive)
		public string MovementType { get; set; } = string.Empty;  // IN | OUT | ADJUSTMENT
		public int PerformedBy { get; set; }                              // FK reference — UserId of the person recording this movement
		public string Reason { get; set; } = string.Empty;               // e.g. "Goods received", "Sold", "Damaged", "Cycle count"
	}

	// Request body for PUT /api/stock-movements/{id} — only the reason text can be corrected after creation.
	public class StockMovementUpdateDTO
	{
		public string Reason { get; set; } = string.Empty;
	}

	// Response shape for GET /api/stock-movements and GET /api/stock-movements/{id}.
	public class StockMovementResponseDTO
	{
		public int MovementId { get; set; }
		public int ProductId { get; set; }
		public int Quantity { get; set; }
		public string MovementType { get; set; } = string.Empty; // "IN", "OUT", or "ADJUSTMENT"
		public int PerformedBy { get; set; }                     // UserId of who recorded the movement
		public DateTime PerformedAt { get; set; }                // when the movement was logged
		public string Reason { get; set; } = string.Empty;
	}
}