// =============================================================================
// InactiveUserMiddleware.cs — Runtime account-status gate
// =============================================================================
// A JWT token is valid for its entire lifetime (e.g. 24 hours) even if an
// administrator deactivates the account moments after the token was issued.
// Without this middleware a deactivated user could keep making API calls
// until their token expires.
//
// This middleware runs after UseAuthentication (so context.User is populated)
// and before UseAuthorization. For every authenticated request it performs a
// quick database lookup to check whether the user's Role is "Inactive". If so
// it short-circuits the pipeline and returns 401 immediately.
// =============================================================================
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

        // AppDbContext is injected per-request (Scoped) via the method parameter —
        // this is ASP.NET Core middleware's way of getting scoped services without
        // storing them as fields (which would make the middleware a singleton).
        public async Task InvokeAsync(HttpContext context, AppDbContext db)
        {
            // Only check authenticated requests — anonymous endpoints (e.g. /login)
            // are allowed through without any database lookup.
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = context.User.FindFirst("userId")?.Value
                               ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (int.TryParse(userIdClaim, out int userId))
                {
                    // AsNoTracking skips EF's change-tracking overhead since we
                    // are only reading — we don't plan to update this entity.
                    var user = await db.Users.AsNoTracking()
                        .FirstOrDefaultAsync(u => u.UserId == userId);

                    if (user == null || user.Role == "Inactive")
                    {
                        // Short-circuit: write 401 and return without calling _next,
                        // so the request never reaches a controller.
                        context.Response.StatusCode = 401;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(
                            "{\"message\":\"This account has been deactivated. Please contact an administrator.\"}");
                        return;
                    }
                }
            }

            // User is active (or request was anonymous) — continue down the pipeline.
            await _next(context);
        }
    }
}
