using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class Replenishment_Log
    {
        public int LogId { get; set; }

        public int ProductId { get; set; }

        public int SupplierId { get; set; }

        public int PurchaseOrderId { get; set; }

        public int CurrentStock { get; set; }
        public int SuggestedQuantity { get; set; }
        public int QuantityAdded { get; set; }
        public string Status { get; set; }
        public DateTime DateTime { get; set; }
    }
}
