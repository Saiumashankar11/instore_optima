using instore_optima.Api.DTOs;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/orderitems")]
    [Authorize]
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

        [HttpGet]
        public async Task<IActionResult> GetItemsByOrder([FromQuery] int orderId)
        {
            var items = await _orderItemRepository.GetItemsByOrderIdAsync(orderId);
            var response = items.Select(oi => new OrderItemResponseDto
            {
                OrderItemId = oi.OrderItemId,
                OrderId = oi.OrderId,
                ProductId = oi.ProductId,
                Quantity = oi.Quantity,
                Price = oi.Price
            });
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderItemById(int id)
        {
            var item = await _orderItemRepository.GetOrderItemByIdAsync(id);
            if (item == null)
                return NotFound(new { message = $"OrderItem with ID {id} not found." });
            return Ok(new OrderItemResponseDto
            {
                OrderItemId = item.OrderItemId,
                OrderId = item.OrderId,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                Price = item.Price
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrderItem([FromBody] CreateOrderItemDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var parentOrder = await _orderRepository.GetOrderByIdAsync(dto.OrderId);
            if (parentOrder == null)
                return NotFound(new { message = $"Order with ID {dto.OrderId} not found." });
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
                    Quantity = created.Quantity,
                    Price = created.Price
                });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrderItem(int id, [FromBody] UpdateOrderItemDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
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
                    Quantity = updated.Quantity,
                    Price = updated.Price
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrderItem(int id)
        {
            try
            {
                await _orderItemRepository.DeleteOrderItemAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}