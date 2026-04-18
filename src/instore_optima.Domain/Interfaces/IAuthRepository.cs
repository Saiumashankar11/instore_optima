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
        Task<User?> GetUserByEmailAsync(string email);
        Task<User> RegisterAsync(User user);
        Task LogAuditAsync(int userId, string action, string resourceType, int resourceId);
        string GenerateJwtToken(User user);
        string HashPassword(string plainTextPassword);
        bool VerifyPassword(string plainTextPassword, string hashedPassword);
    }
}
