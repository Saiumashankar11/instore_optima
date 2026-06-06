// DTO — the standard error payload returned by every API endpoint when something goes wrong.
// All error responses across the application share this shape so the frontend
// can handle them uniformly (show a toast, log the traceId, display field errors, etc.).
namespace instore_optima.Application.DTOs
{
    /// <summary>
    /// Standardized error response DTO.
    /// </summary>
    public class ErrorResponseDto
    {
        public bool Success { get; set; } = false;          // always false for error responses
        public string Message { get; set; } = string.Empty; // human-readable description of what went wrong
        public string ErrorCode { get; set; } = string.Empty; // machine-readable code for the error type, e.g. "NOT_FOUND", "VALIDATION_FAILED"
        public int StatusCode { get; set; }                  // mirrors the HTTP status code, e.g. 400, 404, 500
        public DateTime Timestamp { get; set; } = DateTime.UtcNow; // when the error occurred (UTC)
        public string? TraceId { get; set; }                 // ASP.NET request trace ID — useful for correlating logs in production
        public IDictionary<string, string[]>? Errors { get; set; } // per-field validation errors (key = field name, value = list of messages); null for non-validation errors

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