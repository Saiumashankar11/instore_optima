using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// DTOs — request/response shapes for the Receipt resource (POST, PUT, GET /api/receipt).
// A receipt is proof-of-payment issued after a payment is completed.
namespace instore_optima.Application.DTOs
{
    // POST /api/receipt request body
    public class CreateReceiptDto
    {
        public int PaymentId { get; set; }                        // FK reference — the payment this receipt covers
        public string ReceiptNumber { get; set; } = string.Empty; // unique human-readable reference, e.g. "RCP-2026-0001"
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    // PUT /api/receipt/{id} request body — allows correcting receipt details after creation.
    public class UpdateReceiptDto
    {
        public string ReceiptNumber { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    // GET response body
    public class ReceiptResponseDto
    {
        public int ReceiptId { get; set; }
        public int PaymentId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }
        public DateTime GeneratedAt { get; set; } // when the receipt record was created in the system

        // Order and invoice context — joined from related tables for convenience
        public int? OrderId { get; set; }           // the order the original payment was for; null if not linked
        public string? InvoiceNumber { get; set; }  // invoice reference for this transaction; null if no invoice exists
    }
}