using instore_optima.Api.DTOs;
using instore_optima.Api.Exceptions;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/orderitems")]
    [Authorize]
    /// <summary>
    /// API endpoints for managing order items.
    /// </summary>
    public class OrderItemsController : ControllerBase
    {
        private readonly IOrderItemRepository _orderItemRepository;
        private readonly IOrderRepository _orderRepository;

        public OrderItemsController(
            IOrderItemRepository orderItemRepository,
            IOrderRepository orderRepository)
        {
            _orderItemRepository = orderItemRepository;
            _orderRepository = orderRepository;
        }

        /// <summary>
        /// Gets all order items.
        /// </summary>
        /// <returns>A list of all order items.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAllOrderItems()
        {
            var items = await _orderItemRepository.GetAllOrderItemsAsync();
            var response = items.Select(oi => new OrderItemResponseDto
            {
                OrderItemId = oi.OrderItemId,
                OrderId = oi.OrderId,
                ProductId = oi.ProductId,
                ProductName = oi.Product?.Name ?? string.Empty,
                Quantity = oi.Quantity,
                Price = oi.Price
            });
            return Ok(response);
        }

        /// <summary>
        /// Gets all order items for a specific order.
        /// </summary>
        /// <param name="orderId">The ID of the order to retrieve items for.</param>
        /// <returns>A list of order items for the specified order.</returns>
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetItemsByOrder(int orderId)
        {
            var items = await _orderItemRepository.GetItemsByOrderIdAsync(orderId);
            var response = items.Select(oi => new OrderItemResponseDto
            {
                OrderItemId = oi.OrderItemId,
                OrderId = oi.OrderId,
                ProductId = oi.ProductId,
                ProductName = oi.Product?.Name ?? string.Empty,
                Quantity = oi.Quantity,
                Price = oi.Price
            });
            return Ok(response);
        }

        /// <summary>
        /// Gets a specific order item by its ID.
        /// </summary>
        /// <param name="id">The ID of the order item.</param>
        /// <returns>The order item details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderItemById(int id)
        {
            var orderItem = await _orderItemRepository.GetOrderItemByIdAsync(id);
            if (orderItem == null)
                throw new ResourceNotFoundException("OrderItem", id);

            return Ok(new OrderItemResponseDto
            {
                OrderItemId = orderItem.OrderItemId,
                OrderId = orderItem.OrderId,
                ProductId = orderItem.ProductId,
                ProductName = orderItem.Product?.Name ?? string.Empty,
                Quantity = orderItem.Quantity,
                Price = orderItem.Price
            });
        }

        /// <summary>
        /// Creates a new order item for a given order.
        /// </summary>
        /// <param name="dto">The order item creation data.</param>
        /// <returns>The created order item.</returns>
        [HttpPost]
        public async Task<IActionResult> CreateOrderItem([FromBody] CreateOrderItemDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "orderItem",
                    e => new[] { e.ErrorMessage }));

            var parentOrder = await _orderRepository.GetOrderByIdAsync(dto.OrderId);
            if (parentOrder == null)
                throw new ResourceNotFoundException("Order", dto.OrderId);

            var item = new Order_Items
            {
                OrderId = dto.OrderId,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity,
                Price = dto.Price
            };
            var created = await _orderItemRepository.CreateOrderItemAsync(item);
            return CreatedAtAction(nameof(GetOrderItemById), new { id = created.OrderItemId },
                new OrderItemResponseDto
                {
                    OrderItemId = created.OrderItemId,
                    OrderId = created.OrderId,
                    ProductId = created.ProductId,
                    ProductName = created.Product?.Name ?? string.Empty,
                    Quantity = created.Quantity,
                    Price = created.Price
                });
        }

        /// <summary>
        /// Updates an existing order item.
        /// </summary>
        /// <param name="id">The ID of the order item to update.</param>
        /// <param name="dto">The updated order item data.</param>
        /// <returns>The updated order item if successful; otherwise, NotFound.</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrderItem(int id, [FromBody] UpdateOrderItemDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "orderItem",
                    e => new[] { e.ErrorMessage }));

            try
            {
                var updated = await _orderItemRepository.UpdateOrderItemAsync(new Order_Items
                {
                    OrderItemId = id,
                    Quantity = dto.Quantity,
                    Price = dto.Price
                });
                return Ok(new OrderItemResponseDto
                {
                    OrderItemId = updated.OrderItemId,
                    OrderId = updated.OrderId,
                    ProductId = updated.ProductId,
                    ProductName = updated.Product?.Name ?? string.Empty,
                    Quantity = updated.Quantity,
                    Price = updated.Price
                });
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("OrderItem", id);
            }
        }

        /// <summary>
        /// Deletes an order item by its ID.
        /// </summary>
        /// <param name="id">The ID of the order item to delete.</param>
        /// <returns>No content if successful; otherwise, NotFound.</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrderItem(int id)
        {
            try
            {
                await _orderItemRepository.DeleteOrderItemAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("OrderItem", id);
            }
        }
    }
}