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
    [Authorize]
    /// <summary>
    /// API endpoints for managing invoices.
    /// </summary>
    public class InvoiceController : ControllerBase
    {
        private readonly IInvoiceRepository _invoiceRepo;
        private readonly IPaymentRepository _paymentRepo;

        public InvoiceController(IInvoiceRepository invoiceRepo, IPaymentRepository paymentRepo)
        {
            _invoiceRepo = invoiceRepo;
            _paymentRepo = paymentRepo;
        }

        // GET api/invoice
        /// <summary>
        /// Gets all invoices in the system.
        /// </summary>
        /// <returns>A list of all invoices.</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetAll()
        {
            var invoices = await _invoiceRepo.GetAllInvoicesAsync();
            var payments = await _paymentRepo.GetAllPaymentsAsync();
            var paymentByOrder = payments.ToDictionary(p => p.OrderId);

            return Ok(invoices.Select(i =>
            {
                paymentByOrder.TryGetValue(i.OrderId, out var payment);
                return MapToDto(i, payment);
            }));
        }

        // GET api/invoice/{id}
        /// <summary>
        /// Gets a specific invoice by its ID.
        /// </summary>
        /// <param name="id">The ID of the invoice.</param>
        /// <returns>The invoice details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceResponseDto>> GetById(int id)
        {
            var invoice = await _invoiceRepo.GetInvoiceByIdAsync(id);
            if (invoice == null)
                throw new ResourceNotFoundException("Invoice", id);

            var payment = await _paymentRepo.GetPaymentByOrderIdAsync(invoice.OrderId);
            return Ok(MapToDto(invoice, payment));
        }

        // GET api/invoice/order/{orderId}
        /// <summary>
        /// Gets all invoices for a specific order.
        /// </summary>
        /// <param name="orderId">The ID of the order.</param>
        /// <returns>A list of invoices for the specified order.</returns>
        [HttpGet("order/{orderId}")]
        public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetByOrder(int orderId)
        {
            var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(orderId);
            var payment = await _paymentRepo.GetPaymentByOrderIdAsync(orderId);
            return Ok(invoices.Select(i => MapToDto(i, payment)));
        }

        // POST api/invoice
        /// <summary>
        /// Creates a new invoice.
        /// </summary>
        /// <param name="dto">The invoice creation data.</param>
        /// <returns>The created invoice.</returns>
        [HttpPost]
        public async Task<ActionResult<InvoiceResponseDto>> Create([FromBody] CreateInvoiceDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

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
            return CreatedAtAction(nameof(GetById), new { id = created.InvoiceId }, MapToDto(created, payment));
        }

        // PUT api/invoice/{id}
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
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

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
            PaymentId = payment?.PaymentId,
            PaymentStatus = payment?.PaymentStatus,
            PaymentMethod = payment?.PaymentMethod
        };
    }
}