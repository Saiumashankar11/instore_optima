using instore_optima.Api.DTOs;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/payment")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly IOrderRepository _orderRepository;

        public PaymentController(
            IPaymentRepository paymentRepository,
            IOrderRepository orderRepository)
        {
            _paymentRepository = paymentRepository;
            _orderRepository = orderRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPayments()
        {
            var payments = await _paymentRepository.GetAllPaymentsAsync();
            var response = payments.Select(p => new PaymentResponseDto
            {
                PaymentId = p.PaymentId,
                OrderId = p.OrderId,
                PaymentMethod = p.PaymentMethod,
                PaymentStatus = p.PaymentStatus,
                PaymentDate = p.PaymentDate
            });
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPaymentById(int id)
        {
            var payment = await _paymentRepository.GetPaymentByIdAsync(id);
            if (payment == null)
                return NotFound(new { message = $"Payment with ID {id} not found." });
            return Ok(new PaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                OrderId = payment.OrderId,
                PaymentMethod = payment.PaymentMethod,
                PaymentStatus = payment.PaymentStatus,
                PaymentDate = payment.PaymentDate
            });
        }

        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetPaymentByOrderId(int orderId)
        {
            var payment = await _paymentRepository.GetPaymentByOrderIdAsync(orderId);
            if (payment == null)
                return NotFound(new { message = $"No payment found for Order ID {orderId}." });
            return Ok(new PaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                OrderId = payment.OrderId,
                PaymentMethod = payment.PaymentMethod,
                PaymentStatus = payment.PaymentStatus,
                PaymentDate = payment.PaymentDate
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var order = await _orderRepository.GetOrderByIdAsync(dto.OrderId);
            if (order == null)
                return NotFound(new { message = $"Order with ID {dto.OrderId} not found." });
            var payment = new Payment
            {
                OrderId = dto.OrderId,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = dto.PaymentStatus
            };
            var created = await _paymentRepository.CreatePaymentAsync(payment);
            return CreatedAtAction(nameof(GetPaymentById), new { id = created.PaymentId },
                new PaymentResponseDto
                {
                    PaymentId = created.PaymentId,
                    OrderId = created.OrderId,
                    PaymentMethod = created.PaymentMethod,
                    PaymentStatus = created.PaymentStatus,
                    PaymentDate = created.PaymentDate
                });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdatePaymentStatusDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            try
            {
                var updated = await _paymentRepository.UpdatePaymentStatusAsync(id, dto.PaymentStatus);
                return Ok(new PaymentResponseDto
                {
                    PaymentId = updated.PaymentId,
                    OrderId = updated.OrderId,
                    PaymentMethod = updated.PaymentMethod,
                    PaymentStatus = updated.PaymentStatus,
                    PaymentDate = updated.PaymentDate
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var payment = await _paymentRepository.GetPaymentByIdAsync(id);
            if (payment == null)
                return NotFound(new { message = $"Payment with ID {id} not found." });
            await _paymentRepository.UpdatePaymentStatusAsync(id, "Refunded");
            return NoContent();
        }
    }
}