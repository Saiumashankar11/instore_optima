// DTO — API response shape for the navigation badge counters shown in the sidebar/header.
// Each property is a count that drives a red/orange notification badge on the corresponding menu item.
// Fetched once on page load and can be polled periodically to keep counts up to date.
namespace instore_optima.Application.DTOs
{
    public class BadgeCountsDto
    {
        public int LowStock             { get; set; } // products whose CurrentStock < MinStock
        public int PendingReplenishment { get; set; } // replenishment orders still awaiting approval
        public int PendingPurchaseOrders { get; set; } // purchase orders sent to suppliers but not yet delivered
        public int PendingOrders        { get; set; } // customer orders not yet confirmed or fulfilled
        public int PendingPayments      { get; set; } // payments whose status is still "Pending"
        public int IssuedInvoices       { get; set; } // invoices with status "Issued" (awaiting payment)
    }
}
