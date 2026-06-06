// =============================================================================
// ValidationException.cs — 400 Bad Request (validation failure)
// =============================================================================
// Throw this when incoming data from the client fails business-rule validation
// that model binding / data annotations do not catch. The Errors dictionary
// maps field names to arrays of error messages (the same shape as the built-in
// ModelState so the frontend can highlight specific form fields).
//
// The global exception handler maps this to HTTP 400 Bad Request and includes
// the Errors dictionary in the JSON response body.
// =============================================================================
namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when validation fails.
    /// Maps to HTTP 400 Bad Request and carries per-field error details.
    /// </summary>
    public class ValidationException : ApplicationException
    {
        // Per-field errors, e.g. { "Email": ["Email is required", "Email is invalid"] }.
        // The frontend uses these to show inline error messages on form fields.
        public IDictionary<string, string[]> Errors { get; }

        // Use when you have a single top-level message and no per-field details.
        public ValidationException(string message)
            : base(message, "VALIDATION_ERROR")
        {
            Errors = new Dictionary<string, string[]>();
        }

        // Use when you have per-field validation errors (e.g. from a validator).
        public ValidationException(IDictionary<string, string[]> errors)
            : base("One or more validation errors occurred.", "VALIDATION_ERROR")
        {
            Errors = errors;
        }
    }
}
