// IAuthRepository — contract for all authentication-related operations.
// Covers user look-up by email, registration, JWT token generation,
// password hashing/verification, and writing audit log entries on auth events.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IAuthRepository
    {
        /// <summary>Finds a user record by email address. Returns null if no match exists.</summary>
        Task<User?> GetUserByEmailAsync(string email);

        /// <summary>Persists a new User entity to the database and returns it with its generated ID.</summary>
        Task<User> RegisterAsync(User user);

        /// <summary>
        /// Writes an audit log entry recording that <paramref name="userId"/> performed
        /// <paramref name="action"/> on <paramref name="resourceType"/> with the given <paramref name="resourceId"/>.
        /// </summary>
        Task LogAuditAsync(int userId, string action, string resourceType, int resourceId);

        /// <summary>
        /// Builds and signs a JWT bearer token for the given user.
        /// The token embeds the user's ID, name, email, and role as claims and expires after 8 hours.
        /// </summary>
        string GenerateJwtToken(User user);

        /// <summary>Hashes a plain-text password using BCrypt. Always store the hash, never the original.</summary>
        string HashPassword(string plainTextPassword);

        /// <summary>Verifies a plain-text password against a previously stored BCrypt hash. Returns true on match.</summary>
        bool VerifyPassword(string plainTextPassword, string hashedPassword);
    }
}
