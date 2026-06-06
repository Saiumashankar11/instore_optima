// =============================================================================
// Messages.jsx
// =============================================================================
// The internal messaging (mail) feature of InStore Optima.
// Users can send requests to colleagues, reply, forward, star, trash, and
// permanently delete messages. Draft saving and scheduled sending are also
// supported.
//
// The page is split into three sub-components rendered inside this file:
//   - Messages       (default export) — page shell, sidebar, state machine
//   - ComposePane    — new message / reply / forward form
//   - MessageList    — scrollable list of messages for the selected folder
//   - MessageDetail  — full message view with action buttons
//
// All mail API calls go through internalMessageService; the PO delivery
// action hits purchaseOrderService when an actionable message is opened.
// =============================================================================

// React hooks.
import { useEffect, useState, useCallback } from 'react'
// AuthContext provides the currently logged-in user (id, role, name).
import { useAuth } from '../context/AuthContext'
// MessagesContext tracks the global unread count shown in the sidebar badge.
import { useMessages } from '../context/MessagesContext'
// Service functions — each wraps a single Axios call to the messages API.
import {
  getInbox, getSent, getDrafts, getStarred, getTrash,
  getRecipients, sendMessage, markAsRead, toggleStar,
  moveToTrash, restoreFromTrash, deleteMessage
} from '../services/internalMessageService'
// Used when the user taps "Mark as Delivered" on a PO notification message.
import { updatePO } from '../services/purchaseOrderService'
// AlertBadgesContext manages the counts shown on sidebar alert icons.
import { useAlertBadges } from '../context/AlertBadgesContext'

// Formats a timestamp string (from the backend) as a human-readable date/time
// in Indian Standard Time (IST), e.g. "05 Jun 2026, 14:32".
// The backend sometimes omits the 'Z' suffix on UTC strings, so we append it
// ourselves when no timezone indicator is present.
const fmtDate = d => {
  if (!d) return '—'
  // Backend sends UTC (often without a 'Z'); treat it as UTC, then render in IST.
  const s = String(d)
  const dt = new Date(s.endsWith('Z') || s.includes('+') || s.includes('-', 10) ? s : s + 'Z')
  if (isNaN(dt)) return '—'
  return dt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })
}

// Maps each role to a colour used for avatars and role badges throughout the UI.
const ROLE_COLOR = { Admin: '#a78bfa', Manager: '#22d3ee', Staff: '#34d399' }

// The blank state that the compose form resets to after sending or discarding.
// Spreading this object over the form state clears all fields at once.
const EMPTY_FORM = {
  receiverId: '', cc: '', bcc: '', subject: '', body: '',
  messageType: 'Request', parentMessageId: null,
  replyToMessage: null, forwardMessage: null,
  scheduledAt: '', isDraft: false, attachmentsJson: ''
}

export default function Messages() {
  // user contains the currently logged-in user's id, name, and role.
  const { user } = useAuth()
  // setUnreadCount updates the global badge; fetchUnread re-queries the count.
  const { setUnreadCount, fetchUnread } = useMessages()
  const { fetchBadges } = useAlertBadges()

  // tab controls which folder is active in the sidebar.
  const [tab, setTab]               = useState('inbox')
  // Each folder's messages are stored in a separate state array so switching
  // tabs is instant (no re-fetch needed).
  const [inbox, setInbox]           = useState([])
  const [sent, setSent]             = useState([])
  const [drafts, setDrafts]         = useState([])
  const [starred, setStarred]       = useState([])
  const [trash, setTrash]           = useState([])
  // recipients is the list of users the current user is allowed to message.
  const [recipients, setRecipients] = useState([])
  // selected holds the message that is currently open in the detail view.
  // null means the list view is shown instead.
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [inboxFilter, setInboxFilter] = useState('all') // 'all' | 'unread' | 'starred'

  // Compose state
  // form mirrors the fields of the compose form; reset to EMPTY_FORM on discard.
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  // sending is true while the API call is in-flight to disable the Send button.
  const [sending, setSending]   = useState(false)
  const [sendError, setSendError] = useState('')
  // sendOk shows a brief success message after sending/saving a draft.
  const [sendOk, setSendOk]     = useState('')
  // showCcBcc and showSchedule toggle optional compose fields.
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)

  // load() fetches all six mail buckets and the recipient list in parallel.
  // useCallback ensures a stable reference so the useEffect below doesn't
  // re-run infinitely (load is listed as a dependency).
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Fire all requests simultaneously — much faster than sequential fetches.
      const [inbRes, snRes, drRes, stRes, trRes, recRes] = await Promise.all([
        getInbox(), getSent(), getDrafts(), getStarred(), getTrash(), getRecipients()
      ])
      setInbox(inbRes.data || [])
      setSent(snRes.data || [])
      setDrafts(drRes.data || [])
      setStarred(stRes.data || [])
      setTrash(trRes.data || [])
      setRecipients(recRes.data || [])
    } catch { setError('Failed to load messages.') }
    finally { setLoading(false) }
  }, [])

  // Run load() once when the component mounts (and if load ever changes).
  useEffect(() => { load() }, [load])

  // Opens a message in the detail view. If it is an unread inbox message the
  // read flag is updated optimistically in local state (no reload needed) and
  // the global unread badge is decremented by 1.
  const openMessage = async (msg, srcTab) => {
    // _tab tells MessageDetail whether to show reply/trash or restore/delete.
    setSelected({ ...msg, _tab: srcTab })
    if (srcTab === 'inbox' && !msg.isRead) {
      await markAsRead(msg.messageId).catch(() => {})
      setInbox(prev => prev.map(m => m.messageId === msg.messageId ? { ...m, isRead: true } : m))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  // Toggles the star flag on a message. Also updates the open detail view if
  // the same message is currently selected (so the star icon flips immediately).
  const handleStar = async (msg, e) => {
    e?.stopPropagation()
    await toggleStar(msg.messageId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(s => ({ ...s, isStarred: !s.isStarred }))
  }

  // Moves a message to the Trash folder and closes the detail view if it was open.
  const handleTrash = async (msg, e) => {
    e?.stopPropagation()
    await moveToTrash(msg.messageId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(null)
  }

  // Moves a trashed message back to its original folder.
  const handleRestore = async (msg) => {
    await restoreFromTrash(msg.messageId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(null)
  }

  // Permanently deletes a message. The second argument tells the API whether
  // the current user is the original sender (which may affect hard-delete rules).
  const handlePermDelete = async (msg) => {
    await deleteMessage(msg.messageId, msg.senderId === user?.userId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(null)
  }

  // poActionState tracks the delivery-confirmation state per message so each
  // actionable message can independently show loading / done / error.
  const [poActionState, setPoActionState] = useState({}) // { [messageId]: 'loading' | 'done' | 'error' }

  // Called when the user clicks "Mark PO as Delivered" inside a PO notification
  // message. Updates the purchase order status via the PO service, then
  // refreshes the global alert badges (the PO badge count may change).
  const handleMarkDelivered = async (msg) => {
    // actionPayload contains the PO id as a string.
    const poId = parseInt(msg.actionPayload, 10)
    if (!poId) return
    setPoActionState(s => ({ ...s, [msg.messageId]: 'loading' }))
    try {
      await updatePO(poId, { status: 'Delivered' })
      setPoActionState(s => ({ ...s, [msg.messageId]: 'done' }))
      fetchBadges()
    } catch (err) {
      // 409 Conflict means the PO was already marked delivered by someone else.
      const status = err?.response?.status
      setPoActionState(s => ({ ...s, [msg.messageId]: status === 409 ? 'already' : 'error' }))
    }
  }

  // Opens the compose pane, optionally pre-filling the form (e.g. for reply/
  // forward). Any fields not provided in `preset` fall back to EMPTY_FORM.
  const startCompose = (preset = {}) => {
    setForm({ ...EMPTY_FORM, ...preset })
    // Show the CC/BCC fields automatically if the preset already has values.
    setShowCcBcc(!!(preset.cc || preset.bcc))
    setShowSchedule(false)
    setSendError(''); setSendOk('')
    setTab('compose')
    setSelected(null)
  }

  // Pre-fills the compose form for a reply: sets the recipient to the original
  // sender and prepends a quoted copy of the original message body.
  const handleReply = (msg) => startCompose({
    receiverId: String(msg.senderId),
    // Avoid stacking "Re: Re: Re:…" prefixes.
    subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
    body: `\n\n--- Original from ${msg.senderName} (${fmtDate(msg.createdAt)}) ---\n${msg.body}`,
    messageType: 'Reply',
    parentMessageId: msg.messageId,
    replyToMessage: msg
  })

  // Pre-fills the compose form for a forward (no recipient pre-set — the user
  // picks who to send to).
  const handleForward = (msg) => startCompose({
    receiverId: '',
    subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
    body: `\n\n--- Forwarded from ${msg.senderName} (${fmtDate(msg.createdAt)}) ---\n${msg.body}`,
    messageType: 'Forward',
    parentMessageId: msg.messageId,
    forwardMessage: msg
  })

  // Handles both "Send" (asDraft = false) and "Save Draft" (asDraft = true).
  // Validates required fields before making the API call.
  const handleSend = async (e, asDraft = false) => {
    e?.preventDefault()
    setSendError(''); setSendOk('')
    // Recipient is required for real sends but optional for drafts.
    if (!form.receiverId && !asDraft) { setSendError('Please select a recipient.'); return }
    if (!form.subject.trim()) { setSendError('Subject is required.'); return }
    if (!form.body.trim())    { setSendError('Message body is required.'); return }

    setSending(true)
    try {
      await sendMessage({
        receiverId:      parseInt(form.receiverId) || 0,
        cc:              form.cc || null,
        bcc:             form.bcc || null,
        subject:         form.subject.trim(),
        body:            form.body.trim(),
        messageType:     form.messageType,
        parentMessageId: form.parentMessageId || null,
        isDraft:         asDraft,
        // Convert the local datetime-local value to a UTC ISO string for the API.
        scheduledAt:     form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        attachmentsJson: form.attachmentsJson || null
      })
      setSendOk(asDraft ? 'Draft saved!' : 'Message sent!')
      setForm({ ...EMPTY_FORM })
      // Reload mail folders and update the unread badge.
      load(); fetchUnread()
      // After a short success flash navigate to the relevant folder.
      setTimeout(() => { setSendOk(''); setTab(asDraft ? 'drafts' : 'sent') }, 1400)
    } catch (err) {
      setSendError(err.response?.data?.message || 'Failed to send.')
    } finally { setSending(false) }
  }

  // Discards the compose form and returns the user to the Inbox list.
  const handleDiscard = () => { setForm({ ...EMPTY_FORM }); setTab('inbox') }

  // Determine list data for current tab
  // Pick the correct folder array for the active sidebar tab.
  const listData = {
    inbox: inbox, sent: sent, drafts: drafts,
    starred: starred, trash: trash
  }[tab] || []

  // In the Sent tab the "other party" is the receiver; elsewhere it is the sender.
  const isSentTab = tab === 'sent'

  // Apply search text and the inbox quick-filter (all / unread / starred).
  const filteredList = listData.filter(m => {
    const other = isSentTab ? m.receiverName : m.senderName
    const matchesSearch =
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      other?.toLowerCase().includes(search.toLowerCase()) ||
      m.body?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (tab === 'inbox') {
      if (inboxFilter === 'unread')  return !m.isRead
      if (inboxFilter === 'starred') return m.isStarred
    }
    return true
  })

  // Count of unread messages shown as the Inbox sidebar badge.
  const unreadInbox = inbox.filter(m => !m.isRead).length

  return (
    <div className="msgs-root">
      {/* -- Sidebar -- */}
      <aside className="msgs-sidebar">
        <div className="msgs-sidebar-header">
          <i className="bi bi-chat-dots-fill" style={{ color: 'var(--cyan)', fontSize: 20 }}></i>
          <span>Internal Mail</span>
        </div>

        <button className="msgs-nav-compose" onClick={() => startCompose()}>
          <i className="bi bi-pencil-square"></i> New Request
        </button>

        {[
          { key: 'inbox',   icon: 'bi-inbox',        label: 'Inbox',   badge: unreadInbox },
          { key: 'starred', icon: 'bi-star',          label: 'Starred', badge: 0 },
          { key: 'drafts',  icon: 'bi-file-earmark',  label: 'Drafts',  badge: drafts.length },
          { key: 'sent',    icon: 'bi-send',          label: 'Sent',    badge: 0 },
          { key: 'trash',   icon: 'bi-trash3',        label: 'Trash',   badge: 0 },
        ].map(({ key, icon, label, badge }) => (
          <button
            key={key}
            className={`msgs-nav-btn${tab === key ? ' active' : ''}`}
            onClick={() => { setTab(key); setSelected(null); setSearch('') }}
          >
            <i className={`bi ${icon}`}></i> {label}
            {badge > 0 && <span className="msgs-nav-badge">{badge}</span>}
          </button>
        ))}

        <div className="msgs-sidebar-info">
          <div className="msgs-sidebar-role-label">YOUR ROLE</div>
          <span className="msgs-role-badge" style={{ background: ROLE_COLOR[user?.role] + '22', color: ROLE_COLOR[user?.role] }}>
            {user?.role}
          </span>
          <div className="msgs-sidebar-hint">
            {user?.role === 'Staff'   && 'You can message Managers.'}
            {user?.role === 'Manager' && 'You can message Admins & Staff.'}
            {user?.role === 'Admin'   && 'You can message Managers.'}
          </div>
        </div>
      </aside>

      {/* -- Main Panel -- */}
      <div className="msgs-main">
        {tab === 'compose' ? (
          <ComposePane
            form={form} setForm={setForm}
            recipients={recipients}
            inbox={inbox}
            sending={sending} sendError={sendError} sendOk={sendOk}
            showCcBcc={showCcBcc} setShowCcBcc={setShowCcBcc}
            showSchedule={showSchedule} setShowSchedule={setShowSchedule}
            onSend={handleSend} onDiscard={handleDiscard}
          />
        ) : selected ? (
          <MessageDetail
            msg={selected}
            onBack={() => setSelected(null)}
            onReply={handleReply}
            onForward={handleForward}
            onStar={handleStar}
            onTrash={handleTrash}
            onRestore={handleRestore}
            onPermDelete={handlePermDelete}
            isTrash={tab === 'trash'}
            onMarkDelivered={handleMarkDelivered}
            poActionState={poActionState[selected?.messageId]}
          />
        ) : (
          <MessageList
            tab={tab} loading={loading} error={error}
            messages={filteredList}
            search={search} setSearch={setSearch}
            inboxFilter={inboxFilter} setInboxFilter={setInboxFilter}
            isSentTab={isSentTab}
            onOpen={(m) => openMessage(m, tab)}
            onStar={handleStar}
            onTrash={handleTrash}
            onRestore={handleRestore}
            onPermDelete={handlePermDelete}
            isTrash={tab === 'trash'}
            onMarkRead={async (msg) => {
              await markAsRead(msg.messageId).catch(() => {})
              setInbox(prev => prev.map(m => m.messageId === msg.messageId ? { ...m, isRead: true } : m))
              setUnreadCount(prev => Math.max(0, prev - 1))
            }}
          />
        )}
      </div>
    </div>
  )
}

// -- Compose Pane ---------------------------------------------
// Renders the message creation form. Handles new requests, replies, and
// forwards. CC/BCC and scheduled-send fields are hidden by default and
// expand on demand to keep the form uncluttered.
function ComposePane({ form, setForm, recipients, inbox, sending, sendError, sendOk,
  showCcBcc, setShowCcBcc, showSchedule, setShowSchedule, onSend, onDiscard }) {

  // Shorthand updater — merges a single field change into the form state.
  const f = (field, val) => setForm(p => ({ ...p, [field]: val }))

  // Derived flags used to conditionally render reply/forward-specific UI.
  const isReply   = form.messageType === 'Reply'
  const isForward = form.messageType === 'Forward'

  return (
    <div className="msgs-compose">
      <div className="msgs-compose-header">
        <i className="bi bi-pencil-square"></i>
        <span>
          {isReply ? 'Reply' : isForward ? 'Forward' : 'New Request / Message'}
        </span>
      </div>

      {/* Reply/Forward context banner */}
      {(isReply && form.replyToMessage) && (
        <div className="msgs-context-banner msgs-context-reply">
          <i className="bi bi-reply"></i>
          <span>Replying to <strong>{form.replyToMessage.senderName}</strong> — "{form.replyToMessage.subject}"</span>
        </div>
      )}
      {(isForward && form.forwardMessage) && (
        <div className="msgs-context-banner msgs-context-forward">
          <i className="bi bi-forward"></i>
          <span>Forwarding — "{form.forwardMessage.subject}"</span>
        </div>
      )}

      <form onSubmit={e => onSend(e, false)} className="msgs-compose-form">
        {/* Type row */}
        <div className="msgs-field-row">
          <div className="msgs-field" style={{ flex: '0 0 160px' }}>
            <label>Type</label>
            <select value={form.messageType} onChange={e => f('messageType', e.target.value)}>
              <option value="Request">Request</option>
              <option value="Reply">Reply</option>
              <option value="Forward">Forward</option>
            </select>
          </div>

          {/* If Reply: pick which inbox message to reply to */}
          {isReply && (
            <div className="msgs-field" style={{ flex: 1 }}>
              <label>Replying to</label>
              <select
                value={form.replyToMessage?.messageId || ''}
                onChange={e => {
                  const msg = inbox.find(m => m.messageId === parseInt(e.target.value))
                  if (msg) {
                    setForm(p => ({
                      ...p,
                      receiverId: String(msg.senderId),
                      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
                      body: `\n\n--- Original from ${msg.senderName} ---\n${msg.body}`,
                      parentMessageId: msg.messageId,
                      replyToMessage: msg
                    }))
                  }
                }}
              >
                <option value="">-- Select message to reply to --</option>
                {inbox.map(m => (
                  <option key={m.messageId} value={m.messageId}>
                    {m.senderName}: "{m.subject.slice(0, 50)}"
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If Forward: pick which inbox message to forward */}
          {isForward && (
            <div className="msgs-field" style={{ flex: 1 }}>
              <label>Message to forward</label>
              <select
                value={form.forwardMessage?.messageId || ''}
                onChange={e => {
                  const msg = inbox.find(m => m.messageId === parseInt(e.target.value))
                  if (msg) {
                    setForm(p => ({
                      ...p,
                      subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
                      body: `\n\n--- Forwarded from ${msg.senderName} ---\n${msg.body}`,
                      parentMessageId: msg.messageId,
                      forwardMessage: msg
                    }))
                  }
                }}
              >
                <option value="">-- Pick a received message --</option>
                {inbox.map(m => (
                  <option key={m.messageId} value={m.messageId}>
                    {m.senderName}: "{m.subject.slice(0, 50)}"
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* To */}
        <div className="msgs-field">
          <div className="msgs-field-label-row">
            <label>To</label>
            {!showCcBcc && !isReply && (
              <button type="button" className="msgs-add-cc-btn" onClick={() => setShowCcBcc(true)}>
                + CC / BCC
              </button>
            )}
          </div>
          {isReply ? (
            <div className="msgs-readonly-to">
              <i className="bi bi-person-fill"></i>
              <span>{form.replyToMessage?.senderName}</span>
              <span className="msgs-meta-role" style={{ color: ROLE_COLOR[form.replyToMessage?.senderRole] }}>
                {form.replyToMessage?.senderRole}
              </span>
            </div>
          ) : (
            <select value={form.receiverId} onChange={e => f('receiverId', e.target.value)} required={!form.isDraft}>
              <option value="">— Select recipient —</option>
              {recipients.map(r => (
                <option key={r.userId} value={r.userId}>{r.name} ({r.role})</option>
              ))}
            </select>
          )}
        </div>

        {/* CC + BCC */}
        {showCcBcc && (
          <>
            <div className="msgs-field">
              <label>CC <span className="msgs-field-hint">(comma-separated user IDs)</span></label>
              <input type="text" value={form.cc} onChange={e => f('cc', e.target.value)} placeholder="e.g. 3,5" />
            </div>
            <div className="msgs-field">
              <label>BCC <span className="msgs-field-hint">(comma-separated user IDs)</span></label>
              <input type="text" value={form.bcc} onChange={e => f('bcc', e.target.value)} placeholder="e.g. 7" />
            </div>
          </>
        )}

        {/* Subject */}
        <div className="msgs-field">
          <label>Subject</label>
          <input
            type="text" value={form.subject} maxLength={200} required
            onChange={e => f('subject', e.target.value)}
            placeholder="Message subject…"
          />
        </div>

        {/* Body */}
        <div className="msgs-field msgs-field-grow">
          <label>Message</label>
          <textarea
            value={form.body} maxLength={5000} rows={10} required
            onChange={e => f('body', e.target.value)}
            placeholder="Write your request or message here…"
          />
          <span className="msgs-char-count">{form.body.length}/5000</span>
        </div>

        {/* Attachments */}
        <div className="msgs-field">
          <label>Attachments <span className="msgs-field-hint">(max 5 files, 5 MB each)</span></label>
          {/* Each selected file is read as a base64 Data URL via FileReader
              and stored as JSON in form.attachmentsJson so it can be sent
              to the backend as a plain string field. */}
          <input
            type="file" multiple accept="*/*"
            onChange={e => {
              const files = Array.from(e.target.files)
              Promise.all(files.map(file => new Promise((res, rej) => {
                if (file.size > 5 * 1024 * 1024) { rej(new Error(`${file.name} exceeds 5 MB`)); return }
                const reader = new FileReader()
                reader.onload = ev => res({ name: file.name, size: file.size, type: file.type, data: ev.target.result })
                reader.onerror = rej
                reader.readAsDataURL(file)
              }))).then(results => {
                f('attachmentsJson', JSON.stringify(results))
              }).catch(err => setSendError(err.message))
            }}
          />
          {form.attachmentsJson && (() => {
            try {
              const atts = JSON.parse(form.attachmentsJson)
              return (
                <div className="msgs-attachment-list">
                  {atts.map((a, i) => (
                    <div key={i} className="msgs-attachment-chip">
                      <i className="bi bi-paperclip"></i>
                      <span>{a.name}</span>
                      <span className="msgs-att-size">({(a.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              )
            } catch { return null }
          })()}
        </div>

        {/* Schedule send */}
        {showSchedule && (
          <div className="msgs-field">
            <label>Schedule send at</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => f('scheduledAt', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        {sendError && <div className="msgs-alert msgs-alert-error"><i className="bi bi-exclamation-triangle"></i> {sendError}</div>}
        {sendOk    && <div className="msgs-alert msgs-alert-ok"><i className="bi bi-check-circle"></i> {sendOk}</div>}

        <div className="msgs-compose-actions">
          <button type="submit" className="msgs-btn-send" disabled={sending}>
            {sending
              ? <><i className="bi bi-arrow-repeat msgs-spin"></i> Sending&hellip;</>
              : <><i className="bi bi-send"></i> Send</>}
          </button>
          <button type="button" className="msgs-btn-draft" disabled={sending} onClick={e => onSend(e, true)}>
            <i className="bi bi-file-earmark"></i> Save Draft
          </button>
          {!showSchedule && (
            <button type="button" className="msgs-btn-schedule" onClick={() => setShowSchedule(true)}>
              <i className="bi bi-clock"></i> Schedule
            </button>
          )}
          <button type="button" className="msgs-btn-discard" onClick={onDiscard}>
            <i className="bi bi-trash"></i> Discard
          </button>
        </div>
      </form>
    </div>
  )
}

// -- Message List ---------------------------------------------
// Renders the folder header (title, search box, filter pills) followed by the
// scrollable list of message rows. Each row shows sender/receiver, subject
// snippet, date, and inline action buttons (star, trash, restore).
function MessageList({ tab, loading, error, messages, search, setSearch, inboxFilter, setInboxFilter,
  isSentTab, onOpen, onStar, onTrash, onRestore, onPermDelete, isTrash, onMarkRead }) {

  // Human-readable labels and Bootstrap icons for each tab/folder.
  const TAB_LABELS = { inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts', starred: 'Starred', trash: 'Trash' }
  const TAB_ICONS  = { inbox: 'bi-inbox', sent: 'bi-send', drafts: 'bi-file-earmark', starred: 'bi-star', trash: 'bi-trash3' }

  return (
    <div className="msgs-list-pane">
      <div className="msgs-list-header">
        <div className="msgs-list-title">
          <i className={`bi ${TAB_ICONS[tab]}`}></i>
          {TAB_LABELS[tab]}
          <span className="msgs-list-count">{messages.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {tab === 'inbox' && (
            <div className="msgs-filter-pills">
              {['all', 'unread', 'starred'].map(f => (
                <button key={f} className={`msgs-filter-pill${inboxFilter === f ? ' active' : ''}`} onClick={() => setInboxFilter(f)}>
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Starred'}
                </button>
              ))}
            </div>
          )}
          <div className="msgs-search-wrap">
            <i className="bi bi-search"></i>
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && <div className="msgs-loading"><i className="bi bi-arrow-repeat msgs-spin"></i> Loading…</div>}
      {error   && <div className="msgs-alert msgs-alert-error" style={{ margin: 16 }}>{error}</div>}
      {!loading && !error && messages.length === 0 && (
        <div className="msgs-empty">
          <i className={`bi ${TAB_ICONS[tab]}`} style={{ fontSize: 44, opacity: .25 }}></i>
          <div className="msgs-empty-text">{search ? 'No matches.' : `${TAB_LABELS[tab]} is empty.`}</div>
        </div>
      )}

      <div className="msgs-list">
        {messages.map(msg => {
          // In sent/drafts the "other party" is the receiver; otherwise the sender.
          const other = isSentTab || tab === 'drafts'
            ? { name: msg.receiverName, role: msg.receiverRole }
            : { name: msg.senderName,   role: msg.senderRole }
          const isUnread = tab === 'inbox' && !msg.isRead
          return (
            <div
              key={msg.messageId}
              className={`msgs-item${isUnread ? ' msgs-item-unread' : ''}`}
              onClick={() => onOpen(msg)}
            >
              {isUnread && <div className="msgs-unread-dot"></div>}
              <div className="msgs-item-avatar"
                style={{ background: ROLE_COLOR[other.role] + '22', color: ROLE_COLOR[other.role] }}>
                {other.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="msgs-item-body">
                <div className="msgs-item-row1">
                  <span className={`msgs-item-name${isUnread ? ' bold' : ''}`}>{other.name || '—'}</span>
                  <span className="msgs-item-role" style={{ color: ROLE_COLOR[other.role] }}>{other.role}</span>
                  {msg.isDraft && <span className="msgs-draft-chip">Draft</span>}
                  {msg.scheduledAt && <span className="msgs-sched-chip"><i className="bi bi-clock"></i> Scheduled</span>}
                  <span className="msgs-item-date">{fmtDate(msg.createdAt)}</span>
                </div>
                <div className={`msgs-item-subject${isUnread ? ' msgs-item-subject-bold' : ''}`}>
                  <span className={`msgs-type-dot msgs-type-${msg.messageType?.toLowerCase()}`}></span>
                  {msg.subject}
                </div>
                <div className="msgs-item-preview">{msg.body?.replace(/\n/g, ' ').slice(0, 100)}{msg.body?.length > 100 ? '…' : ''}</div>
              </div>
              <div className="msgs-item-actions" onClick={e => e.stopPropagation()}>
                {tab === 'inbox' && !msg.isRead && (
                  <button className="msgs-item-action-btn" title="Mark as read" onClick={e => { e.stopPropagation(); onMarkRead(msg) }}>
                    <i className="bi bi-envelope-open"></i>
                  </button>
                )}
                <button
                  className={`msgs-item-action-btn${msg.isStarred ? ' starred' : ''}`}
                  title="Star" onClick={e => onStar(msg, e)}
                >
                  <i className={`bi ${msg.isStarred ? 'bi-star-fill' : 'bi-star'}`}></i>
                </button>
                {isTrash ? (
                  <>
                    <button className="msgs-item-action-btn" title="Restore" onClick={e => { e.stopPropagation(); onRestore(msg) }}>
                      <i className="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button className="msgs-item-action-btn danger" title="Delete forever" onClick={e => { e.stopPropagation(); onPermDelete(msg) }}>
                      <i className="bi bi-trash3"></i>
                    </button>
                  </>
                ) : (
                  <button className="msgs-item-action-btn" title="Move to trash" onClick={e => onTrash(msg, e)}>
                    <i className="bi bi-trash"></i>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- Message Detail --------------------------------------------
// Renders the full content of a single message, including metadata (from/to/
// cc/bcc/scheduled), the body, optional PO action bar, and footer action
// buttons (reply, forward, star, trash, restore, permanent delete).
function MessageDetail({ msg, onBack, onReply, onForward, onStar, onTrash, onRestore, onPermDelete, isTrash, onMarkDelivered, poActionState }) {
  // Maps the message type to the appropriate Bootstrap icon class.
  const TYPE_ICON  = { Request: 'bi-question-circle', Reply: 'bi-reply', Forward: 'bi-forward' }
  // CSS classes for the coloured type badge.
  const TYPE_CLASS = { request: 'msgs-type-request', reply: 'msgs-type-reply', forward: 'msgs-type-forward' }
  // isSent hides the Reply button — you cannot reply to your own sent message.
  const isSent = msg._tab === 'sent'

  return (
    <div className="msgs-detail">
      <button className="msgs-back-btn" onClick={onBack}>
        <i className="bi bi-arrow-left"></i> Back
      </button>

      <div className="msgs-detail-card">
        <div className="msgs-detail-top">
          <div>
            <span className={`msgs-type-badge ${TYPE_CLASS[msg.messageType?.toLowerCase()]}`}>
              <i className={`bi ${TYPE_ICON[msg.messageType] || 'bi-envelope'}`}></i>
              {msg.messageType}
            </span>
            <h2 className="msgs-detail-subject">{msg.subject}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className={`msgs-detail-star-btn${msg.isStarred ? ' starred' : ''}`}
              onClick={() => onStar(msg)}
              title="Star"
            >
              <i className={`bi ${msg.isStarred ? 'bi-star-fill' : 'bi-star'}`}></i>
            </button>
            <span className="msgs-detail-date">{fmtDate(msg.createdAt)}</span>
          </div>
        </div>

        <div className="msgs-detail-meta">
          <div className="msgs-meta-row">
            <span className="msgs-meta-label">From</span>
            <span className="msgs-meta-val">
              {msg.senderDisplayName ?? msg.senderName}
              {msg.senderDisplayEmail
                ? <span className="msgs-meta-role" style={{ color: '#94a3b8', fontStyle: 'italic' }}>{msg.senderDisplayEmail}</span>
                : <span className="msgs-meta-role" style={{ color: ROLE_COLOR[msg.senderRole] }}>{msg.senderRole}</span>
              }
            </span>
          </div>
          <div className="msgs-meta-row">
            <span className="msgs-meta-label">To</span>
            <span className="msgs-meta-val">
              {msg.receiverName}
              <span className="msgs-meta-role" style={{ color: ROLE_COLOR[msg.receiverRole] }}>{msg.receiverRole}</span>
            </span>
          </div>
          {msg.cc && (
            <div className="msgs-meta-row">
              <span className="msgs-meta-label">CC</span>
              <span className="msgs-meta-val">{msg.cc}</span>
            </div>
          )}
          {msg.bcc && (
            <div className="msgs-meta-row">
              <span className="msgs-meta-label">BCC</span>
              <span className="msgs-meta-val">{msg.bcc}</span>
            </div>
          )}
          {msg.scheduledAt && (
            <div className="msgs-meta-row">
              <span className="msgs-meta-label">Scheduled</span>
              <span className="msgs-meta-val">{fmtDate(msg.scheduledAt)}</span>
            </div>
          )}
        </div>

        {/* Render the message body line-by-line so that quoted sections
            (lines starting with "---") get a distinct divider style. */}
        <div className="msgs-detail-body">
          {msg.body.split('\n').map((line, i) => (
            line.startsWith('---')
              ? <div key={i} className="msgs-quoted-divider">{line}</div>
              : <p key={i} style={{ margin: '2px 0' }}>{line || <br />}</p>
          ))}
        </div>

        {/* PO delivery action */}
        {msg.actionType === 'MARK_PO_DELIVERED' && (
          <div className="msgs-po-action-bar">
            <i className="bi bi-box-seam" style={{ fontSize: 18 }}></i>
            <span>Purchase Order <strong>#{msg.actionPayload}</strong> is awaiting delivery confirmation.</span>
            {(poActionState === 'done' || poActionState === 'already') ? (
              <span className="msgs-po-action-done">
                <i className="bi bi-check-circle-fill"></i>
                {poActionState === 'already' ? 'Already Delivered' : 'Marked as Delivered'}
              </span>
            ) : (
              <button
                className="msgs-po-action-btn"
                onClick={() => onMarkDelivered(msg)}
                disabled={poActionState === 'loading'}
              >
                {poActionState === 'loading'
                  ? <><i className="bi bi-hourglass-split"></i> Marking...</>
                  : <><i className="bi bi-truck"></i> Mark PO #{msg.actionPayload} as Delivered</>
                }
              </button>
            )}
            {poActionState === 'error' && (
              <span className="msgs-po-action-error">Something went wrong. Please try again.</span>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="msgs-detail-footer">
          {isTrash ? (
            <>
              <button className="msgs-footer-btn msgs-footer-restore" onClick={() => onRestore(msg)}>
                <i className="bi bi-arrow-counterclockwise"></i> Restore
              </button>
              <button className="msgs-footer-btn msgs-footer-danger" onClick={() => onPermDelete(msg)}>
                <i className="bi bi-trash3"></i> Delete Forever
              </button>
            </>
          ) : (
            <>
              {!isSent && (
                <button className="msgs-footer-btn msgs-footer-reply" onClick={() => onReply(msg)}>
                  <i className="bi bi-reply"></i> Reply
                </button>
              )}
              <button className="msgs-footer-btn msgs-footer-forward" onClick={() => onForward(msg)}>
                <i className="bi bi-forward"></i> Forward
              </button>
              <button className="msgs-footer-btn msgs-footer-trash" onClick={() => onTrash(msg)}>
                <i className="bi bi-trash"></i> Move to Trash
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
