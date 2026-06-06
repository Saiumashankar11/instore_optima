using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — an internal request to restock a product that has fallen below its minimum level.
    // A ReplenishmentOrder is created (manually or automatically) and must be approved before
    // a PurchaseOrder can be sent to a supplier.
    // Lifecycle: Pending → Approved → (PurchaseOrder created) → Fulfilled, or Rejected.
    public class ReplenishmentOrder
    {
        public int ReplenishmentOrderId { get; set; }
        public int ProductId { get; set; }            // FK → Products; the product that needs restocking
        public int QuantityRequested { get; set; }    // how many units are needed
        public DateTime GeneratedAt { get; set; }     // when the replenishment request was raised

        public int? ApprovedBy { get; set; }      // ← was: int   // FK → User who approved/rejected this request; null if still pending
        public DateTime? ApprovedAt { get; set; } // ← was: DateTime  // timestamp of the approval/rejection decision; null if still pending
        public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Rejected", "Fulfilled"
    }
}
