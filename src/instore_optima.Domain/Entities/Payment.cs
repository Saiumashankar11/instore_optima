using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — records a payment transaction made against a customer order.
    // One order typically has one payment record. A Receipt is generated once payment succeeds.
    public class Payment
    {
        public int PaymentId { get; set; }

        public int OrderId { get; set; } // FK → Orders; the order being paid for

        public string PaymentMethod { get; set; } // how the customer paid, e.g. "Cash", "Card", "UPI"
        public string PaymentStatus { get; set; } // e.g. "Pending", "Completed", "Failed", "Refunded"
        public DateTime PaymentDate { get; set; } // date/time the payment was recorded
    }
}
