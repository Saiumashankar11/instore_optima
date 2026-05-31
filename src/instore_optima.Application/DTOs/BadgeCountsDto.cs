namespace instore_optima.Application.DTOs
{
    public class BadgeCountsDto
    {
        public int LowStock            { get; set; }
        public int PendingReplenishment { get; set; }
        public int PendingPurchaseOrders { get; set; }
        public int PendingOrders        { get; set; }
        public int PendingPayments      { get; set; }
        public int IssuedInvoices       { get; set; }
    }
}
