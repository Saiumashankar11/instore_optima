using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// DTOs — request/response shapes for the PurchaseOrder resource (POST, PUT, GET /api/purchase-orders).
// A PurchaseOrder is raised against a supplier after an internal ReplenishmentOrder is approved.
namespace instore_optima.Application.DTOs
{
    // DTO 1 - For creating a new purchase order
    public class CreatePurchaseOrderDto
    {
        public int ReplenishmentOrderId { get; set; } // the approved internal replenishment request that spawned this PO
        public int SupplierId { get; set; }           // FK reference — which supplier to send the PO to
        public DateTime IssuedAt { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
    }

    // DTO 2 - For updating purchase order status
    public class UpdatePurchaseOrderDto
    {
        public string Status { get; set; } = string.Empty;
        // Status values: Pending | Delivered | Cancelled
    }

    // DTO 3 - For returning purchase order data in responses
    public class PurchaseOrderResponseDto
    {
        public int PurchaseOrderId { get; set; }
        public int ReplenishmentOrderId { get; set; } // the internal request this PO was raised from
        public int SupplierId { get; set; }
        public DateTime IssuedAt { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
        public string Status { get; set; } = string.Empty; // "Pending", "Delivered", or "Cancelled"
    }
}
