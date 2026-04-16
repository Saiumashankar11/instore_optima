using System;   
namespace Application.DTOs.PaymentDTOs
{
    public class PaymentUpdateDto
    {
        public decimal Price { get; set; }

        public string PaymentMethod { get; set; } = string.Empty;

        public string PaymentStatus { get; set; } = string.Empty;
    }
}