namespace instore_optima.Api.Exceptions
{
    /// <summary>
    /// Exception thrown when a conflict occurs (e.g., duplicate entity).
    /// </summary>
    public class ConflictException : ApplicationException
    {
        public ConflictException(string message) 
            : base(message, "CONFLICT")
        {
        }
    }
}
