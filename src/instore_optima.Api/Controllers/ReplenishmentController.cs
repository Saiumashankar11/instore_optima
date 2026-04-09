using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReplenishmentController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReplenishmentController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("rules")]
        public async Task<IActionResult> GetRules()
        {
            return Ok(await _context.ReplenishmentRules.ToListAsync());
        }

        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            return Ok(await _context.ReplenishmentOrders.ToListAsync());
        }
    }
}
