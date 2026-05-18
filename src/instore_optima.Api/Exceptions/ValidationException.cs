namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when validation fails.
    /// </summary>
    public class ValidationException : ApplicationException
    {
        public IDictionary<string, string[]> Errors { get; }

        public ValidationException(string message) 
            : base(message, "VALIDATION_ERROR")
        {
            Errors = new Dictionary<string, string[]>();
        }

        public ValidationException(IDictionary<string, string[]> errors) 
            : base("One or more validation errors occurred.", "VALIDATION_ERROR")
        {
            Errors = errors;
        }
    }
}
