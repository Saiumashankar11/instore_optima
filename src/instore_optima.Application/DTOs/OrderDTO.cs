// DTOs — request/response shapes for the Orders resource (POST, PUT, GET /api/orders).
namespace instore_optima.Api.DTOs
{
    // Request body for POST /api/orders — opens a new empty order for a user.
    // Items are added separately via the OrderItems endpoint.
    public class CreateOrderDto
    {
        public int UserId { get; set; } // FK reference — which user is placing this order
        // TotalAmount is always 0 on creation — computed from order items
    }

    // Request body for PUT /api/orders/{id} — updates the order status or recalculates the total.
    public class UpdateOrderDto
    {
        public string Status { get; set; } = string.Empty; // e.g. "Confirmed", "Shipped", "Delivered", "Cancelled"
        public decimal TotalAmount { get; set; }            // recalculated sum of all line items
    }

    // Response shape for GET /api/orders and GET /api/orders/{id}.
    public class OrderResponseDto
    {
        public int OrderId { get; set; }
        public int UserId { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public List<OrderItemResponseDto> OrderItems { get; set; } = new(); // embedded line items — each is an OrderItemResponseDto
    }
}