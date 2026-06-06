import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMessages } from '../context/MessagesContext'
import {
  getInbox, getSent, getDrafts, getStarred, getTrash,
  getRecipients, sendMessage, markAsRead, toggleStar,
  moveToTrash, restoreFromTrash, deleteMessage
} from '../services/internalMessageService'
import { updatePO } from '../services/purchaseOrderService'
import { useAlertBadges } from '../context/AlertBadgesContext'

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

const ROLE_COLOR = { Admin: '#a78bfa', Manager: '#22d3ee', Staff: '#34d399' }

const EMPTY_FORM = {
  receiverId: '', cc: '', bcc: '', subject: '', body: '',
  messageType: 'Request', parentMessageId: null,
  replyToMessage: null, forwardMessage: null,
  scheduledAt: '', isDraft: false, attachmentsJson: ''
}

export default function Messages() {
  const { user } = useAuth()
  const { setUnreadCount, fetchUnread } = useMessages()
  const { fetchBadges } = useAlertBadges()

  const [tab, setTab]               = useState('inbox')
  const [inbox, setInbox]           = useState([])
  const [sent, setSent]             = useState([])
  const [drafts, setDrafts]         = useState([])
  const [starred, setStarred]       = useState([])
  const [trash, setTrash]           = useState([])
  const [recipients, setRecipients] = useState([])
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [inboxFilter, setInboxFilter] = useState('all') // 'all' | 'unread' | 'starred'

  // Compose state
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [sending, setSending]   = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendOk, setSendOk]     = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
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

  useEffect(() => { load() }, [load])

  const openMessage = async (msg, srcTab) => {
    setSelected({ ...msg, _tab: srcTab })
    if (srcTab === 'inbox' && !msg.isRead) {
      await markAsRead(msg.messageId).catch(() => {})
      setInbox(prev => prev.map(m => m.messageId === msg.messageId ? { ...m, isRead: true } : m))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleStar = async (msg, e) => {
    e?.stopPropagation()
    await toggleStar(msg.messageId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(s => ({ ...s, isStarred: !s.isStarred }))
  }

  const handleTrash = async (msg, e) => {
    e?.stopPropagation()
    await moveToTrash(msg.messageId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(null)
  }

  const handleRestore = async (msg) => {
    await restoreFromTrash(msg.messageId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(null)
  }

  const handlePermDelete = async (msg) => {
    await deleteMessage(msg.messageId, msg.senderId === user?.userId).catch(() => {})
    load()
    if (selected?.messageId === msg.messageId) setSelected(null)
  }

  const [poActionState, setPoActionState] = useState({}) // { [messageId]: 'loading' | 'done' | 'error' }

  const handleMarkDelivered = async (msg) => {
    const poId = parseInt(msg.actionPayload, 10)
    if (!poId) return
    setPoActionState(s => ({ ...s, [msg.messageId]: 'loading' }))
    try {
      await updatePO(poId, { status: 'Delivered' })
      setPoActionState(s => ({ ...s, [msg.messageId]: 'done' }))
      fetchBadges()
    } catch (err) {
      const status = err?.response?.status
      setPoActionState(s => ({ ...s, [msg.messageId]: status === 409 ? 'already' : 'error' }))
    }
  }

  const startCompose = (preset = {}) => {
    setForm({ ...EMPTY_FORM, ...preset })
    setShowCcBcc(!!(preset.cc || preset.bcc))
    setShowSchedule(false)
    setSendError(''); setSendOk('')
    setTab('compose')
    setSelected(null)
  }

  const handleReply = (msg) => startCompose({
    receiverId: String(msg.senderId),
    subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
    body: `\n\n--- Original from ${msg.senderName} (${fmtDate(msg.createdAt)}) ---\n${msg.body}`,
    messageType: 'Reply',
    parentMessageId: msg.messageId,
    replyToMessage: msg
  })

  const handleForward = (msg) => startCompose({
    receiverId: '',
    subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
    body: `\n\n--- Forwarded from ${msg.senderName} (${fmtDate(msg.createdAt)}) ---\n${msg.body}`,
    messageType: 'Forward',
    parentMessageId: msg.messageId,
    forwardMessage: msg
  })

  const handleSend = async (e, asDraft = false) => {
    e?.preventDefault()
    setSendError(''); setSendOk('')
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
        scheduledAt:     form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        attachmentsJson: form.attachmentsJson || null
      })
      setSendOk(asDraft ? 'Draft saved!' : 'Message sent!')
      setForm({ ...EMPTY_FORM })
      load(); fetchUnread()
      setTimeout(() => { setSendOk(''); setTab(asDraft ? 'drafts' : 'sent') }, 1400)
    } catch (err) {
      setSendError(err.response?.data?.message || 'Failed to send.')
    } finally { setSending(false) }
  }

  const handleDiscard = () => { setForm({ ...EMPTY_FORM }); setTab('inbox') }

  // Determine list data for current tab
  const listData = {
    inbox: inbox, sent: sent, drafts: drafts,
    starred: starred, trash: trash
  }[tab] || []

  const isSentTab = tab === 'sent'

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
function ComposePane({ form, setForm, recipients, inbox, sending, sendError, sendOk,
  showCcBcc, setShowCcBcc, showSchedule, setShowSchedule, onSend, onDiscard }) {

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }))

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
function MessageList({ tab, loading, error, messages, search, setSearch, inboxFilter, setInboxFilter,
  isSentTab, onOpen, onStar, onTrash, onRestore, onPermDelete, isTrash, onMarkRead }) {

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
function MessageDetail({ msg, onBack, onReply, onForward, onStar, onTrash, onRestore, onPermDelete, isTrash, onMarkDelivered, poActionState }) {
  const TYPE_ICON  = { Request: 'bi-question-circle', Reply: 'bi-reply', Forward: 'bi-forward' }
  const TYPE_CLASS = { request: 'msgs-type-request', reply: 'msgs-type-reply', forward: 'msgs-type-forward' }
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
