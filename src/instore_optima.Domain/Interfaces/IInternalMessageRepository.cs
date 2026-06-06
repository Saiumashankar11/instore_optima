// IInternalMessageRepository — contract for the in-app messaging system.
// Manages inbox, sent items, drafts, starred, and trash folders on a per-user basis.
// Deletion is soft: messages are flagged per-user (DeletedBySender / DeletedByReceiver)
// so the other party still sees their copy.
using instore_optima.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace instore_optima.Domain.Interfaces
{
    public interface IInternalMessageRepository
    {
        /// <summary>Returns all non-draft, non-deleted, non-trashed messages received by the user.</summary>
        Task<IEnumerable<InternalMessage>> GetInboxAsync(int userId);

        /// <summary>Returns all non-draft, non-deleted, non-trashed messages sent by the user.</summary>
        Task<IEnumerable<InternalMessage>> GetSentAsync(int userId);

        /// <summary>Returns messages that the user saved as drafts (not yet sent).</summary>
        Task<IEnumerable<InternalMessage>> GetDraftsAsync(int userId);

        /// <summary>Returns messages that the user has starred, from either their sent or received folders.</summary>
        Task<IEnumerable<InternalMessage>> GetStarredAsync(int userId);

        /// <summary>Returns messages the user moved to trash but has not permanently deleted.</summary>
        Task<IEnumerable<InternalMessage>> GetTrashAsync(int userId);

        /// <summary>Returns the count of unread messages in the user's inbox.</summary>
        Task<int> GetUnreadCountAsync(int userId);

        /// <summary>Fetches a single message by its primary key. Returns null if not found.</summary>
        Task<InternalMessage?> GetByIdAsync(int messageId);

        /// <summary>Persists a new message as "sent" (IsDraft = false) and returns it with its generated ID.</summary>
        Task<InternalMessage> SendMessageAsync(InternalMessage message);

        /// <summary>Persists a new message as a draft (IsDraft = true). Can be sent later.</summary>
        Task<InternalMessage> SaveDraftAsync(InternalMessage message);

        /// <summary>Marks the specified message as read. Only affects messages where the user is the receiver.</summary>
        Task MarkAsReadAsync(int messageId, int userId);

        /// <summary>
        /// Toggles the star flag for the given user. The star is tracked separately for
        /// the sender (IsStarredBySender) and receiver (IsStarredByReceiver).
        /// </summary>
        Task ToggleStarAsync(int messageId, int userId);

        /// <summary>Moves the message to the user's trash. Sets the appropriate Trashed flag without deleting.</summary>
        Task MoveToTrashAsync(int messageId, int userId);

        /// <summary>
        /// Permanently (soft) deletes the message for the given user.
        /// Pass <paramref name="isSender"/> = true to delete from the sender's view, false for the receiver's view.
        /// </summary>
        Task DeleteAsync(int messageId, int userId, bool isSender);

        /// <summary>Restores a trashed message back to the user's normal folder (clears the Trashed flag).</summary>
        Task RestoreFromTrashAsync(int messageId, int userId);
    }
}
