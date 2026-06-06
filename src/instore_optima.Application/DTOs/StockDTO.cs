// DTOs — request/response shapes for the Stock resource (POST, PUT, GET /api/stock).
// Stock tracks the current on-hand quantity for each product.
// For a history of changes, use the StockMovement endpoints instead.
namespace instore_optima.Application.DTOs
{
	// Request body for POST /api/stock — creates the initial stock record for a product.
	public class StockCreateDTO
	{
		public int ProductId { get; set; }    // FK reference — which product's inventory this row tracks
		public int CurrentStock { get; set; } // starting quantity (units) at the time of creation
	}

	// Request body for PUT /api/stock/{id} — directly sets the stock quantity (e.g. after a manual count).
	public class StockUpdateDTO
	{
		public int CurrentStock { get; set; } // new on-hand quantity
	}

	// Response shape for GET /api/stock and GET /api/stock/{id}.
	public class StockResponseDTO
	{
		public int StockId { get; set; }
		public int ProductId { get; set; }
		public int CurrentStock { get; set; }     // current units available in the store
		public DateTime LastUpdated { get; set; } // when the stock level was last changed
	}
}