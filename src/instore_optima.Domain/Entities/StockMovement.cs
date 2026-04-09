using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class StockMovement
    {
        public int MovementId { get; set; }

        public int ProductId { get; set; }

        public int Quantity { get; set; }
        public string MovementType { get; set; }

        public int PerformedBy { get; set; }

        public DateTime PerformedAt { get; set; }
        public string Reason { get; set; }
    }
}
