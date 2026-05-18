namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when a requested resource is not found.
    /// </summary>
    public class ResourceNotFoundException : ApplicationException
    {
        public ResourceNotFoundException(string resourceName, object id) 
            : base($"{resourceName} with ID '{id}' not found.", "RESOURCE_NOT_FOUND")
        {
        }

        public ResourceNotFoundException(string message) 
            : base(message, "RESOURCE_NOT_FOUND")
        {
        }
    }
}
