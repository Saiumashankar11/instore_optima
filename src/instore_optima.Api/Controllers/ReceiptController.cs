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
    public class ReceiptController : ControllerBase
    {
        private readonly IReceiptRepository _receiptRepo;

        public ReceiptController(IReceiptRepository receiptRepo)
        {
            _receiptRepo = receiptRepo;
        }

        // GET api/receipt
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetAll()
        {
            var receipts = await _receiptRepo.GetAllReceiptsAsync();
            return Ok(receipts.Select(MapToDto));
        }

        // GET api/receipt/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> GetById(int id)
        {
            var receipt = await _receiptRepo.GetReceiptByIdAsync(id);
            if (receipt == null)
                return NotFound(new { message = $"Receipt {id} not found" });

            return Ok(MapToDto(receipt));
        }

        // POST api/receipt
        [HttpPost]
        public async Task<ActionResult<ReceiptResponseDto>> Create([FromBody] CreateReceiptDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var receipt = new Receipt
            {
                PaymentId = dto.PaymentId,
                ReceiptNumber = dto.ReceiptNumber,
                AmountPaid = dto.AmountPaid,
                PaymentDate = dto.PaymentDate
                // GeneratedAt set inside repository
            };

            var created = await _receiptRepo.CreateReceiptAsync(receipt);
            return CreatedAtAction(nameof(GetById), new { id = created.ReceiptId }, MapToDto(created));
        }

        // PUT api/receipt/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> Update(
            int id, [FromBody] UpdateReceiptDto dto)
        {
            var existing = await _receiptRepo.GetReceiptByIdAsync(id);
            if (existing == null)
                return NotFound(new { message = $"Receipt {id} not found" });

            existing.ReceiptNumber = dto.ReceiptNumber;
            existing.AmountPaid = dto.AmountPaid;
            existing.PaymentDate = dto.PaymentDate;

            var updated = await _receiptRepo.UpdateReceiptAsync(existing);
            return Ok(MapToDto(updated));
        }

        private static ReceiptResponseDto MapToDto(Receipt r) => new()
        {
            ReceiptId = r.ReceiptId,
            PaymentId = r.PaymentId,
            ReceiptNumber = r.ReceiptNumber,
            AmountPaid = r.AmountPaid,
            PaymentDate = r.PaymentDate,
            GeneratedAt = r.GeneratedAt
        };
    }
}