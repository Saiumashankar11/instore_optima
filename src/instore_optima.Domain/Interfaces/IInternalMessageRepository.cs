using instore_optima.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace instore_optima.Domain.Interfaces
{
    public interface IInternalMessageRepository
    {
        Task<IEnumerable<InternalMessage>> GetInboxAsync(int userId);
        Task<IEnumerable<InternalMessage>> GetSentAsync(int userId);
        Task<IEnumerable<InternalMessage>> GetDraftsAsync(int userId);
        Task<IEnumerable<InternalMessage>> GetStarredAsync(int userId);
        Task<IEnumerable<InternalMessage>> GetTrashAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);
        Task<InternalMessage?> GetByIdAsync(int messageId);
        Task<InternalMessage> SendMessageAsync(InternalMessage message);
        Task<InternalMessage> SaveDraftAsync(InternalMessage message);
        Task MarkAsReadAsync(int messageId, int userId);
        Task ToggleStarAsync(int messageId, int userId);
        Task MoveToTrashAsync(int messageId, int userId);
        Task DeleteAsync(int messageId, int userId, bool isSender);
        Task RestoreFromTrashAsync(int messageId, int userId);
    }
}
