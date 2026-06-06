// ── BaseApiController.cs ─────────────────────────────────────────────────────
// This is the shared base class that all other controllers in this project
// inherit from. It lives in the API layer and provides common helper methods
// so that each individual controller doesn't have to repeat the same logic.
// Currently it exposes a single helper: ValidateModelState().
// ─────────────────────────────────────────────────────────────────────────────
using instore_optima.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    /// <summary>
    /// Base controller with common validation helpers.
    /// All other API controllers inherit from this class to share its helpers.
    /// </summary>
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>
        /// Validates the incoming request's model state (i.e., whether the JSON
        /// payload satisfies all [Required], [Range], etc. data-annotation rules).
        /// If validation fails, it throws a <see cref="ValidationException"/> that
        /// the global exception handler will convert into a 422 Unprocessable Entity
        /// response with a structured list of field-level error messages.
        /// Call this at the top of any action method that accepts a request body.
        /// </summary>
        protected void ValidateModelState()
        {
            if (!ModelState.IsValid)
            {
                // Collect every field that has at least one error.
                // Key   = the field name (e.g. "Email").
                // Value = array of error messages for that field.
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value!.Errors.Select(e =>
                            string.IsNullOrEmpty(e.ErrorMessage)
                                ? e.Exception?.Message ?? "Invalid value" // fallback when the model binder throws an exception instead of a string message
                                : e.ErrorMessage
                        ).ToArray()
                    );
                throw new ValidationException(errors);
            }
        }
    }
}
