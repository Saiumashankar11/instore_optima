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
    }
}