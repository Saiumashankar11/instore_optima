// =============================================================================
// ConflictException.cs — 409 Conflict
// =============================================================================
// Throw this when an operation fails because of a state conflict — the most
// common case being a duplicate record (e.g. registering with an email that
// already exists). The global exception handler maps this to HTTP 409 Conflict.
// =============================================================================
namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when a conflict occurs (e.g., duplicate entity).
    /// Maps to HTTP 409 Conflict.
    /// </summary>
    public class ConflictException : ApplicationException
    {
        // Always uses the CONFLICT error code so the frontend can detect
        // duplicates and show the appropriate field-level error message.
        public ConflictException(string message)
            : base(message, "CONFLICT")
        {
        }
    }
}
