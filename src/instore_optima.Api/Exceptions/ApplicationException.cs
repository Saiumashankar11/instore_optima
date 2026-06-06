// =============================================================================
// ApplicationException.cs — Base class for all custom application exceptions
// =============================================================================
// Instead of throwing the built-in System.Exception everywhere, domain code
// throws subtypes of this class. Each subtype carries a machine-readable
// ErrorCode string that the GlobalExceptionHandlingMiddleware pattern-matches
// on to decide the correct HTTP status code and response body.
// =============================================================================
namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Base application exception class for domain-specific exceptions.
    /// All custom exceptions in this project inherit from this base so the
    /// global exception handler can catch them in one place.
    /// </summary>
    public class ApplicationException : Exception
    {
        // A short, UPPER_SNAKE_CASE code sent to the client so the frontend
        // can display a localised or specific error message (e.g. "RESOURCE_NOT_FOUND").
        public string ErrorCode { get; set; }

        // Use when you have a plain error message with no underlying cause.
        public ApplicationException(string message, string errorCode = "APPLICATION_ERROR")
            : base(message)
        {
            ErrorCode = errorCode;
        }

        // Use when wrapping a lower-level exception (innerException) with more context.
        public ApplicationException(string message, Exception innerException, string errorCode = "APPLICATION_ERROR")
            : base(message, innerException)
        {
            ErrorCode = errorCode;
        }
    }
}
