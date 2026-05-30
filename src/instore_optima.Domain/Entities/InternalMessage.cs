using System;

namespace instore_optima.Domain.Entities
{
    public class InternalMessage
    {
        public int MessageId { get; set; }
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public int? ParentMessageId { get; set; }

        // "Request", "Reply", "Forward"
        public string MessageType { get; set; } = "Request";

        // CC / BCC — comma-separated user IDs
        public string? Cc  { get; set; }
        public string? Bcc { get; set; }

        // Draft / Scheduled
        public bool IsDraft { get; set; } = false;
        public DateTime? ScheduledAt { get; set; }

        // Starred per-side
        public bool IsStarredBySender   { get; set; } = false;
        public bool IsStarredByReceiver { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // File attachments — stored as JSON array of {name, size, type, data}
        public string? AttachmentsJson { get; set; }

        // Soft-delete / trash per-side
        public bool DeletedBySender   { get; set; } = false;
        public bool DeletedByReceiver { get; set; } = false;

        // Moved to trash (before permanent delete)
        public bool TrashedBySender   { get; set; } = false;
        public bool TrashedByReceiver { get; set; } = false;

        // Actionable messages (e.g. "MARK_PO_DELIVERED")
        public string? ActionType    { get; set; }
        public string? ActionPayload { get; set; }

        // Display overrides — used by automated/system messages to show a virtual sender
        public string? SenderDisplayName  { get; set; }
        public string? SenderDisplayEmail { get; set; }
    }
}
