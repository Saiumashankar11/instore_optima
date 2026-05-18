namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Base application exception class for domain-specific exceptions.
    /// </summary>
    public class ApplicationException : Exception
    {
        public string ErrorCode { get; set; }

        public ApplicationException(string message, string errorCode = "APPLICATION_ERROR") 
            : base(message)
        {
            ErrorCode = errorCode;
        }

        public ApplicationException(string message, Exception innerException, string errorCode = "APPLICATION_ERROR") 
            : base(message, innerException)
        {
            ErrorCode = errorCode;
        }
    }
}
