using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a formal order sent to a supplier to restock a product.
    // A PurchaseOrder is created after a ReplenishmentOrder is approved.
    // Lifecycle: Pending → Delivered (or Cancelled).
    public class PurchaseOrder
    {
        public int PurchaseOrderId { get; set; }

        public int ReplenishmentOrderId { get; set; } // FK → ReplenishmentOrder; the internal request that triggered this PO

        public int SupplierId { get; set; } // FK → Supplier; the vendor the PO is sent to

        public DateTime IssuedAt { get; set; }              // date/time the purchase order was officially issued
        public DateTime ExpectedDeliveryDate { get; set; }  // agreed date by which the supplier should deliver the goods

        public string Status { get; set; } // current state: "Pending", "Delivered", "Cancelled"

        // Set automatically when Status → Delivered
        public string? GrnNumber { get; set; }      // Goods Received Note number e.g. GRN-2026-0001
        public DateTime? DeliveredAt { get; set; }  // actual timestamp when goods arrived; null until delivery is confirmed
    }
}
