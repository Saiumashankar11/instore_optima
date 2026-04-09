using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    public class Receipt
    {
        public int ReceiptId { get; set; }

        public int PaymentId { get; set; }

        public string ReceiptNumber { get; set; }
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}
