using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace instore_optima.Api.Middleware
{
    /// <summary>
    /// Checks on every authenticated request whether the user's account
    /// has been deactivated (Role = "Inactive"). If so, returns 401 so the
    /// frontend's axios interceptor immediately redirects to /login.
    /// </summary>
    public class InactiveUserMiddleware
    {
        private readonly RequestDelegate _next;

        public InactiveUserMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext db)
        {
            // Only check authenticated requests
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = context.User.FindFirst("userId")?.Value
                               ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (int.TryParse(userIdClaim, out int userId))
                {
                    var user = await db.Users.AsNoTracking()
                        .FirstOrDefaultAsync(u => u.UserId == userId);

                    if (user == null || user.Role == "Inactive")
                    {
                        context.Response.StatusCode = 401;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(
                            "{\"message\":\"This account has been deactivated. Please contact an administrator.\"}");
                        return;
                    }
                }
            }

            await _next(context);
        }
    }
}
