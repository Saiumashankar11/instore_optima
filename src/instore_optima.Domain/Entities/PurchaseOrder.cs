using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class PurchaseOrder
    {
        public int PurchaseOrderId { get; set; }

        public int ReplenishmentOrderId { get; set; }

        public int SupplierId { get; set; }

        public DateTime IssuedAt { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }

        public string Status { get; set; }
    }
}
