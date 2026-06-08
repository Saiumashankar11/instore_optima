// ── ReceiptController.cs ──────────────────────────────────────────────────────
// Handles all HTTP endpoints under the route  api/receipt.
//
// A Receipt is the proof-of-payment document issued after a successful Payment.
// It is related to a Payment, which in turn is related to an Order and (optionally)
// an Invoice.  The response DTOs flatten these three levels into one shape so the
// client has everything it needs in a single call.
//
// Authentication: every endpoint requires a valid JWT ([Authorize]).
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Api.Exceptions;
using instore_optima.Api.Repositories.Interfaces;
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/receipt")]
    [Authorize] // All endpoints require a valid JWT token.
    /// <summary>
    /// API endpoints for managing receipts.
    /// </summary>
    public class ReceiptController : ControllerBase
    {
        // ── Injected repositories ─────────────────────────────────────────────
        private readonly IReceiptRepository _receiptRepo;   // Receipt persistence.
        private readonly IPaymentRepository _paymentRepo;   // Used to look up the payment a receipt belongs to.
        private readonly IInvoiceRepository _invoiceRepo;   // Used to look up the invoice for the order.

        // Constructor — all dependencies are provided by ASP.NET Core's DI container.
        public ReceiptController(
            IReceiptRepository receiptRepo,
            IPaymentRepository paymentRepo,
            IInvoiceRepository invoiceRepo)
        {
            _receiptRepo = receiptRepo;
            _paymentRepo = paymentRepo;
            _invoiceRepo = invoiceRepo;
        }

        // ── GET api/receipt ───────────────────────────────────────────────────
        /// <summary>
        /// Returns every receipt in the system, each enriched with its linked
        /// payment (for the order ID) and the first invoice for that order.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetAll()
        {
            var receipts = await _receiptRepo.GetAllReceiptsAsync();
            var payments = await _paymentRepo.GetAllPaymentsAsync();
            // Build a dictionary keyed by PaymentId for O(1) lookup per receipt.
            var paymentById = payments.ToDictionary(p => p.PaymentId);

            var result = new List<ReceiptResponseDto>();
            foreach (var r in receipts)
            {
                // Try to match this receipt to its payment.
                paymentById.TryGetValue(r.PaymentId, out var payment);
                Invoice? invoice = null;
                if (payment != null)
                {
                    // The invoice is found via the order that the payment belongs to.
                    var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                    invoice = invoices.FirstOrDefault();
                }
                result.Add(MapToDto(r, payment, invoice));
            }
            return Ok(result);
        }

        // ── GET api/receipt/{id} ──────────────────────────────────────────────
        /// <summary>
        /// Returns a single receipt by its primary key, enriched with payment
        /// and invoice data.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> GetById(int id)
        {
            var receipt = await _receiptRepo.GetReceiptByIdAsync(id);
            if (receipt == null)
                throw new ResourceNotFoundException("Receipt", id); // Global handler converts this to a 404.

            var payment = await _paymentRepo.GetPaymentByIdAsync(receipt.PaymentId);
            Invoice? invoice = null;
            if (payment != null)
            {
                var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                invoice = invoices.FirstOrDefault();
            }
            return Ok(MapToDto(receipt, payment, invoice));
        }

        // ── POST api/receipt ──────────────────────────────────────────────────
        /// <summary>
        /// Creates a new receipt linked to an existing payment.
        /// Note: GeneratedAt is set by the repository, not the caller.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ReceiptResponseDto>> Create([FromBody] CreateReceiptDto dto)
        {
            // Validate data-annotation rules (e.g. [Required]) before persisting.
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()));

            // Map the DTO to the domain entity.
            var receipt = new Receipt
            {
                PaymentId = dto.PaymentId,
                ReceiptNumber = dto.ReceiptNumber,
                AmountPaid = dto.AmountPaid,
                PaymentDate = dto.PaymentDate
                // GeneratedAt set inside repository
            };

            var created = await _receiptRepo.CreateReceiptAsync(receipt);
            // Enrich the response with linked payment and invoice data.
            var payment = await _paymentRepo.GetPaymentByIdAsync(created.PaymentId);
            Invoice? invoice = null;
            if (payment != null)
            {
                var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                invoice = invoices.FirstOrDefault();
            }
            // 201 Created — Location header points to GET api/receipt/{id}.
            return CreatedAtAction(nameof(GetById), new { id = created.ReceiptId }, MapToDto(created, payment, invoice));
        }

        // PUT api/receipt/{id}
        /// <summary>
        /// Replaces the editable fields (ReceiptNumber, AmountPaid, PaymentDate)
        /// of an existing receipt.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> Update(
            int id, [FromBody] UpdateReceiptDto dto)
        {
            // Check the receipt exists before attempting to update.
            var existing = await _receiptRepo.GetReceiptByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Receipt", id);

            // Apply the new values directly to the tracked entity.
            existing.ReceiptNumber = dto.ReceiptNumber;
            existing.AmountPaid = dto.AmountPaid;
            existing.PaymentDate = dto.PaymentDate;

            var updated = await _receiptRepo.UpdateReceiptAsync(existing);
            var payment = await _paymentRepo.GetPaymentByIdAsync(updated.PaymentId);
            Invoice? invoice = null;
            if (payment != null)
            {
                var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                invoice = invoices.FirstOrDefault();
            }
            return Ok(MapToDto(updated, payment, invoice));
        }

        // ── Private helper ────────────────────────────────────────────────────

        // Combines a Receipt with its optional Payment and Invoice into the flat
        // ReceiptResponseDto shape the client expects.
        private static ReceiptResponseDto MapToDto(Receipt r, Payment? payment, Invoice? invoice) => new()
        {
            ReceiptId = r.ReceiptId,
            PaymentId = r.PaymentId,
            ReceiptNumber = r.ReceiptNumber,
            AmountPaid = r.AmountPaid,
            PaymentDate = r.PaymentDate,
            GeneratedAt = r.GeneratedAt,
            OrderId = payment?.OrderId,              // null when no payment is linked
            InvoiceNumber = invoice?.InvoiceNumber   // null when no invoice is linked
        };
    }
}
