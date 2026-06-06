// ── InternalMessageController ─────────────────────────────────────────────────
// Handles the internal messaging system under /api/messages.
// Provides inbox, sent, drafts, starred, and trash mailbox views,
// plus send, mark-read, star/unstar, trash, restore, and delete operations.
// All endpoints require a valid JWT (controller-level [Authorize]).
// ─────────────────────────────────────────────────────────────────────────────

// Domain and application namespaces for DTOs, entities, and repositories
using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/messages")]
    [Authorize] // Every endpoint in this controller requires a valid JWT
    public class InternalMessageController : BaseApiController
    {
        // _msgRepo  — data access for messages (inbox/sent/drafts/star/trash operations)
        // _userRepo — used to look up sender and receiver display names and roles
        private readonly IInternalMessageRepository _msgRepo;
        private readonly IUserRepository _userRepo;

        public InternalMessageController(IInternalMessageRepository msgRepo, IUserRepository userRepo)
        {
            _msgRepo  = msgRepo;
            _userRepo = userRepo;
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        // Reads the "userId" JWT claim and parses it as an integer.
        // Returns 0 if the claim is missing or cannot be parsed (guard check callers).
        private int GetCurrentUserId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }

        // Maps a raw InternalMessage entity to the MessageResponseDto that the API returns.
        // Looks up sender/receiver names from the user repository and resolves the
        // "isStarred" flag relative to the current viewer (sender vs. receiver each have
        // their own starred flag on the entity).
        private async Task<MessageResponseDto> ToDto(InternalMessage m, int viewerId)
        {
            var sender   = await _userRepo.GetUserByIdAsync(m.SenderId);
            var receiver = await _userRepo.GetUserByIdAsync(m.ReceiverId);
            // A message is starred for the viewer if they are the sender and starred it,
            // or they are the receiver and starred it.
            bool isStarred = (m.SenderId == viewerId && m.IsStarredBySender) ||
                             (m.ReceiverId == viewerId && m.IsStarredByReceiver);
            return new MessageResponseDto
            {
                MessageId           = m.MessageId,
                SenderId            = m.SenderId,
                // SenderDisplayName may be overridden (e.g. "System" for automated messages);
                // fall back to the database user name if not set.
                SenderName          = m.SenderDisplayName  ?? sender?.Name  ?? "Unknown",
                SenderRole          = m.SenderDisplayEmail ?? sender?.Role  ?? "",
                ReceiverId          = m.ReceiverId,
                ReceiverName        = receiver?.Name ?? "Unknown",
                ReceiverRole        = receiver?.Role ?? "",
                Subject             = m.Subject,
                Body                = m.Body,
                IsRead              = m.IsRead,
                ParentMessageId     = m.ParentMessageId,
                MessageType         = m.MessageType,
                Cc                  = m.Cc,
                Bcc                 = m.Bcc,
                IsDraft             = m.IsDraft,
                IsStarred           = isStarred,
                ScheduledAt         = m.ScheduledAt,
                AttachmentsJson     = m.AttachmentsJson,
                CreatedAt           = m.CreatedAt,
                ActionType          = m.ActionType,
                ActionPayload       = m.ActionPayload,
                SenderDisplayName   = m.SenderDisplayName,
                SenderDisplayEmail  = m.SenderDisplayEmail
            };
        }

        // ── Mailbox views ─────────────────────────────────────────────────────

        // GET /api/messages/inbox
        // Returns all non-trashed, non-draft messages sent TO the current user.
        [HttpGet("inbox")]
        public async Task<IActionResult> GetInbox()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetInboxAsync(userId);
            // Map each entity to a DTO (async, so we loop rather than use .Select())
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        // GET /api/messages/sent
        // Returns all sent (non-draft) messages FROM the current user.
        [HttpGet("sent")]
        public async Task<IActionResult> GetSent()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetSentAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        // GET /api/messages/drafts
        // Returns all saved drafts belonging to the current user (IsDraft = true).
        [HttpGet("drafts")]
        public async Task<IActionResult> GetDrafts()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetDraftsAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        // GET /api/messages/starred
        // Returns all messages the current user has starred, regardless of mailbox.
        [HttpGet("starred")]
        public async Task<IActionResult> GetStarred()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetStarredAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        // GET /api/messages/trash
        // Returns all messages the current user has moved to trash.
        [HttpGet("trash")]
        public async Task<IActionResult> GetTrash()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetTrashAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        // GET /api/messages/unread-count
        // Returns the number of unread inbox messages for the current user.
        // Used to show a badge on the messages icon in the UI.
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = GetCurrentUserId();
            var count  = await _msgRepo.GetUnreadCountAsync(userId);
            return Ok(new UnreadCountDto { UnreadCount = count });
        }

        // ── Recipients ────────────────────────────────────────────────────────

        // GET /api/messages/recipients
        // Returns the list of users the current user is allowed to message,
        // filtered by messaging hierarchy rules:
        //   Staff   → can only message Managers
        //   Manager → can message Admins and Staff
        //   Admin   → can only message Managers
        // Excludes the current user from their own recipient list.
        [HttpGet("recipients")]
        public async Task<IActionResult> GetRecipients()
        {
            var userId  = GetCurrentUserId();
            var me      = await _userRepo.GetUserByIdAsync(userId);
            if (me == null) return Unauthorized();
            var allUsers = await _userRepo.GetAllUsersAsync();
            // Role-based switch expression filters the allowed recipients
            IEnumerable<User> recipients = me.Role switch
            {
                "Staff"   => allUsers.Where(u => u.Role == "Manager" && u.UserId != userId),
                "Manager" => allUsers.Where(u => (u.Role == "Admin" || u.Role == "Staff") && u.UserId != userId),
                "Admin"   => allUsers.Where(u => u.Role == "Manager" && u.UserId != userId),
                _         => Enumerable.Empty<User>() // Unknown roles cannot message anyone
            };
            return Ok(recipients.Select(u => new { u.UserId, u.Name, u.Role, u.Email }));
        }

        // ── Send / Draft ──────────────────────────────────────────────────────

        // POST /api/messages
        // Sends a new message or saves it as a draft (dto.IsDraft = true).
        // Enforces the messaging hierarchy: Staff cannot message other Staff or Admins directly.
        // Returns 201 with the created message DTO.
        [HttpPost]
        public async Task<IActionResult> Send([FromBody] SendMessageDto dto)
        {
            ValidateModelState();
            var senderId = GetCurrentUserId();
            if (senderId == 0) return Unauthorized();

            // Look up both parties to validate they exist and to enforce role-based rules
            var sender   = await _userRepo.GetUserByIdAsync(senderId);
            var receiver = await _userRepo.GetUserByIdAsync(dto.ReceiverId);
            if (sender == null || receiver == null)
                return BadRequest(new { message = "Invalid sender or receiver." });

            // Enforce messaging hierarchy restrictions
            if (sender.Role == "Staff" && receiver.Role == "Staff")
                return BadRequest(new { message = "Staff can only send messages to Managers." });
            if (sender.Role == "Staff" && receiver.Role == "Admin")
                return BadRequest(new { message = "Staff must send messages to a Manager first." });

            var message = new InternalMessage
            {
                SenderId        = senderId,
                ReceiverId      = dto.ReceiverId,
                Subject         = dto.Subject,
                Body            = dto.Body,
                ParentMessageId = dto.ParentMessageId, // set when replying to an existing thread
                MessageType     = dto.MessageType,
                Cc              = dto.Cc,
                Bcc             = dto.Bcc,
                IsDraft          = dto.IsDraft,
                ScheduledAt      = dto.ScheduledAt,    // null means send immediately
                AttachmentsJson  = dto.AttachmentsJson  // JSON array of attachment metadata
            };

            // SaveDraftAsync sets IsDraft = true; SendMessageAsync marks it as sent
            var created = dto.IsDraft
                ? await _msgRepo.SaveDraftAsync(message)
                : await _msgRepo.SendMessageAsync(message);

            return StatusCode(201, await ToDto(created, senderId));
        }

        // ── Message actions ───────────────────────────────────────────────────

        // PUT /api/messages/{id}/read
        // Marks a message as read for the current user. Returns 204 No Content.
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            await _msgRepo.MarkAsReadAsync(id, GetCurrentUserId());
            return NoContent();
        }

        // PUT /api/messages/{id}/star
        // Toggles the starred flag for the current user on the specified message.
        // The flag is per-user (sender and receiver each have their own starred state).
        // Returns 204 No Content.
        [HttpPut("{id}/star")]
        public async Task<IActionResult> ToggleStar(int id)
        {
            await _msgRepo.ToggleStarAsync(id, GetCurrentUserId());
            return NoContent();
        }

        // PUT /api/messages/{id}/trash
        // Moves a message to the current user's trash folder. Returns 204 No Content.
        [HttpPut("{id}/trash")]
        public async Task<IActionResult> MoveToTrash(int id)
        {
            await _msgRepo.MoveToTrashAsync(id, GetCurrentUserId());
            return NoContent();
        }

        // PUT /api/messages/{id}/restore
        // Restores a trashed message back to its original mailbox. Returns 204 No Content.
        [HttpPut("{id}/restore")]
        public async Task<IActionResult> RestoreFromTrash(int id)
        {
            await _msgRepo.RestoreFromTrashAsync(id, GetCurrentUserId());
            return NoContent();
        }

        // DELETE /api/messages/{id}?sent={true|false}
        // Permanently deletes a message for the current user.
        // Pass ?sent=true when deleting from the Sent box so the repository knows
        // to clear the sender's copy rather than the receiver's. Returns 204 No Content.
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] bool sent = false)
        {
            await _msgRepo.DeleteAsync(id, GetCurrentUserId(), isSender: sent);
            return NoContent();
        }
    }
}
