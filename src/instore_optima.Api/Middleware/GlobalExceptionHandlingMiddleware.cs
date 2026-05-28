using instore_optima.Application.DTOs;
using instore_optima.Api.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;

namespace instore_optima.Api.Middleware
{
    public class GlobalExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

        public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception exception)
            {
                await HandleExceptionAsync(context, exception);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var traceId = context.TraceIdentifier;
            var response = context.Response;
            response.ContentType = "application/json";

            var errorResponse = exception switch
            {
                ResourceNotFoundException ex =>
                    ErrorResponseDto.Create(ex.Message, ex.ErrorCode, (int)HttpStatusCode.NotFound, traceId),

                ValidationException ex =>
                    ErrorResponseDto.Create(ex.Message, ex.ErrorCode, (int)HttpStatusCode.BadRequest, traceId, ex.Errors),

                UnauthorizedException ex =>
                    ErrorResponseDto.Create(ex.Message, ex.ErrorCode, (int)HttpStatusCode.Unauthorized, traceId),

                UnauthorizedAccessException ex =>
                    ErrorResponseDto.Create(ex.Message, "UNAUTHORIZED", (int)HttpStatusCode.Unauthorized, traceId),

                ConflictException ex =>
                    ErrorResponseDto.Create(ex.Message, ex.ErrorCode, (int)HttpStatusCode.Conflict, traceId),

                DbUpdateException ex when ex.InnerException?.Message.Contains("FOREIGN KEY", StringComparison.OrdinalIgnoreCase) == true ||
                                         ex.InnerException?.Message.Contains("FK_", StringComparison.OrdinalIgnoreCase) == true =>
                    ErrorResponseDto.Create(
                        "This record cannot be deleted because it is still referenced by other data (e.g. orders, payments, or stock records). Remove those first.",
                        "FK_CONSTRAINT_VIOLATION",
                        (int)HttpStatusCode.Conflict,
                        traceId),

                Exceptions.ApplicationException ex =>
                    ErrorResponseDto.Create(ex.Message, ex.ErrorCode, (int)HttpStatusCode.InternalServerError, traceId),

                _ =>
                    ErrorResponseDto.Create("An unexpected error occurred.", "INTERNAL_SERVER_ERROR", (int)HttpStatusCode.InternalServerError, traceId)
            };

            response.StatusCode = errorResponse.StatusCode;

            _logger.LogError(exception, "Exception: {ErrorCode} | TraceId: {TraceId} | Message: {Message}",
                errorResponse.ErrorCode, traceId, exception.Message);

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            await response.WriteAsJsonAsync(errorResponse, options);
        }
    }
}
