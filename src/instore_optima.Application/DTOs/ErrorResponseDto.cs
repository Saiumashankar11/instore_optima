namespace instore_optima.Application.DTOs
{
    /// <summary>
    /// Standardized error response DTO.
    /// </summary>
    public class ErrorResponseDto
    {
        public bool Success { get; set; } = false;
        public string Message { get; set; } = string.Empty;
        public string ErrorCode { get; set; } = string.Empty;
        public int StatusCode { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string? TraceId { get; set; }
        public IDictionary<string, string[]>? Errors { get; set; }

        public static ErrorResponseDto Create(
            string message, 
            string errorCode, 
            int statusCode, 
            string? traceId = null, 
            IDictionary<string, string[]>? errors = null)
        {
            return new ErrorResponseDto
            {
                Success = false,
                Message = message,
                ErrorCode = errorCode,
                StatusCode = statusCode,
                TraceId = traceId,
                Errors = errors
            };
        }
    }
}