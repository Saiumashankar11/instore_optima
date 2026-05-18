namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when unauthorized access is attempted.
    /// </summary>
    public class UnauthorizedException : ApplicationException
    {
        public UnauthorizedException(string message) 
            : base(message, "UNAUTHORIZED")
        {
        }
    }
}
