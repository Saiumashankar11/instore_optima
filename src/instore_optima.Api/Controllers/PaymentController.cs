using Application.Interfaces;
using Application.DTOs.PaymentDTOs;
using instore_optima.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IGenericRepository<Payment> _repository;

        public PaymentController(IGenericRepository<Payment> repository)
        {
            _repository = repository;
        }

        // ✅ GET ALL
        [HttpGet]
        public async Task<IActionResult> GetPayments()
        {
            var payments = await _repository.GetAllAsync();

            var result = payments.Select(p => new PaymentResponseDto
            {
                PaymentId = p.PaymentId,
                OrderId = p.OrderId,
                Price = p.Price,
                PaymentMethod = p.PaymentMethod,
                PaymentStatus = p.PaymentStatus,
                PaymentDate = p.PaymentDate
            }).ToList();

            return Ok(result);
        }

        // ✅ GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPayment(int id)
        {
            var payment = await _repository.GetByIdAsync(id);
            if (payment == null)
                return NotFound(new { message = "Payment not found" });

            var dto = new PaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                OrderId = payment.OrderId,
                Price = payment.Price,
                PaymentMethod = payment.PaymentMethod,
                PaymentStatus = payment.PaymentStatus,
                PaymentDate = payment.PaymentDate
            };

            return Ok(dto);
        }

        // ✅ POST
        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] PaymentCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var payment = new Payment
            {
                OrderId = dto.OrderId,
                Price = dto.Price,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = dto.PaymentStatus,
                PaymentDate = DateTime.Now
            };

            await _repository.AddAsync(payment);
            await _repository.SaveAsync();

            var responseDto = new PaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                OrderId = payment.OrderId,
                Price = payment.Price,
                PaymentMethod = payment.PaymentMethod,
                PaymentStatus = payment.PaymentStatus,
                PaymentDate = payment.PaymentDate
            };

            return CreatedAtAction(nameof(GetPayment), new { id = payment.PaymentId }, responseDto);
        }

        // ✅ PUT
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayment(int id, [FromBody] PaymentUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var payment = await _repository.GetByIdAsync(id);
            if (payment == null)
                return NotFound(new { message = "Payment not found" });

            payment.Price = dto.Price;
            payment.PaymentMethod = dto.PaymentMethod;
            payment.PaymentStatus = dto.PaymentStatus;

            _repository.Update(payment);
            await _repository.SaveAsync();

            var responseDto = new PaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                OrderId = payment.OrderId,
                Price = payment.Price,
                PaymentMethod = payment.PaymentMethod,
                PaymentStatus = payment.PaymentStatus,
                PaymentDate = payment.PaymentDate
            };

            return Ok(responseDto);
        }

        // ✅ DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var payment = await _repository.GetByIdAsync(id);
            if (payment == null)
                return NotFound(new { message = "Payment not found" });

            _repository.Delete(payment);
            await _repository.SaveAsync();

            return Ok(new { message = "Payment deleted successfully" });
        }
    }
}
