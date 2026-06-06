// ── PaymentController.cs ─────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/payment.
// A Payment represents money exchanged for a customer order. Each payment
// links to one Order and may also have a related Invoice and Receipt.
//
// Authentication: every endpoint requires a valid JWT ([Authorize]).
// Delete is further restricted to the Admin role.
// ─────────────────────────────────────────────────────────────────────────────
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
    [Authorize] // All endpoints require an authenticated user (valid JWT token).
    /// <summary>
    /// API endpoints for managing payments.
    /// </summary>
    public class PaymentController : ControllerBase
    {
        // ── Injected repositories ─────────────────────────────────────────────
        // Each repository is responsible for database access for its entity type.
        private readonly IPaymentRepository _paymentRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly IInvoiceRepository _invoiceRepository;
        private readonly IReceiptRepository _receiptRepository;

        // Constructor — ASP.NET Core automatically provides these via Dependency Injection.
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

        // ── GET api/payment ───────────────────────────────────────────────────
        /// <summary>
        /// GET api/payment
        /// Returns every payment in the system, each enriched with its linked
        /// invoice (if any) and receipt (if any).
        /// Auth: any authenticated user.
        /// Returns: 200 OK with a list of PaymentResponseDto objects.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllPayments()
        {
            var payments = await _paymentRepository.GetAllPaymentsAsync();
            var result = new List<PaymentResponseDto>();
            foreach (var p in payments)
            {
                // For each payment, look up its associated invoice and receipt
                // so the response DTO can include those IDs / numbers.
                var (invoice, receipt) = await GetInvoiceAndReceipt(p);
                result.Add(MapToDto(p, invoice, receipt));
            }
            return Ok(result);
        }

        // ── GET api/payment/{id} ──────────────────────────────────────────────
        /// <summary>
        /// GET api/payment/{id}
        /// Returns a single payment by its primary key.
        /// Auth: any authenticated user.
        /// Returns: 200 OK with the payment, or 404 if not found.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPaymentById(int id)
        {
            var payment = await _paymentRepository.GetPaymentByIdAsync(id);
            if (payment == null)
                throw new ResourceNotFoundException("Payment", id); // Triggers a 404 response via the global exception handler.

            var (invoice, receipt) = await GetInvoiceAndReceipt(payment);
            return Ok(MapToDto(payment, invoice, receipt));
        }

        // ── GET api/payment/order/{orderId} ───────────────────────────────────
        /// <summary>
        /// GET api/payment/order/{orderId}
        /// Returns the payment that belongs to a specific order.
        /// Auth: any authenticated user.
        /// Returns: 200 OK with the payment, or 404 if no payment exists for that order.
        /// </summary>
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetPaymentByOrderId(int orderId)
        {
            var payment = await _paymentRepository.GetPaymentByOrderIdAsync(orderId);
            if (payment == null)
                throw new ResourceNotFoundException("Payment", orderId);

            var (invoice, receipt) = await GetInvoiceAndReceipt(payment);
            return Ok(MapToDto(payment, invoice, receipt));
        }

        // ── POST api/payment ──────────────────────────────────────────────────
        /// <summary>
        /// POST api/payment
        /// Creates a new payment record linked to an existing order.
        /// The order must exist, otherwise a 404 is returned.
        /// Auth: any authenticated user.
        /// Returns: 201 Created with the new payment, or 422 if validation fails.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
        {
            // Manually check model annotations (e.g. [Required]) and build a
            // structured error map if anything is invalid.
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.Values
                .SelectMany(v => v.Errors)
                .ToDictionary(
                    e => "payment",
                    e => new[] { e.ErrorMessage }));

            // Confirm the referenced order actually exists before creating the payment.
            var order = await _orderRepository.GetOrderByIdAsync(dto.OrderId);
            if (order == null)
                throw new ResourceNotFoundException("Order", dto.OrderId);

            // Map the DTO fields onto the domain entity.
            var payment = new Payment
            {
                OrderId = dto.OrderId,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = dto.PaymentStatus
            };
            var created = await _paymentRepository.CreatePaymentAsync(payment);
            var (invoice, receipt) = await GetInvoiceAndReceipt(created);
            // 201 Created — Location header points to GET api/payment/{id}.
            return CreatedAtAction(nameof(GetPaymentById), new { id = created.PaymentId },
                MapToDto(created, invoice, receipt));
        }

        // ── PUT api/payment/{id} ──────────────────────────────────────────────
        /// <summary>
        /// PUT api/payment/{id}
        /// Updates the status (e.g. Pending → Completed) of an existing payment.
        /// Auth: any authenticated user.
        /// Returns: 200 OK with the updated payment, or 404 if not found, or 422 on validation errors.
        /// </summary>
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
                // Repository throws KeyNotFoundException when the payment ID doesn't exist;
                // we convert it to a user-friendly 404.
                throw new ResourceNotFoundException("Payment", id);
            }
        }

        // ── DELETE api/payment/{id} ───────────────────────────────────────────
        /// <summary>
        /// DELETE api/payment/{id}
        /// Permanently removes a payment and its linked invoice/receipt.
        /// Auth: Admin role only.
        /// Returns: 200 OK on success, or 404 if the payment is not found.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // Restricted: only Admin users may delete payments.
        public async Task<IActionResult> DeletePayment(int id)
        {
            var result = await _paymentRepository.DeletePaymentAsync(id);
            if (!result)
                throw new ResourceNotFoundException("Payment", id);
            return Ok(new { message = $"Payment {id} and its linked invoice/receipt have been deleted." });
        }

        // ── Private helpers ───────────────────────────────────────────────────

        // Fetches the first invoice for the order that owns this payment,
        // and the receipt (if any) directly linked to the payment.
        // Both are optional — a payment may not yet have a receipt or invoice.
        private async Task<(Invoice? invoice, Receipt? receipt)> GetInvoiceAndReceipt(Payment payment)
        {
            var invoices = await _invoiceRepository.GetInvoicesByOrderIdAsync(payment.OrderId);
            var invoice = invoices.FirstOrDefault(); // Take only the first invoice for the order.
            var receipt = await _receiptRepository.GetReceiptByPaymentIdAsync(payment.PaymentId);
            return (invoice, receipt);
        }

        // Maps a Payment domain entity plus its optional related records into a
        // flat PaymentResponseDto that is safe and convenient for API consumers.
        private static PaymentResponseDto MapToDto(Payment p, Invoice? invoice, Receipt? receipt) => new()
        {
            PaymentId = p.PaymentId,
            OrderId = p.OrderId,
            PaymentMethod = p.PaymentMethod,
            PaymentStatus = p.PaymentStatus,
            PaymentDate = p.PaymentDate,
            InvoiceId = invoice?.InvoiceId,           // null if no invoice yet
            InvoiceNumber = invoice?.InvoiceNumber,   // null if no invoice yet
            ReceiptId = receipt?.ReceiptId            // null if no receipt yet
        };
    }
}
