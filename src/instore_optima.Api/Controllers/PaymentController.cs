using instore_optima.Api.DTOs;
using instore_optima.Api.Exceptions;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/payment")]
    [Authorize]
    /// <summary>
    /// API endpoints for managing payments.
    /// </summary>
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IReceiptRepository _receiptRepository;

        public PaymentController(
            IPaymentRepository paymentRepository,
            IOrderRepository orderRepository,
            IInvoiceRepository invoiceRepository,
            IReceiptRepository receiptRepository)
        {
            _paymentRepository = paymentRepository;
            _orderRepository = orderRepository;
            _invoiceRepository = invoiceRepository;
            _receiptRepository = receiptRepository;
        }

        /// <summary>
        /// Gets all payments in the system.
        /// </summary>
        /// <returns>A list of all payments.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAllPayments()
        {
            var payments = await _paymentRepository.GetAllPaymentsAsync();
            var result = new List<PaymentResponseDto>();
            foreach (var p in payments)
            {
                var (invoice, receipt) = await GetInvoiceAndReceipt(p);
                result.Add(MapToDto(p, invoice, receipt));
            }
            return Ok(result);
        }

        /// <summary>
        /// Gets a specific payment by its ID.
        /// </summary>
        /// <param name="id">The ID of the payment.</param>
        /// <returns>The payment details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPaymentById(int id)
        {
            var payment = await _paymentRepository.GetPaymentByIdAsync(id);
            if (payment == null)
                throw new ResourceNotFoundException("Payment", id);

            var (invoice, receipt) = await GetInvoiceAndReceipt(payment);
            return Ok(MapToDto(payment, invoice, receipt));
        }

        /// <summary>
        /// Gets the payment for a specific order.
        /// </summary>
        /// <param name="orderId">The ID of the order.</param>
        /// <returns>The payment details for the specified order if found; otherwise, NotFound.</returns>
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetPaymentByOrderId(int orderId)
        {
            var payment = await _paymentRepository.GetPaymentByOrderIdAsync(orderId);
            if (payment == null)
                throw new ResourceNotFoundException("Payment", orderId);

            var (invoice, receipt) = await GetInvoiceAndReceipt(payment);
            return Ok(MapToDto(payment, invoice, receipt));
        }

        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "payment",
                    e => new[] { e.ErrorMessage }));

            var order = await _orderRepository.GetOrderByIdAsync(dto.OrderId);
            if (order == null)
                throw new ResourceNotFoundException("Order", dto.OrderId);

            var payment = new Payment
            {
                OrderId = dto.OrderId,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = dto.PaymentStatus
            };
            var created = await _paymentRepository.CreatePaymentAsync(payment);
            var (invoice, receipt) = await GetInvoiceAndReceipt(created);
            return CreatedAtAction(nameof(GetPaymentById), new { id = created.PaymentId },
                MapToDto(created, invoice, receipt));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdatePaymentStatusDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "status",
                    e => new[] { e.ErrorMessage }));

            try
            {
                var updated = await _paymentRepository.UpdatePaymentStatusAsync(id, dto.PaymentStatus);
                var (invoice, receipt) = await GetInvoiceAndReceipt(updated);
                return Ok(MapToDto(updated, invoice, receipt));
            }
            catch (KeyNotFoundException)
            {
                throw new ResourceNotFoundException("Payment", id);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var result = await _paymentRepository.DeletePaymentAsync(id);
            if (!result)
                throw new ResourceNotFoundException("Payment", id);
            return Ok(new { message = $"Payment {id} and its linked invoice/receipt have been deleted." });
        }

        private async Task<(Invoice? invoice, Receipt? receipt)> GetInvoiceAndReceipt(Payment payment)
        {
            var invoices = await _invoiceRepository.GetInvoicesByOrderIdAsync(payment.OrderId);
            var invoice = invoices.FirstOrDefault();
            var receipt = await _receiptRepository.GetReceiptByPaymentIdAsync(payment.PaymentId);
            return (invoice, receipt);
        }

        private static PaymentResponseDto MapToDto(Payment p, Invoice? invoice, Receipt? receipt) => new()
        {
            PaymentId = p.PaymentId,
            OrderId = p.OrderId,
            PaymentMethod = p.PaymentMethod,
            PaymentStatus = p.PaymentStatus,
            PaymentDate = p.PaymentDate,
            InvoiceId = invoice?.InvoiceId,
            InvoiceNumber = invoice?.InvoiceNumber,
            ReceiptId = receipt?.ReceiptId
        };
    }
}
