using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a single line item within a customer order.
    // Each row records which product was ordered, how many units, and the unit price at the time of ordering.
    // One Orders record can have many Order_Items (one-to-many relationship).
    public class Order_Items
    {
        public int OrderItemId { get; set; }

        public int OrderId { get; set; }    // FK → Orders; the parent order this item belongs to

        public int ProductId { get; set; }  // FK → Products; which product was ordered

        public int Quantity { get; set; }   // number of units ordered
        public decimal Price { get; set; }  // unit price at the time of the order (snapshot — may differ from current product price)

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Products? Product { get; set; } // navigation property — loaded when fetching order details; omitted from JSON if null
    }
}
