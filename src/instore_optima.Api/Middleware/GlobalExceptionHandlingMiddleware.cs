// =============================================================================
// GlobalExceptionHandlingMiddleware.cs — Centralized error handling
// =============================================================================
// Without this middleware any unhandled exception would cause ASP.NET Core to
// return a plain 500 HTML page to the client, leaking stack traces and giving
// the frontend nothing useful to display.
//
// This middleware wraps the entire request pipeline in a try/catch. When an
// exception escapes, it pattern-matches the exception type to decide the
// correct HTTP status code (404, 400, 401, 409, 500, …) and returns a
// consistent JSON error payload that the React frontend can parse.
//
// It is registered FIRST in Program.cs so it catches errors from every other
// middleware and controller further down the pipeline.
// =============================================================================
using instore_optima.Application.DTOs;
using instore_optima.Api.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;

namespace instore_optima.Api.Middleware
{
    /// <summary>
    /// ASP.NET Core middleware that catches all unhandled exceptions and converts
    /// them into structured JSON error responses with an appropriate HTTP status.
    /// </summary>
    public class GlobalExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

        public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        // InvokeAsync is called for every HTTP request. The middleware passes the
        // request to the next component in the pipeline (_next). If anything in
        // the pipeline throws, the catch block intercepts it here.
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
            // TraceIdentifier is a unique ID for this request, included in the error
            // response so support staff can correlate client-reported errors with
            // server-side log entries.
            var traceId = context.TraceIdentifier;
            var response = context.Response;
            response.ContentType = "application/json";

            // Switch-expression: match the exception type and build the right error DTO.
            // Custom application exceptions carry a machine-readable ErrorCode field
            // so the frontend can show specific error messages rather than generic ones.
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

                // EF throws DbUpdateException when SQL Server rejects the operation.
                // A foreign-key violation (e.g. deleting a supplier that still has
                // products) would normally surface as a cryptic 500 error; we catch
                // it here and return a user-friendly 409 Conflict with a clear message.
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
