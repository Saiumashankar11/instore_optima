// ── OrderItemsController ──────────────────────────────────────────────────────
// Manages individual line items within orders under /api/orderitems.
// Each order item links an order to a product with a quantity and price.
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
    [Route("api/orderitems")]
    [Authorize] // all endpoints require a valid JWT
    /// <summary>
    /// API endpoints for managing order items.
    /// </summary>
    public class OrderItemsController : ControllerBase
    {
        // _orderItemRepository — CRUD for individual order line items
        // _orderRepository     — used to verify the parent order exists before adding items
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
        // GET /api/orderitems
        // Returns every order item across all orders. Useful for reporting.
        // The ProductName is resolved via the navigation property (Product?.Name).
        [HttpGet]
        public async Task<IActionResult> GetAllOrderItems()
        {
            var items = await _orderItemRepository.GetAllOrderItemsAsync();
            // Project to response DTO; use empty string if Product navigation is null
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
        // GET /api/orderitems/order/{orderId}
        // Returns all line items belonging to a single order.
        // Useful for rendering the order detail view.
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
        // GET /api/orderitems/{id}
        // Returns a single order item. Throws ResourceNotFoundException (→ 404) if missing.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderItemById(int id)
        {
            var orderItem = await _orderItemRepository.GetOrderItemByIdAsync(id);
            if (orderItem == null)
                throw new ResourceNotFoundException("OrderItem", id); // global handler returns 404

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
        // POST /api/orderitems
        // Adds a new line item to an existing order.
        // Validates the parent order exists before creating the item.
        // Price is not taken from the DTO — the repository fetches it from the product.
        [HttpPost]
        public async Task<IActionResult> CreateOrderItem([FromBody] CreateOrderItemDto dto)
        {
            // Manual model validation; throws ValidationException so the global handler
            // can return a structured 400 response with field-level error messages.
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "orderItem",
                    e => new[] { e.ErrorMessage }));

            // Ensure the parent order exists before creating a line item for it
            var parentOrder = await _orderRepository.GetOrderByIdAsync(dto.OrderId);
            if (parentOrder == null)
                throw new ResourceNotFoundException("Order", dto.OrderId);

            var item = new Order_Items
            {
                OrderId = dto.OrderId,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity
                // Price fetched from product in repository
            };
            var created = await _orderItemRepository.CreateOrderItemAsync(item);
            // 201 Created with a Location header pointing to GetOrderItemById
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
        // PUT /api/orderitems/{id}
        // Updates the quantity on an existing order item.
        // Price remains controlled by the product record (managed in the repository).
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
                    Quantity = dto.Quantity
                    // Price stays from product, managed in repository
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
                // Repository throws KeyNotFoundException when the item ID does not exist;
                // re-wrap as ResourceNotFoundException so the global handler returns 404.
                throw new ResourceNotFoundException("OrderItem", id);
            }
        }

        /// <summary>
        /// Deletes an order item by its ID.
        /// </summary>
        /// <param name="id">The ID of the order item to delete.</param>
        /// <returns>No content if successful; otherwise, NotFound.</returns>
        // DELETE /api/orderitems/{id}
        // Removes a line item from its order. Returns 204 No Content on success.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrderItem(int id)
        {
            try
            {
                await _orderItemRepository.DeleteOrderItemAsync(id);
                return NoContent(); // 204 — successful deletion, no body
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("OrderItem", id); // → 404
            }
        }
    }
}
