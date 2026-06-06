// =============================================================================
// CrudLoggingFilter.cs — Action filter for human-readable CRUD logging
// =============================================================================
// An IActionFilter runs before and after every controller action. This one
// produces a simple "User X Created/Updated/Deleted Resource #Y" log line
// for every state-changing HTTP method (POST, PUT, PATCH, DELETE) so there
// is a human-readable audit trail in the application logs, separate from the
// EF-level AuditLog table.
//
// Read-only methods (GET) and the Auth controller are intentionally excluded
// to keep the logs concise.
// =============================================================================
using Microsoft.AspNetCore.Mvc.Filters;

namespace instore_optima.Api.Filters
{
    /// <summary>
    /// Global MVC action filter that logs a one-line summary after each
    /// mutating controller action (POST / PUT / PATCH / DELETE) completes
    /// without an exception.
    /// </summary>
    public class CrudLoggingFilter : IActionFilter
    {
        private readonly ILogger<CrudLoggingFilter> _logger;

        public CrudLoggingFilter(ILogger<CrudLoggingFilter> logger)
        {
            _logger = logger;
        }

        // OnActionExecuting fires BEFORE the action runs. Nothing to do here —
        // we only care about logging after a successful action.
        public void OnActionExecuting(ActionExecutingContext context) { }

        // OnActionExecuted fires AFTER the action runs. We skip logging if an
        // exception was thrown (the global exception middleware handles that).
        public void OnActionExecuted(ActionExecutedContext context)
        {
            if (context.Exception != null) return;

            var method = context.HttpContext.Request.Method;
            var controller = context.RouteData.Values["controller"]?.ToString();

            // Skip the Auth controller — login / register / token actions produce
            // a lot of noise and are already logged by Serilog request logging.
            if (controller == "Auth") return;
            var action = context.RouteData.Values["action"]?.ToString();
            // Route value "id" is present for /api/products/42 style URLs.
            var id = context.RouteData.Values["id"]?.ToString();
            // Prefer the user's display name from JWT claims; fall back to email,
            // then "anonymous" for unauthenticated requests.
            var user = context.HttpContext.User.FindFirst("name")?.Value
                    ?? context.HttpContext.User.FindFirst("email")?.Value
                    ?? "anonymous";

            // Map HTTP verb to a friendly past-tense verb for the log message.
            // GET / HEAD / OPTIONS return null and are skipped below.
            var operation = method switch
            {
                "POST"   => "Created",
                "PUT"    => "Updated",
                "PATCH"  => "Updated",
                "DELETE" => "Deleted",
                _        => null
            };

            if (operation == null) return;

            // Include the record ID in the log when it is part of the route.
            var resource = id != null ? $"{controller} #{id}" : controller;
            _logger.LogInformation("{User} {Operation} {Resource} via {Action}",
                user, operation, resource, action);
        }
    }
}
