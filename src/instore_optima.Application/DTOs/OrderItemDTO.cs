// DTOs — request/response shapes for individual line items within an order (POST, PUT /api/order-items).
namespace instore_optima.Api.DTOs
{
    // Request body for POST /api/order-items — adds a product line to an existing order.
    public class CreateOrderItemDto
    {
        public int OrderId { get; set; }    // the order this item belongs to
        public int ProductId { get; set; }  // which product to add
        public int Quantity { get; set; }
        // Price is automatically fetched from the Products table
    }

    // Request body for PUT /api/order-items/{id} — changes how many units are ordered.
    public class UpdateOrderItemDto
    {
        public int Quantity { get; set; }
        // Price is derived from product, not editable
    }

    // Response shape embedded inside OrderResponseDto.OrderItems.
    public class OrderItemResponseDto
    {
        public int OrderItemId { get; set; }
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty; // denormalised from the Products table for display convenience
        public int Quantity { get; set; }
        public decimal Price { get; set; } // unit price snapshotted at the time the item was added to the order
    }
}