using instore_optima.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    /// <summary>
    /// Base controller with common validation helpers.
    /// </summary>
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>
        /// Validates ModelState and throws ValidationException with proper field mapping if invalid.
        /// </summary>
        protected void ValidateModelState()
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value!.Errors.Select(e => 
                            string.IsNullOrEmpty(e.ErrorMessage) 
                                ? e.Exception?.Message ?? "Invalid value" 
                                : e.ErrorMessage
                        ).ToArray()
                    );
                throw new ValidationException(errors);
            }
        }
    }
}
