// =============================================================================
// UnauthorizedException.cs — 401 Unauthorized
// =============================================================================
// Throw this when a user tries to perform an action they are not allowed to
// do — for example, accessing another user's data or performing an admin-only
// operation without the Manager role. The global exception handler maps this
// to HTTP 401 Unauthorized.
//
// Note: ASP.NET Core's built-in UnauthorizedAccessException also maps to 401
// via the global handler, but using this class gives you the structured
// ErrorCode field in the JSON response.
// =============================================================================
namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when unauthorized access is attempted.
    /// Maps to HTTP 401 Unauthorized.
    /// </summary>
    public class UnauthorizedException : ApplicationException
    {
        public UnauthorizedException(string message)
            : base(message, "UNAUTHORIZED")
        {
        }
    }
}
