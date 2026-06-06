using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — an audit trail entry for every change to a product's stock level.
    // Every time stock increases (goods received) or decreases (sale, damage, correction),
    // a new StockMovement row is appended. The current total is stored in the Stock table.
    public class StockMovement
    {
        public int MovementId { get; set; }

        public int ProductId { get; set; } // FK → Products; which product's stock changed

        public int Quantity { get; set; }           // number of units involved in this movement (always positive; direction is encoded in MovementType)
        public string MovementType { get; set; }    // direction/category of the change: "IN" (stock added), "OUT" (stock removed), "ADJUSTMENT" (manual correction)

        public int PerformedBy { get; set; } // FK → User who recorded this stock movement

        public DateTime PerformedAt { get; set; } // when the movement was recorded
        public string Reason { get; set; }         // free-text explanation, e.g. "Goods received from supplier", "Damaged goods", "Cycle count correction"
    }
}
