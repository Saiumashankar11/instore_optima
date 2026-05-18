namespace instore_optima.Api.DTOs
{
    public class CreatePaymentDto
    {
        public int OrderId { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = "Pending";
    }

    public class UpdatePaymentStatusDto
    {
        public string PaymentStatus { get; set; } = string.Empty;
    }

    public class PaymentResponseDto
    {
        public int PaymentId { get; set; }
        public int OrderId { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }

        // Invoice and receipt context
        public int? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public int? ReceiptId { get; set; }
    }
}