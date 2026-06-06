using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — an immutable historical record of each replenishment event.
    // Written when a purchase order is delivered and stock is updated.
    // Useful for auditing the supply chain: what was ordered, what arrived, and when.
    public class Replenishment_Log
    {
        public int LogId { get; set; }

        public int ProductId { get; set; }      // FK → Products; the product that was restocked

        public int SupplierId { get; set; }     // FK → Supplier; the vendor who fulfilled this replenishment

        public int PurchaseOrderId { get; set; } // FK → PurchaseOrder; the PO that resulted in this stock addition

        public int CurrentStock { get; set; }       // stock level immediately BEFORE this replenishment was applied
        public int SuggestedQuantity { get; set; }  // quantity recommended by the replenishment rule or system
        public int QuantityAdded { get; set; }      // actual units added to stock (may differ from suggested)
        public string Status { get; set; }          // outcome of this replenishment event, e.g. "Completed", "PartiallyFulfilled"
        public DateTime DateTime { get; set; }      // date/time when stock was updated
    }
}
