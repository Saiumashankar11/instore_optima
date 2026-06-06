using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — represents a customer's purchase order placed in the store.
    // An order groups together one or more products (Order_Items) bought in a single transaction.
    // Lifecycle: Pending → Confirmed → Shipped → Delivered (or Cancelled).
    public class Orders
    {
        public int OrderId { get; set; }
        public int UserId { get; set; }             // FK → User who placed the order
        public DateTime OrderDate { get; set; }     // when the order was created
        public string Status { get; set; }          // current state, e.g. "Pending", "Confirmed", "Delivered", "Cancelled"
        public decimal? TotalAmount { get; set; }   // sum of all line-item totals; computed from OrderItems; nullable until calculated

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public ICollection<Order_Items>? OrderItems { get; set; } // navigation property — the list of products in this order; omitted from JSON if null
    }
}
