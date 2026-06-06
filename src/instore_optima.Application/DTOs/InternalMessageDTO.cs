using System;
using System.ComponentModel.DataAnnotations;

// DTOs — request/response shapes for the internal messaging feature.
// These mirror the InternalMessage entity but expose only what the API caller needs to send or receive.
namespace instore_optima.Application.DTOs
{
    // Request body for POST /api/messages — creates a new message or saves a draft.
    public class SendMessageDto
    {
        [Required(ErrorMessage = "ReceiverId is required.")]
        public int ReceiverId { get; set; }

        [Required(ErrorMessage = "Subject is required.")]
        [StringLength(200, MinimumLength = 1)]
        public string Subject { get; set; } = string.Empty;

        [Required(ErrorMessage = "Body is required.")]
        [StringLength(5000, MinimumLength = 1)]
        public string Body { get; set; } = string.Empty;

        public int? ParentMessageId { get; set; }             // if set, this is a reply/forward to that message
        public string MessageType { get; set; } = "Request"; // "Request", "Reply", or "Forward"
        public string? Cc  { get; set; }                     // comma-separated user IDs to CC
        public string? Bcc { get; set; }                     // comma-separated user IDs to BCC
        public bool IsDraft { get; set; } = false;           // true = save without sending
        public DateTime? ScheduledAt { get; set; }           // if set, send at this future time instead of immediately
        public string? AttachmentsJson { get; set; }         // JSON array of file attachments: [{name, size, type, data}]
    }

    // Response shape returned for every message read or listed via the API.
    public class MessageResponseDto
    {
        public int MessageId { get; set; }
        public int SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string SenderRole { get; set; } = string.Empty;
        public int ReceiverId { get; set; }
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverRole { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public int? ParentMessageId { get; set; }             // null for top-level messages; set for replies/forwards
        public string MessageType { get; set; } = string.Empty; // "Request", "Reply", or "Forward"
        public string? Cc { get; set; }
        public string? Bcc { get; set; }
        public bool IsDraft { get; set; }
        public bool IsStarred { get; set; }          // caller-relative: true if the current user has starred this message
        public DateTime? ScheduledAt { get; set; }
        public string? AttachmentsJson { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ActionType         { get; set; }       // optional machine-readable action, e.g. "MARK_PO_DELIVERED"
        public string? ActionPayload      { get; set; }       // JSON data associated with ActionType
        public string? SenderDisplayName  { get; set; }       // override shown instead of the real sender's name (used by system messages)
        public string? SenderDisplayEmail { get; set; }       // override shown instead of the real sender's email (used by system messages)
    }

    // Returned by GET /api/messages/unread-count.
    public class UnreadCountDto
    {
        public int UnreadCount { get; set; } // number of messages in the user's inbox that have not been read
    }

    // Request body for PUT /api/messages/{id}/star.
    public class StarMessageDto
    {
        public bool Starred { get; set; } // true = add star; false = remove star
    }
}
