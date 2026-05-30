using System;
using System.ComponentModel.DataAnnotations;

namespace instore_optima.Application.DTOs
{
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

        public int? ParentMessageId { get; set; }
        public string MessageType { get; set; } = "Request";
        public string? Cc  { get; set; }
        public string? Bcc { get; set; }
        public bool IsDraft { get; set; } = false;
        public DateTime? ScheduledAt { get; set; }
        public string? AttachmentsJson { get; set; }
    }

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
        public int? ParentMessageId { get; set; }
        public string MessageType { get; set; } = string.Empty;
        public string? Cc { get; set; }
        public string? Bcc { get; set; }
        public bool IsDraft { get; set; }
        public bool IsStarred { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public string? AttachmentsJson { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ActionType         { get; set; }
        public string? ActionPayload      { get; set; }
        public string? SenderDisplayName  { get; set; }
        public string? SenderDisplayEmail { get; set; }
    }

    public class UnreadCountDto
    {
        public int UnreadCount { get; set; }
    }

    public class StarMessageDto
    {
        public bool Starred { get; set; }
    }
}
