using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/support")]
    public class SupportController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ILogger<SupportController> _logger;

        public SupportController(IEmailService emailService, ILogger<SupportController> logger)
        {
            _emailService = emailService;
            _logger       = logger;
        }

        [HttpPost("contact")]
        public async Task<IActionResult> Contact([FromBody] ContactSupportDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _emailService.SendContactSupportEmailAsync(dto.Name, dto.Email, dto.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to forward support message from {Email}", dto.Email);
                return StatusCode(502, new { message = "Could not send message right now. Please try again later." });
            }

            _logger.LogInformation("Support message received from {Name} ({Email})", dto.Name, dto.Email);
            return Ok(new { message = "Message sent. We'll get back to you shortly." });
        }
    }
}
