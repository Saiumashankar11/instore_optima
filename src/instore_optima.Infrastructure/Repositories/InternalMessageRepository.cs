// InternalMessageRepository — EF Core data access for the InternalMessage entity.
// Implements the in-app messaging system. Messages are never hard-deleted from the database;
// instead, per-user boolean flags (TrashedBy*, DeletedBy*, IsStarredBy*) control visibility.
// This means both the sender and receiver maintain independent views of the same message row.
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using instore_optima.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace instore_optima.Infrastructure.Repositories
{
    public class InternalMessageRepository : IInternalMessageRepository
    {
        private readonly AppDbContext _context;
        public InternalMessageRepository(AppDbContext context) { _context = context; }

        // Returns messages where this user is the receiver, excluding drafts/trashed/deleted rows
        public async Task<IEnumerable<InternalMessage>> GetInboxAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => m.ReceiverId == userId && !m.IsDraft && !m.DeletedByReceiver && !m.TrashedByReceiver)
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        // Returns sent messages (from this user), excluding drafts/trashed/deleted rows
        public async Task<IEnumerable<InternalMessage>> GetSentAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => m.SenderId == userId && !m.IsDraft && !m.DeletedBySender && !m.TrashedBySender)
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        // Returns messages this user saved as drafts; drafts only exist from the sender's perspective
        public async Task<IEnumerable<InternalMessage>> GetDraftsAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => m.SenderId == userId && m.IsDraft && !m.DeletedBySender)
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        // Returns starred messages for the user whether they are the sender or receiver
        // The || handles the case where a user stars a message in their inbox vs sent folder
        public async Task<IEnumerable<InternalMessage>> GetStarredAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => !m.IsDraft &&
                    ((m.SenderId == userId && m.IsStarredBySender && !m.DeletedBySender && !m.TrashedBySender) ||
                     (m.ReceiverId == userId && m.IsStarredByReceiver && !m.DeletedByReceiver && !m.TrashedByReceiver)))
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        // Trash shows messages that are flagged trashed but not yet permanently deleted
        public async Task<IEnumerable<InternalMessage>> GetTrashAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => (m.SenderId == userId && m.TrashedBySender && !m.DeletedBySender) ||
                            (m.ReceiverId == userId && m.TrashedByReceiver && !m.DeletedByReceiver))
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        // Counts unread inbox messages (excludes drafts, trashed, and deleted)
        public async Task<int> GetUnreadCountAsync(int userId) =>
            await _context.InternalMessages
                .CountAsync(m => m.ReceiverId == userId && !m.IsRead && !m.IsDraft && !m.DeletedByReceiver && !m.TrashedByReceiver);

        // Fetches a single message by PK — used before perform operations like star/trash/delete
        public async Task<InternalMessage?> GetByIdAsync(int messageId) =>
            await _context.InternalMessages.FirstOrDefaultAsync(m => m.MessageId == messageId);

        public async Task<InternalMessage> SendMessageAsync(InternalMessage message)
        {
            message.CreatedAt = DateTime.UtcNow;
            message.IsRead    = false;   // starts unread from the receiver's perspective
            message.IsDraft   = false;   // mark as sent, not a draft
            _context.InternalMessages.Add(message);
            await _context.SaveChangesAsync();
            return message;
        }

        public async Task<InternalMessage> SaveDraftAsync(InternalMessage message)
        {
            message.CreatedAt = DateTime.UtcNow;
            message.IsDraft   = true;   // will not appear in the recipient's inbox until explicitly sent
            _context.InternalMessages.Add(message);
            await _context.SaveChangesAsync();
            return message;
        }

        public async Task MarkAsReadAsync(int messageId, int userId)
        {
            // Filter by both messageId AND userId to prevent one user from marking another's message read
            var msg = await _context.InternalMessages
                .FirstOrDefaultAsync(m => m.MessageId == messageId && m.ReceiverId == userId);
            if (msg != null) { msg.IsRead = true; await _context.SaveChangesAsync(); }
        }

        public async Task ToggleStarAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            // Separate star flags ensure the sender's star and receiver's star are independent
            if (msg.SenderId == userId)        msg.IsStarredBySender   = !msg.IsStarredBySender;
            else if (msg.ReceiverId == userId) msg.IsStarredByReceiver = !msg.IsStarredByReceiver;
            await _context.SaveChangesAsync();
        }

        public async Task MoveToTrashAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            // Both parties can trash their view independently; the other party is unaffected
            if (msg.SenderId == userId)   msg.TrashedBySender   = true;
            if (msg.ReceiverId == userId) msg.TrashedByReceiver = true;
            await _context.SaveChangesAsync();
        }

        public async Task RestoreFromTrashAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            // Clears the Trashed flag so the message reappears in inbox/sent
            if (msg.SenderId == userId)   msg.TrashedBySender   = false;
            if (msg.ReceiverId == userId) msg.TrashedByReceiver = false;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int messageId, int userId, bool isSender)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            // Soft delete: set the relevant Deleted flag so the row is hidden from that user's view
            if (isSender && msg.SenderId == userId)        msg.DeletedBySender   = true;
            else if (!isSender && msg.ReceiverId == userId) msg.DeletedByReceiver = true;
            await _context.SaveChangesAsync();
        }
    }
}
