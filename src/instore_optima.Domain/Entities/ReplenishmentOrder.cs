using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class ReplenishmentOrder
    {
        public int ReplenishmentOrderId { get; set; }

        public int ProductId { get; set; }

        public int QuantityRequested { get; set; }

        public DateTime GeneratedAt { get; set; }

        public int ApprovedBy { get; set; }

        public DateTime ApprovedAt { get; set; }
        public string Status { get; set; }
    }
}
