using instore_optima.Api.DTOs;
using instore_optima.Api.Exceptions;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/orders")]
    [Authorize]
    /// <summary>
    /// API endpoints for managing orders.
    /// </summary>
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;

        public OrdersController(IOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        /// <summary>
        /// Gets all orders in the system.
        /// </summary>
        /// <returns>A list of all orders.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderRepository.GetAllOrdersAsync();
            var response = orders.Select(o => new OrderResponseDto
            {
                OrderId = o.OrderId,
                UserId = o.UserId,
                OrderDate = o.OrderDate,
                Status = o.Status,
                TotalAmount = o.TotalAmount ?? 0,
                OrderItems = o.OrderItems?.Select(oi => new OrderItemResponseDto
                {
                    OrderItemId = oi.OrderItemId,
                    OrderId = oi.OrderId,
                    ProductId = oi.ProductId,
                    ProductName = oi.Product?.Name ?? string.Empty,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList() ?? new()
            });
            return Ok(response);
        }

        /// <summary>
        /// Gets a specific order by its ID.
        /// </summary>
        /// <param name="id">The ID of the order.</param>
        /// <returns>The order details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderRepository.GetOrderByIdAsync(id);
            if (order == null)
                throw new ResourceNotFoundException("Order", id);

            return Ok(new OrderResponseDto
            {
                OrderId = order.OrderId,
                UserId = order.UserId,
                OrderDate = order.OrderDate,
                Status = order.Status,
                TotalAmount = order.TotalAmount ?? 0,
                OrderItems = order.OrderItems?.Select(oi => new OrderItemResponseDto
                {
                    OrderItemId = oi.OrderItemId,
                    OrderId = oi.OrderId,
                    ProductId = oi.ProductId,
                    ProductName = oi.Product?.Name ?? string.Empty,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList() ?? new()
            });
        }

        /// <summary>
        /// Creates a new order.
        /// </summary>
        /// <param name="dto">The order creation data.</param>
        /// <returns>The created order.</returns>
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "order",
                    e => new[] { e.ErrorMessage }));

            var order = new Orders
            {
                UserId = dto.UserId
                // TotalAmount starts at 0, set in repository
            };
            var created = await _orderRepository.CreateOrderAsync(order);
            return CreatedAtAction(nameof(GetOrderById), new { id = created.OrderId },
                new OrderResponseDto
                {
                    OrderId = created.OrderId,
                    UserId = created.UserId,
                    OrderDate = created.OrderDate,
                    Status = created.Status,
                    TotalAmount = created.TotalAmount ?? 0,
                    OrderItems = new()
                });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, [FromBody] UpdateOrderDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "order",
                    e => new[] { e.ErrorMessage }));

            try
            {
                var updated = await _orderRepository.UpdateOrderAsync(new Orders
                {
                    OrderId = id,
                    Status = dto.Status,
                    TotalAmount = dto.TotalAmount
                });
                return Ok(new OrderResponseDto
                {
                    OrderId = updated.OrderId,
                    UserId = updated.UserId,
                    OrderDate = updated.OrderDate,
                    Status = updated.Status,
                    TotalAmount = updated.TotalAmount ?? 0,
                    OrderItems = updated.OrderItems?.Select(oi => new OrderItemResponseDto
                    {
                        OrderItemId = oi.OrderItemId,
                        OrderId = oi.OrderId,
                        ProductId = oi.ProductId,
                        ProductName = oi.Product?.Name ?? string.Empty,
                        Quantity = oi.Quantity,
                        Price = oi.Price
                    }).ToList() ?? new()
                });
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("Order", id);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            try
            {
                await _orderRepository.DeleteOrderAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("Order", id);
            }
        }
    }
}