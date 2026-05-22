namespace instore_optima.Api.DTOs
{
    public class CreateOrderDto
    {
        public int UserId { get; set; }
        // TotalAmount is always 0 on creation — computed from order items
    }

    public class UpdateOrderDto
    {
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
    }

    public class OrderResponseDto
    {
        public int OrderId { get; set; }
        public int UserId { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public List<OrderItemResponseDto> OrderItems { get; set; } = new();
    }
}