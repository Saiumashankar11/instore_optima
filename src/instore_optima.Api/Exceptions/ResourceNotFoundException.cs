// =============================================================================
// ResourceNotFoundException.cs — 404 Not Found
// =============================================================================
// Throw this when a controller or repository cannot find an entity by its ID.
// The global exception handler maps this to HTTP 404 Not Found so the client
// gets a meaningful error instead of a null reference exception.
// =============================================================================
namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when a requested resource is not found.
    /// Maps to HTTP 404 Not Found.
    /// </summary>
    public class ResourceNotFoundException : ApplicationException
    {
        // Convenience constructor: builds a standard message from the entity type
        // and ID, e.g. "Product with ID '42' not found."
        public ResourceNotFoundException(string resourceName, object id)
            : base($"{resourceName} with ID '{id}' not found.", "RESOURCE_NOT_FOUND")
        {
        }

        // Use this overload when you need a custom message (e.g. "No products match
        // the given filter") rather than a standard ID-based message.
        public ResourceNotFoundException(string message)
            : base(message, "RESOURCE_NOT_FOUND")
        {
        }
    }
}
