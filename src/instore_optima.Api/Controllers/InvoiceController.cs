using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/invoice")]
    [Authorize]
    public class InvoiceController : ControllerBase
    {
        private readonly IInvoiceRepository _invoiceRepo;

        public InvoiceController(IInvoiceRepository invoiceRepo)
        {
            _invoiceRepo = invoiceRepo;
        }

        // GET api/invoice
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetAll()
        {
            var invoices = await _invoiceRepo.GetAllInvoicesAsync();
            return Ok(invoices.Select(MapToDto));
        }

        // GET api/invoice/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceResponseDto>> GetById(int id)
        {
            var invoice = await _invoiceRepo.GetInvoiceByIdAsync(id);
            if (invoice == null)
                return NotFound(new { message = $"Invoice {id} not found" });

            return Ok(MapToDto(invoice));
        }

        // GET api/invoice/order/{orderId}
        [HttpGet("order/{orderId}")]
        public async Task<ActionResult<IEnumerable<InvoiceResponseDto>>> GetByOrder(int orderId)
        {
            var invoices = await _invoiceRepo.GetInvoicesByOrderIdAsync(orderId);
            return Ok(invoices.Select(MapToDto));
        }

        // POST api/invoice
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
            return CreatedAtAction(nameof(GetById), new { id = created.InvoiceId }, MapToDto(created));
        }

        // PUT api/invoice/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<InvoiceResponseDto>> UpdateStatus(
            int id, [FromBody] UpdateInvoiceStatusDto dto)
        {
            try
            {
                var updated = await _invoiceRepo.UpdateInvoiceStatusAsync(id, dto.Status);
                return Ok(MapToDto(updated));
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

        private static InvoiceResponseDto MapToDto(Invoice i) => new()
        {
            InvoiceId = i.InvoiceId,
            OrderId = i.OrderId,
            InvoiceNumber = i.InvoiceNumber,
            TotalAmount = i.TotalAmount,
            TaxAmount = i.TaxAmount,
            IssuedDate = i.IssuedDate,
            DueDate = i.DueDate,
            Status = i.Status
        };
    }
}