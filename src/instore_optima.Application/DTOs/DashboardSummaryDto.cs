namespace instore_optima.Application.DTOs
{
    public class DashboardSummaryDto
    {
        public int Products        { get; set; }
        public int LowStock        { get; set; }
        public int Orders          { get; set; }
        public int TodayOrders     { get; set; }
        public int Suppliers       { get; set; }

        public int ReplenPending   { get; set; }
        public int ReplenApproved  { get; set; }
        public int ReplenRejected  { get; set; }
        public int ReplenFulfilled { get; set; }
        public int ReplenTotal     { get; set; }

        public decimal Revenue     { get; set; }

        public List<RecentOrderDto> RecentOrders { get; set; } = new();
    }

    public class RecentOrderDto
    {
        public int      OrderId     { get; set; }
        public DateTime OrderDate   { get; set; }
        public decimal  TotalAmount { get; set; }
        public string   Status      { get; set; } = string.Empty;
    }
}
