// UserRepository — EF Core data access for the User entity via AppDbContext.
// Handles post-registration user management: list, get, update, and soft-delete.
// Registration and login are handled separately by AuthRepository.
// Soft-delete: "deleting" a user sets their Role to "Inactive" rather than removing
// the database row, so audit log entries and historical order data remain valid.
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        // Inject AppDbContext — DO NOT modify it, Uma owns it
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        // GET all users — includes inactive accounts (Role = "Inactive")
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        // GET single user by ID — returns null if not found
        public async Task<User?> GetUserByIdAsync(int userId)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);
        }

        // UPDATE user details — EF Update marks all columns modified; caller provides all fields
        public async Task<User> UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return user;
        }

        // SOFT-DELETE — sets Role to Inactive instead of removing row
        // This preserves foreign-key references in AuditLogs and Orders
        public async Task DeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.Role = "Inactive";  // the user can no longer log in; their data remains intact
                await _context.SaveChangesAsync();
            }
        }
    }
}