// ── OrdersController ──────────────────────────────────────────────────────────
// Manages customer orders under /api/orders.
// An order is the top-level record; it contains one or more OrderItems (line items).
// All endpoints require a valid JWT (controller-level [Authorize]).
// ─────────────────────────────────────────────────────────────────────────────

// DTOs, exception helpers, repository interfaces, and domain entities
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
    [Authorize] // all endpoints require a valid JWT
    /// <summary>
    /// API endpoints for managing orders.
    /// </summary>
    public class OrdersController : ControllerBase
    {
        // _orderRepository — all order-level CRUD operations
        private readonly IOrderRepository _orderRepository;

        public OrdersController(IOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        /// <summary>
        /// Gets all orders in the system.
        /// </summary>
        /// <returns>A list of all orders.</returns>
        // GET /api/orders
        // Returns every order including its nested OrderItems. TotalAmount defaults to 0
        // if not yet calculated (e.g. an empty draft order).
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderRepository.GetAllOrdersAsync();
            // Project each order entity to the response DTO, including its line items
            var response = orders.Select(o => new OrderResponseDto
            {
                OrderId = o.OrderId,
                UserId = o.UserId,
                OrderDate = o.OrderDate,
                Status = o.Status,
                TotalAmount = o.TotalAmount ?? 0, // nullable decimal; 0 if no items yet
                // Flatten the nested OrderItems collection, resolving product names
                OrderItems = o.OrderItems?.Select(oi => new OrderItemResponseDto
                {
                    OrderItemId = oi.OrderItemId,
                    OrderId = oi.OrderId,
                    ProductId = oi.ProductId,
                    ProductName = oi.Product?.Name ?? string.Empty,
                    Quantity = oi.Quantity,
                    Price = oi.Price
                }).ToList() ?? new() // empty list if no items
            });
            return Ok(response);
        }

        /// <summary>
        /// Gets a specific order by its ID.
        /// </summary>
        /// <param name="id">The ID of the order.</param>
        /// <returns>The order details if found; otherwise, NotFound.</returns>
        // GET /api/orders/{id}
        // Returns a single order with its line items. Throws ResourceNotFoundException (→ 404)
        // if the order does not exist.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderRepository.GetOrderByIdAsync(id);
            if (order == null)
                throw new ResourceNotFoundException("Order", id); // global handler returns 404

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
        // POST /api/orders
        // Creates a new, empty order header for a user. TotalAmount starts at 0 and is
        // recalculated in the repository as OrderItems are added. Returns 201 Created.
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            // Manual model validation; throws ValidationException (→ 400) on invalid input
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
                // Status defaults to a new/pending value configured in the repository
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
                    OrderItems = new() // newly created order has no items yet
                });
        }

        // PUT /api/orders/{id}
        // Updates an order's status and/or total amount. Commonly used to advance an order
        // through its lifecycle (e.g. Pending → Processing → Completed).
        // Throws ResourceNotFoundException (→ 404) if the order does not exist.
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
                    // Return the current line items so the client does not need a second request
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
                // Repository throws KeyNotFoundException when the order ID does not exist;
                // re-wrap as ResourceNotFoundException so the global handler returns 404.
                throw new ResourceNotFoundException("Order", id);
            }
        }

        // DELETE /api/orders/{id}
        // Permanently removes an order. Returns 204 No Content on success.
        // Throws ResourceNotFoundException (→ 404) if the order does not exist.
        // Throws ConflictException (→ 409) if business rules prevent deletion
        // (e.g. an order that has already been fulfilled cannot be deleted).
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            try
            {
                await _orderRepository.DeleteOrderAsync(id);
                return NoContent(); // 204 — deletion successful, no response body
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("Order", id); // → 404
            }
            catch (InvalidOperationException ex)
            {
                // Repository throws InvalidOperationException when a business rule blocks deletion
                throw new ConflictException(ex.Message); // → 409
            }
        }
    }
}
