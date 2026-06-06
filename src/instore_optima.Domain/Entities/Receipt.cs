using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a proof-of-payment document generated once a payment is completed.
    // A receipt is linked to a Payment and can be shared with the customer as confirmation.
    public class Receipt
    {
        public int ReceiptId { get; set; }

        public int PaymentId { get; set; } // FK → Payment; the transaction this receipt covers

        public string ReceiptNumber { get; set; } // unique human-readable reference, e.g. "RCP-2026-0001"
        public decimal AmountPaid { get; set; }   // total amount actually paid (should match Payment amount)
        public DateTime PaymentDate { get; set; } // date the payment was made
        public DateTime GeneratedAt { get; set; } // timestamp when this receipt record was created in the system
    }
}
