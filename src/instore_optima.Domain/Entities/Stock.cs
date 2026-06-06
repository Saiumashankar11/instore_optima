using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — tracks the live on-hand inventory quantity for each product.
    // There is exactly one Stock row per product; it is updated whenever stock moves in or out.
    // For the full history of changes, see StockMovement.
    public class Stock
    {
        public int StockId { get; set; }
        public int ProductId { get; set; }    // FK → Products; one-to-one relationship — each product has one Stock record
        public int CurrentStock { get; set; } // current number of units physically available in the store
        public DateTime LastUpdated { get; set; } // timestamp of the most recent stock change
    }
}
