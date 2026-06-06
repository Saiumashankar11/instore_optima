// IUserRepository — contract for managing User records post-registration.
// Registration and authentication are handled by IAuthRepository.
// Deletion is soft: the user's Role is set to "Inactive" rather than removing the row,
// so audit logs and historical data that reference the user remain valid.
using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IUserRepository
    {
        /// <summary>Returns all user accounts in the system (including inactive ones).</summary>
        Task<IEnumerable<User>> GetAllUsersAsync();

        /// <summary>Returns a single user by their primary key. Returns null if not found.</summary>
        Task<User?> GetUserByIdAsync(int userId);

        /// <summary>Updates a user record (uses EF Update — all tracked fields are overwritten).</summary>
        Task<User> UpdateUserAsync(User user);

        /// <summary>Soft-deletes a user by setting their Role to "Inactive". The row is not removed.</summary>
        Task DeleteUserAsync(int userId);  // Soft-delete preferred
    }
}