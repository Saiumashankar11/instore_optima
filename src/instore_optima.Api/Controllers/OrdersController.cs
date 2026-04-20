using instore_optima.Api.DTOs;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/orders")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;

        public OrdersController(IOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

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
                TotalAmount = o.TotalAmount ?? 0
            });
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderRepository.GetOrderByIdAsync(id);
            if (order == null)
                return NotFound(new { message = $"Order with ID {id} not found." });
            return Ok(new OrderResponseDto
            {
                OrderId = order.OrderId,
                UserId = order.UserId,
                OrderDate = order.OrderDate,
                Status = order.Status,
                TotalAmount = order.TotalAmount ?? 0
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var order = new Orders
            {
                UserId = dto.UserId,
                TotalAmount = dto.TotalAmount
            };
            var created = await _orderRepository.CreateOrderAsync(order);
            return CreatedAtAction(nameof(GetOrderById), new { id = created.OrderId },
                new OrderResponseDto
                {
                    OrderId = created.OrderId,
                    UserId = created.UserId,
                    OrderDate = created.OrderDate,
                    Status = created.Status,
                    TotalAmount = created.TotalAmount ?? 0
                });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, [FromBody] UpdateOrderDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
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
                    TotalAmount = updated.TotalAmount ?? 0
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}