// DTOs — request/response shapes for the Payment resource (POST, PUT, GET /api/payment).
namespace instore_optima.Api.DTOs
{
    // Request body for POST /api/payment — records a new payment transaction against an order.
    public class CreatePaymentDto
    {
        public int OrderId { get; set; }                             // the order being paid for
        public string PaymentMethod { get; set; } = string.Empty;   // e.g. "Cash", "Card", "UPI"
        public string PaymentStatus { get; set; } = "Pending";      // initial status; usually "Pending" until confirmed
    }

    // Request body for PUT /api/payment/{id}/status — moves the payment to a new lifecycle state.
    public class UpdatePaymentStatusDto
    {
        public string PaymentStatus { get; set; } = string.Empty; // e.g. "Completed", "Failed", "Refunded"
    }

    // Response shape for GET /api/payment and GET /api/payment/{id}.
    public class PaymentResponseDto
    {
        public int PaymentId { get; set; }
        public int OrderId { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }

        // Invoice and receipt context — joined from related tables for convenience
        public int? InvoiceId { get; set; }         // null if no invoice has been raised for this payment's order
        public string? InvoiceNumber { get; set; }  // human-readable invoice reference; null if no invoice
        public int? ReceiptId { get; set; }         // null until a receipt is generated after payment completes
    }
}