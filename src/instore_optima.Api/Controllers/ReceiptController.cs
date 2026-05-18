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
    [Authorize]
    /// <summary>
    /// API endpoints for managing receipts.
    /// </summary>
    public class ReceiptController : ControllerBase
    {
        private readonly IReceiptRepository _receiptRepo;
        private readonly IPaymentRepository _paymentRepo;
        private readonly IInvoiceRepository _invoiceRepo;

        public ReceiptController(
            IReceiptRepository receiptRepo,
            IPaymentRepository paymentRepo,
            IInvoiceRepository invoiceRepo)
        {
            _receiptRepo = receiptRepo;
            _paymentRepo = paymentRepo;
            _invoiceRepo = invoiceRepo;
        }

        /// <summary>
        /// Gets all receipts in the system.
        /// </summary>
        /// <returns>A list of all receipts.</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetAll()
        {
            var receipts = await _receiptRepo.GetAllReceiptsAsync();
            var payments = await _paymentRepo.GetAllPaymentsAsync();
            var paymentById = payments.ToDictionary(p => p.PaymentId);

            var result = new List<ReceiptResponseDto>();
            foreach (var r in receipts)
            {
                paymentById.TryGetValue(r.PaymentId, out var payment);
                Invoice? invoice = null;
                if (payment != null)
                {
                    var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                    invoice = invoices.FirstOrDefault();
                }
                result.Add(MapToDto(r, payment, invoice));
            }
            return Ok(result);
        }

        /// <summary>
        /// Gets a specific receipt by its ID.
        /// </summary>
        /// <param name="id">The ID of the receipt.</param>
        /// <returns>The receipt details if found; otherwise, NotFound.</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> GetById(int id)
        {
            var receipt = await _receiptRepo.GetReceiptByIdAsync(id);
            if (receipt == null)
                throw new ResourceNotFoundException("Receipt", id);

            var payment = await _paymentRepo.GetPaymentByIdAsync(receipt.PaymentId);
            Invoice? invoice = null;
            if (payment != null)
            {
                var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                invoice = invoices.FirstOrDefault();
            }
            return Ok(MapToDto(receipt, payment, invoice));
        }

        /// <summary>
        /// Creates a new receipt.
        /// </summary>
        /// <param name="dto">The receipt creation data.</param>
        /// <returns>The created receipt.</returns>
        [HttpPost]
        public async Task<ActionResult<ReceiptResponseDto>> Create([FromBody] CreateReceiptDto dto)
        {
            if (!ModelState.IsValid)
                throw new ValidationException(ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()));

            var receipt = new Receipt
            {
                PaymentId = dto.PaymentId,
                ReceiptNumber = dto.ReceiptNumber,
                AmountPaid = dto.AmountPaid,
                PaymentDate = dto.PaymentDate
                // GeneratedAt set inside repository
            };

            var created = await _receiptRepo.CreateReceiptAsync(receipt);
            var payment = await _paymentRepo.GetPaymentByIdAsync(created.PaymentId);
            Invoice? invoice = null;
            if (payment != null)
            {
                var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(payment.OrderId);
                invoice = invoices.FirstOrDefault();
            }
            return CreatedAtAction(nameof(GetById), new { id = created.ReceiptId }, MapToDto(created, payment, invoice));
        }

        // PUT api/receipt/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> Update(
            int id, [FromBody] UpdateReceiptDto dto)
        {
            var existing = await _receiptRepo.GetReceiptByIdAsync(id);
            if (existing == null)
                throw new ResourceNotFoundException("Receipt", id);

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

        private static ReceiptResponseDto MapToDto(Receipt r, Payment? payment, Invoice? invoice) => new()
        {
            ReceiptId = r.ReceiptId,
            PaymentId = r.PaymentId,
            ReceiptNumber = r.ReceiptNumber,
            AmountPaid = r.AmountPaid,
            PaymentDate = r.PaymentDate,
            GeneratedAt = r.GeneratedAt,
            OrderId = payment?.OrderId,
            InvoiceNumber = invoice?.InvoiceNumber
        };
    }
}