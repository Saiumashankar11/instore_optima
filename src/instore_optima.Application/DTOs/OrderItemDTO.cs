namespace instore_optima.Api.DTOs
{
    public class CreateOrderItemDto
    {
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        // Price is automatically fetched from the Products table
    }

    public class UpdateOrderItemDto
    {
        public int Quantity { get; set; }
        // Price is derived from product, not editable
    }

    public class OrderItemResponseDto
    {
        public int OrderItemId { get; set; }
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}