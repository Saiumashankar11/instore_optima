using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// DTOs — request/response shapes for the Invoice resource (POST, PUT, GET /api/invoice).
namespace instore_optima.Application.DTOs
{
    // Request body for POST /api/invoice — raises a new invoice against an existing order.
    public class CreateInvoiceDto
    {
        public int OrderId { get; set; }   // changed from PurchaseOrderId — the customer order being invoiced
        public string InvoiceNumber { get; set; } = string.Empty; // unique reference assigned by the billing team, e.g. "INV-2026-0001"
        public decimal TotalAmount { get; set; }  // full amount including tax
        public decimal TaxAmount { get; set; }    // tax portion of TotalAmount
        public DateTime DueDate { get; set; }     // payment deadline
    }

    // Request body for PUT /api/invoice/{id}/status — updates the invoice lifecycle state.
    public class UpdateInvoiceStatusDto
    {
        public string Status { get; set; } = string.Empty; // e.g. "Issued", "Paid", "Overdue", "Cancelled"
    }

    // Response shape for GET /api/invoice and GET /api/invoice/{id}.
    public class InvoiceResponseDto
    {
        public int InvoiceId { get; set; }
        public int OrderId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public DateTime IssuedDate { get; set; } // set automatically when the invoice is created
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = string.Empty;

        // Payment context — joined from the Payment table for convenience
        public int? PaymentId { get; set; }       // null if no payment has been recorded yet
        public string? PaymentStatus { get; set; } // mirrors Payment.PaymentStatus; null if no payment
        public string? PaymentMethod { get; set; } // mirrors Payment.PaymentMethod; null if no payment
    }
}