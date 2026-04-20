using instore_optima.Domain.Entities;

namespace instore_optima.Domain.Interfaces
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<User?> GetUserByIdAsync(int userId);
        Task<User> UpdateUserAsync(User user);
        Task DeleteUserAsync(int userId);  // Soft-delete preferred
    }
}