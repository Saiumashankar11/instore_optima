using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Application.DTOs
{
    // POST /api/receipt request body
    public class CreateReceiptDto
    {
        public int PaymentId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    // PUT /api/receipt/{id} request body
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
        public DateTime GeneratedAt { get; set; }
    }
}