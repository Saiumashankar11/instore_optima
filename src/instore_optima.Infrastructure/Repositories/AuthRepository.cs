// instore_optima.Infrastructure/Repositories/AuthRepository.cs
// AuthRepository — EF Core + JWT implementation of IAuthRepository.
// Handles user look-up by email, registration, JWT token generation (HS256),
// BCrypt password hashing/verification, and writing audit log entries.
// JWT settings (Key, Issuer, Audience) are read from appsettings.json / env vars via IConfiguration.

using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace instore_optima.Infrastructure.Repositories
{
    public class AuthRepository : IAuthRepository
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;  // provides JWT settings from appsettings.json

        public AuthRepository(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // ─── Get User By Email ────────────────────────────────
        public async Task<User?> GetUserByEmailAsync(string email)
        {
            // Email is the unique login identifier; returns null if no matching account exists
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        // ─── Register ─────────────────────────────────────────
        public async Task<User> RegisterAsync(User user)
        {
            // Caller is responsible for hashing the password before passing the User object
            _context.Users.Add(user);
            await _context.SaveChangesAsync();  // EF assigns the generated UserId
            return user;
        }

        // ─── Log Audit ────────────────────────────────────────
        public async Task LogAuditAsync(int userId, string action,
                                 string resourceType, int resourceId)
        {
            // Builds a simple audit record: who (userId), what (action + resourceType + resourceId)
            var log = new AuditLog
            {
                UserId = userId,
                Action = action,
                EntityType = resourceType,
                EntityId = resourceId,
                Description = $"{action} performed on {resourceType} (ID: {resourceId})",
                OldValues = "N/A",        // ← add this
                NewValues = "N/A",        // ← add this
                CreatedAt = DateTime.UtcNow
            };

            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        // ─── Generate JWT Token ───────────────────────────────
        public string GenerateJwtToken(User user)
        {
            // Read the secret signing key from configuration (must be ≥ 256 bits for HS256)
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

            // HMAC-SHA256 is the signing algorithm — common and secure for JWTs
            var credentials = new SigningCredentials(
                key, SecurityAlgorithms.HmacSha256);

            // Claims are key-value pairs embedded in the token payload; the frontend reads these
            var claims = new[]
            {
                new Claim("userId", user.UserId.ToString()),
                new Claim("name",   user.Name),
                new Claim("email",  user.Email),
                new Claim("role",   user.Role)   // used for role-based authorization
            };

            // Assemble the token with issuer, audience, claims, 8-hour expiry, and signature
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),  // sessions last 8 hours
                signingCredentials: credentials
            );

            // Serialize the token to the compact "xxx.yyy.zzz" string the client sends in headers
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // ─── Hash Password ────────────────────────────────────
        public string HashPassword(string plainTextPassword)
        {
            // BCrypt automatically generates a random salt and embeds it in the hash string
            return BCrypt.Net.BCrypt.HashPassword(plainTextPassword);
        }

        // ─── Verify Password ──────────────────────────────────
        public bool VerifyPassword(string plainTextPassword, string hashedPassword)
        {
            // BCrypt.Verify extracts the salt from the stored hash and re-hashes to compare
            return BCrypt.Net.BCrypt.Verify(plainTextPassword, hashedPassword);
        }
    }
}