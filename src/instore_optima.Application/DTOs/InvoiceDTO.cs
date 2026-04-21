using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Application.DTOs
{
    public class CreateInvoiceDto
    {
        public int OrderId { get; set; }   // changed from PurchaseOrderId
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class UpdateInvoiceStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class InvoiceResponseDto
    {
        public int InvoiceId { get; set; }
        public int OrderId { get; set; }   // changed from PurchaseOrderId
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public DateTime IssuedDate { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}