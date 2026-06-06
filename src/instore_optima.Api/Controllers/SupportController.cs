// ── SupportController.cs ─────────────────────────────────────────────────────
// Handles the HTTP endpoint under the route  api/support.
//
// This controller processes "Contact Support" form submissions from the frontend.
// When a user fills in the contact form, this endpoint forwards the message to
// the support team via email.  If the email service is unavailable, the caller
// receives a 502 so the frontend can show a retry message.
//
// Authentication: no [Authorize] attribute — the contact form is publicly
// accessible so that even non-logged-in visitors can reach support.
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/support")]
    public class SupportController : ControllerBase
    {
        // ── Injected services ─────────────────────────────────────────────────
        private readonly IEmailService _emailService;          // Sends the support email via SMTP.
        private readonly ILogger<SupportController> _logger;  // Structured logging for failures.

        // Constructor — both services are provided by ASP.NET Core's DI container.
        public SupportController(IEmailService emailService, ILogger<SupportController> logger)
        {
            _emailService = emailService;
            _logger       = logger;
        }

        // ── POST api/support/contact ──────────────────────────────────────────
        /// <summary>
        /// POST api/support/contact
        /// Forwards a contact-support form submission to the support team by email.
        /// The body must contain Name, Email, and Message fields.
        /// Auth: none (publicly accessible — no JWT needed).
        /// Returns: 200 OK on success, 400 if the request body is invalid,
        ///          or 502 Bad Gateway if the email service is unavailable.
        /// </summary>
        [HttpPost("contact")]
        public async Task<IActionResult> Contact([FromBody] ContactSupportDto dto)
        {
            // Validate data-annotation rules (e.g. [Required], [EmailAddress]) before sending.
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Delegate the actual email delivery to the injected service.
                await _emailService.SendContactSupportEmailAsync(dto.Name, dto.Email, dto.Message);
            }
            catch (Exception ex)
            {
                // Log the SMTP/network failure so the operations team can investigate.
                // Return 502 to tell the frontend that the upstream email service failed —
                // distinct from a 500 (our bug) or a 400 (caller's bug).
                _logger.LogError(ex, "Failed to forward support message from {Email}", dto.Email);
                return StatusCode(502, new { message = "Could not send message right now. Please try again later." });
            }

            // Log a success event (informational level — not an error) for audit trails.
            _logger.LogInformation("Support message received from {Name} ({Email})", dto.Name, dto.Email);
            return Ok(new { message = "Message sent. We'll get back to you shortly." });
        }
    }
}
