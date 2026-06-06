using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a formal billing document generated after a customer places an order.
    // One invoice corresponds to one order. It tracks the amount owed, tax applied, and payment deadline.
    public class Invoice
    {
        public int InvoiceId { get; set; }

        public int OrderId { get; set; } // FK → Orders; the order this invoice was raised for

        public string InvoiceNumber { get; set; } // human-readable reference, e.g. "INV-2026-0001"
        public decimal TotalAmount { get; set; }  // full amount the customer must pay (including tax)
        public decimal TaxAmount { get; set; }    // portion of TotalAmount that is tax
        public DateTime IssuedDate { get; set; }  // date the invoice was created
        public DateTime DueDate { get; set; }     // deadline by which payment must be received
        public string Status { get; set; }        // e.g. "Issued", "Paid", "Overdue", "Cancelled"
    }
}
