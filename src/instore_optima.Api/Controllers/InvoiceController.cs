// ── InvoiceController.cs ──────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/invoice.
//
// An Invoice is a financial document issued for an Order, detailing the amount
// owed, taxes, and due date.  Each invoice optionally links to the Payment made
// for its order so the response can include payment status / method.
//
// Authentication: every endpoint requires a valid JWT ([Authorize]).
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Api.Exceptions;
using instore_optima.Api.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/invoice")]
    [Authorize] // All endpoints require a valid JWT token.
    /// <summary>
    /// API endpoints for managing invoices.
    /// </summary>
    public class InvoiceController : ControllerBase
    {
        // ── Injected repositories ─────────────────────────────────────────────
        private readonly IInvoiceRepository _invoiceRepo; // For invoice CRUD.
        private readonly IPaymentRepository _paymentRepo; // For enriching responses with payment info.

        // Constructor — dependencies provided via ASP.NET Core Dependency Injection.
        public InvoiceController(IInvoiceRepository invoiceRepo, IPaymentRepository paymentRepo)
        {
            _invoiceRepo = invoiceRepo;
            _paymentRepo = paymentRepo;
        }

        // GET api/invoice
        /// <summary>
        /// Returns every invoice in the system, each enriched with payment
        /// information for the associated order (if a payment exists).
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetAll()
        {
            var invoices = await _invoiceRepo.GetAllInvoicesAsync();
            var payments = await _paymentRepo.GetAllPaymentsAsync();
            // Build a lookup dictionary keyed by OrderId for fast access per invoice.
            var paymentByOrder = payments.ToDictionary(p => p.OrderId);

            return Ok(invoices.Select(i =>
            {
                // Attempt to find the payment for this invoice's order; may be null.
                paymentByOrder.TryGetValue(i.OrderId, out var payment);
                return MapToDto(i, payment);
            }));
        }

        // GET api/invoice/{id}
        /// <summary>
        /// Returns a single invoice by its primary key, enriched with payment info.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceResponseDto>> GetById(int id)
        {
            var invoice = await _invoiceRepo.GetInvoiceByIdAsync(id);
            if (invoice == null)
                throw new ResourceNotFoundException("Invoice", id); // Global handler → 404.

            var payment = await _paymentRepo.GetPaymentByOrderIdAsync(invoice.OrderId);
            return Ok(MapToDto(invoice, payment));
        }

        // GET api/invoice/order/{orderId}
        /// <summary>
        /// Returns all invoices that belong to a given order.
        /// An order can theoretically have multiple invoices (e.g. partial billing).
        /// </summary>
        [HttpGet("order/{orderId}")]
        public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetByOrder(int orderId)
        {
            var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(orderId);
            // Load the single payment for this order (there should be at most one).
            var payment = await _paymentRepo.GetPaymentByOrderIdAsync(orderId);
            return Ok(invoices.Select(i => MapToDto(i, payment)));
        }

        // POST api/invoice
        /// <summary>
        /// Creates a new invoice for an order.
        /// Note: IssuedDate and Status are set by the repository (not the caller).
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<InvoiceResponseDto>> Create([FromBody] CreateInvoiceDto dto)
        {
            // Return 400 immediately if the request body fails data-annotation validation.
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Map the caller's DTO onto the domain entity.
            var invoice = new Invoice
            {
                OrderId = dto.OrderId,
                InvoiceNumber = dto.InvoiceNumber,
                TotalAmount = dto.TotalAmount,
                TaxAmount = dto.TaxAmount,
                DueDate = dto.DueDate
                // IssuedDate and Status set inside repository
            };

            var created = await _invoiceRepo.CreateInvoiceAsync(invoice);
            var payment = await _paymentRepo.GetPaymentByOrderIdAsync(created.OrderId);
            // 201 Created — Location header points to GET api/invoice/{id}.
            return CreatedAtAction(nameof(GetById), new { id = created.InvoiceId }, MapToDto(created, payment));
        }

        // PUT api/invoice/{id}
        /// <summary>
        /// Updates the status (e.g. "Issued" → "Paid") of an existing invoice.
        /// Invalid status values or a missing invoice are returned as 400 / 404.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<InvoiceResponseDto>> UpdateStatus(
            int id, [FromBody] UpdateInvoiceStatusDto dto)
        {
            try
            {
                var updated = await _invoiceRepo.UpdateInvoiceStatusAsync(id, dto.Status);
                var payment = await _paymentRepo.GetPaymentByOrderIdAsync(updated.OrderId);
                return Ok(MapToDto(updated, payment));
            }
            catch (KeyNotFoundException ex)
            {
                // Repository throws this when the invoice ID does not exist.
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                // Repository throws this when the supplied status string is not valid.
                return BadRequest(new { message = ex.Message });
            }
        }

        // ── Private helper ────────────────────────────────────────────────────

        // Combines an Invoice entity with its optional Payment into the flat
        // InvoiceResponseDto that the client expects.
        private static InvoiceResponseDto MapToDto(Invoice i, Payment? payment) => new()
        {
            InvoiceId = i.InvoiceId,
            OrderId = i.OrderId,
            InvoiceNumber = i.InvoiceNumber,
            TotalAmount = i.TotalAmount,
            TaxAmount = i.TaxAmount,
            IssuedDate = i.IssuedDate,
            DueDate = i.DueDate,
            Status = i.Status,
            PaymentId = payment?.PaymentId,         // null when no payment exists for this order
            PaymentStatus = payment?.PaymentStatus, // null when no payment exists
            PaymentMethod = payment?.PaymentMethod  // null when no payment exists
        };
    }
}
