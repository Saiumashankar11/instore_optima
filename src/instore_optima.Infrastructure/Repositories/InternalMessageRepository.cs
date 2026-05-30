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

        public async Task<IEnumerable<InternalMessage>> GetInboxAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => m.ReceiverId == userId && !m.IsDraft && !m.DeletedByReceiver && !m.TrashedByReceiver)
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        public async Task<IEnumerable<InternalMessage>> GetSentAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => m.SenderId == userId && !m.IsDraft && !m.DeletedBySender && !m.TrashedBySender)
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        public async Task<IEnumerable<InternalMessage>> GetDraftsAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => m.SenderId == userId && m.IsDraft && !m.DeletedBySender)
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        public async Task<IEnumerable<InternalMessage>> GetStarredAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => !m.IsDraft &&
                    ((m.SenderId == userId && m.IsStarredBySender && !m.DeletedBySender && !m.TrashedBySender) ||
                     (m.ReceiverId == userId && m.IsStarredByReceiver && !m.DeletedByReceiver && !m.TrashedByReceiver)))
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        public async Task<IEnumerable<InternalMessage>> GetTrashAsync(int userId) =>
            await _context.InternalMessages
                .Where(m => (m.SenderId == userId && m.TrashedBySender && !m.DeletedBySender) ||
                            (m.ReceiverId == userId && m.TrashedByReceiver && !m.DeletedByReceiver))
                .OrderByDescending(m => m.CreatedAt).ToListAsync();

        public async Task<int> GetUnreadCountAsync(int userId) =>
            await _context.InternalMessages
                .CountAsync(m => m.ReceiverId == userId && !m.IsRead && !m.IsDraft && !m.DeletedByReceiver && !m.TrashedByReceiver);

        public async Task<InternalMessage?> GetByIdAsync(int messageId) =>
            await _context.InternalMessages.FirstOrDefaultAsync(m => m.MessageId == messageId);

        public async Task<InternalMessage> SendMessageAsync(InternalMessage message)
        {
            message.CreatedAt = DateTime.UtcNow;
            message.IsRead    = false;
            message.IsDraft   = false;
            _context.InternalMessages.Add(message);
            await _context.SaveChangesAsync();
            return message;
        }

        public async Task<InternalMessage> SaveDraftAsync(InternalMessage message)
        {
            message.CreatedAt = DateTime.UtcNow;
            message.IsDraft   = true;
            _context.InternalMessages.Add(message);
            await _context.SaveChangesAsync();
            return message;
        }

        public async Task MarkAsReadAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages
                .FirstOrDefaultAsync(m => m.MessageId == messageId && m.ReceiverId == userId);
            if (msg != null) { msg.IsRead = true; await _context.SaveChangesAsync(); }
        }

        public async Task ToggleStarAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            if (msg.SenderId == userId)        msg.IsStarredBySender   = !msg.IsStarredBySender;
            else if (msg.ReceiverId == userId) msg.IsStarredByReceiver = !msg.IsStarredByReceiver;
            await _context.SaveChangesAsync();
        }

        public async Task MoveToTrashAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            if (msg.SenderId == userId)   msg.TrashedBySender   = true;
            if (msg.ReceiverId == userId) msg.TrashedByReceiver = true;
            await _context.SaveChangesAsync();
        }

        public async Task RestoreFromTrashAsync(int messageId, int userId)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            if (msg.SenderId == userId)   msg.TrashedBySender   = false;
            if (msg.ReceiverId == userId) msg.TrashedByReceiver = false;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int messageId, int userId, bool isSender)
        {
            var msg = await _context.InternalMessages.FindAsync(messageId);
            if (msg == null) return;
            if (isSender && msg.SenderId == userId)        msg.DeletedBySender   = true;
            else if (!isSender && msg.ReceiverId == userId) msg.DeletedByReceiver = true;
            await _context.SaveChangesAsync();
        }
    }
}
