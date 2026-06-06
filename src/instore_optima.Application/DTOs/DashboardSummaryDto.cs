// DTO — aggregated statistics returned by the dashboard summary endpoint (GET /api/dashboard/summary).
// Populated by a single server-side query so the frontend can render all KPI tiles in one round-trip.
namespace instore_optima.Application.DTOs
{
    public class DashboardSummaryDto
    {
        public int Products        { get; set; } // total number of products in the catalogue
        public int LowStock        { get; set; } // products whose CurrentStock < MinStock (need attention)
        public int Orders          { get; set; } // total customer orders ever placed
        public int TodayOrders     { get; set; } // orders placed on the current calendar day (IST)
        public int Suppliers       { get; set; } // total registered suppliers

        // Replenishment order counts broken down by status
        public int ReplenPending   { get; set; } // awaiting manager approval
        public int ReplenApproved  { get; set; } // approved but purchase order not yet fulfilled
        public int ReplenRejected  { get; set; } // rejected by manager
        public int ReplenFulfilled { get; set; } // stock has been received
        public int ReplenTotal     { get; set; } // sum of all replenishment orders regardless of status

        public decimal Revenue     { get; set; } // total revenue from all completed/paid orders (sum of TotalAmount)

        public List<RecentOrderDto> RecentOrders { get; set; } = new(); // last N orders for the "Recent Orders" table on the dashboard
    }

    // Lightweight order summary used inside DashboardSummaryDto.RecentOrders.
    public class RecentOrderDto
    {
        public int      OrderId     { get; set; }
        public DateTime OrderDate   { get; set; }
        public decimal  TotalAmount { get; set; }
        public string   Status      { get; set; } = string.Empty; // e.g. "Pending", "Delivered", "Cancelled"
    }
}
