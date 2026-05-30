using Microsoft.AspNetCore.Mvc.Filters;

namespace instore_optima.Api.Filters
{
    public class CrudLoggingFilter : IActionFilter
    {
        private readonly ILogger<CrudLoggingFilter> _logger;

        public CrudLoggingFilter(ILogger<CrudLoggingFilter> logger)
        {
            _logger = logger;
        }

        public void OnActionExecuting(ActionExecutingContext context) { }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            if (context.Exception != null) return;

            var method = context.HttpContext.Request.Method;
            var controller = context.RouteData.Values["controller"]?.ToString();

            if (controller == "Auth") return;
            var action = context.RouteData.Values["action"]?.ToString();
            var id = context.RouteData.Values["id"]?.ToString();
            var user = context.HttpContext.User.FindFirst("name")?.Value
                    ?? context.HttpContext.User.FindFirst("email")?.Value
                    ?? "anonymous";

            var operation = method switch
            {
                "POST"   => "Created",
                "PUT"    => "Updated",
                "PATCH"  => "Updated",
                "DELETE" => "Deleted",
                _        => null
            };

            if (operation == null) return;

            var resource = id != null ? $"{controller} #{id}" : controller;
            _logger.LogInformation("{User} {Operation} {Resource} via {Action}",
                user, operation, resource, action);
        }
    }
}
