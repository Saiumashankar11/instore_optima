using instore_optima.Application.DTOs;
using instore_optima.Domain.Entities;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/messages")]
    [Authorize]
    public class InternalMessageController : BaseApiController
    {
        private readonly IInternalMessageRepository _msgRepo;
        private readonly IUserRepository _userRepo;

        public InternalMessageController(IInternalMessageRepository msgRepo, IUserRepository userRepo)
        {
            _msgRepo  = msgRepo;
            _userRepo = userRepo;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }

        private async Task<MessageResponseDto> ToDto(InternalMessage m, int viewerId)
        {
            var sender   = await _userRepo.GetUserByIdAsync(m.SenderId);
            var receiver = await _userRepo.GetUserByIdAsync(m.ReceiverId);
            bool isStarred = (m.SenderId == viewerId && m.IsStarredBySender) ||
                             (m.ReceiverId == viewerId && m.IsStarredByReceiver);
            return new MessageResponseDto
            {
                MessageId       = m.MessageId,
                SenderId        = m.SenderId,
                SenderName      = sender?.Name   ?? "Unknown",
                SenderRole      = sender?.Role   ?? "",
                ReceiverId      = m.ReceiverId,
                ReceiverName    = receiver?.Name ?? "Unknown",
                ReceiverRole    = receiver?.Role ?? "",
                Subject         = m.Subject,
                Body            = m.Body,
                IsRead          = m.IsRead,
                ParentMessageId = m.ParentMessageId,
                MessageType     = m.MessageType,
                Cc              = m.Cc,
                Bcc             = m.Bcc,
                IsDraft          = m.IsDraft,
                IsStarred        = isStarred,
                ScheduledAt      = m.ScheduledAt,
                AttachmentsJson  = m.AttachmentsJson,
                CreatedAt        = m.CreatedAt
            };
        }

        [HttpGet("inbox")]
        public async Task<IActionResult> GetInbox()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetInboxAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        [HttpGet("sent")]
        public async Task<IActionResult> GetSent()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetSentAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        [HttpGet("drafts")]
        public async Task<IActionResult> GetDrafts()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetDraftsAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        [HttpGet("starred")]
        public async Task<IActionResult> GetStarred()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetStarredAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        [HttpGet("trash")]
        public async Task<IActionResult> GetTrash()
        {
            var userId = GetCurrentUserId();
            var msgs   = await _msgRepo.GetTrashAsync(userId);
            var result = new List<MessageResponseDto>();
            foreach (var m in msgs) result.Add(await ToDto(m, userId));
            return Ok(result);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = GetCurrentUserId();
            var count  = await _msgRepo.GetUnreadCountAsync(userId);
            return Ok(new UnreadCountDto { UnreadCount = count });
        }

        [HttpGet("recipients")]
        public async Task<IActionResult> GetRecipients()
        {
            var userId  = GetCurrentUserId();
            var me      = await _userRepo.GetUserByIdAsync(userId);
            if (me == null) return Unauthorized();
            var allUsers = await _userRepo.GetAllUsersAsync();
            IEnumerable<User> recipients = me.Role switch
            {
                "Staff"   => allUsers.Where(u => u.Role == "Manager" && u.UserId != userId),
                "Manager" => allUsers.Where(u => (u.Role == "Admin" || u.Role == "Staff") && u.UserId != userId),
                "Admin"   => allUsers.Where(u => u.Role == "Manager" && u.UserId != userId),
                _         => Enumerable.Empty<User>()
            };
            return Ok(recipients.Select(u => new { u.UserId, u.Name, u.Role, u.Email }));
        }

        [HttpPost]
        public async Task<IActionResult> Send([FromBody] SendMessageDto dto)
        {
            ValidateModelState();
            var senderId = GetCurrentUserId();
            if (senderId == 0) return Unauthorized();

            var sender   = await _userRepo.GetUserByIdAsync(senderId);
            var receiver = await _userRepo.GetUserByIdAsync(dto.ReceiverId);
            if (sender == null || receiver == null)
                return BadRequest(new { message = "Invalid sender or receiver." });

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
                ParentMessageId = dto.ParentMessageId,
                MessageType     = dto.MessageType,
                Cc              = dto.Cc,
                Bcc             = dto.Bcc,
                IsDraft          = dto.IsDraft,
                ScheduledAt      = dto.ScheduledAt,
                AttachmentsJson  = dto.AttachmentsJson
            };

            var created = dto.IsDraft
                ? await _msgRepo.SaveDraftAsync(message)
                : await _msgRepo.SendMessageAsync(message);

            return StatusCode(201, await ToDto(created, senderId));
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            await _msgRepo.MarkAsReadAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpPut("{id}/star")]
        public async Task<IActionResult> ToggleStar(int id)
        {
            await _msgRepo.ToggleStarAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpPut("{id}/trash")]
        public async Task<IActionResult> MoveToTrash(int id)
        {
            await _msgRepo.MoveToTrashAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpPut("{id}/restore")]
        public async Task<IActionResult> RestoreFromTrash(int id)
        {
            await _msgRepo.RestoreFromTrashAsync(id, GetCurrentUserId());
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] bool sent = false)
        {
            await _msgRepo.DeleteAsync(id, GetCurrentUserId(), isSender: sent);
            return NoContent();
        }
    }
}
