import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import { getAllAuditLogs, getAllUsers } from '../services/userService'

export default function AuditLogs() {
  const [data, setData]       = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    Promise.all([getAllAuditLogs(), getAllUsers()])
      .then(([logs, u]) => {
        setData(logs.data || [])
        setUsers(u.data || [])
      })
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [])

  const getUser = id => users.find(u => u.userId === id)

  const ACTION_STYLE = {
    Added:    { bg: 'rgba(16,185,129,.12)', color: '#34d399', icon: 'bi-plus-circle' },
    Modified: { bg: 'rgba(8,145,178,.12)',  color: '#22d3ee', icon: 'bi-pencil' },
    Deleted:  { bg: 'rgba(239,68,68,.12)',  color: '#f87171', icon: 'bi-trash' },
    Create:   { bg: 'rgba(16,185,129,.12)', color: '#34d399', icon: 'bi-plus-circle' },
    Update:   { bg: 'rgba(8,145,178,.12)',  color: '#22d3ee', icon: 'bi-pencil' },
    Delete:   { bg: 'rgba(239,68,68,.12)',  color: '#f87171', icon: 'bi-trash' },
    Login:    { bg: 'rgba(139,92,246,.12)', color: '#a78bfa', icon: 'bi-box-arrow-in-right' },
    Register: { bg: 'rgba(245,158,11,.12)', color: '#fbbf24', icon: 'bi-person-plus' },
  }

  const filtered = data
    .filter(d => actionFilter === 'All' || d.action === actionFilter)
    .filter(d =>
      String(d.auditLogId).includes(search) ||
      d.action?.toLowerCase().includes(search.toLowerCase()) ||
      d.entityType?.toLowerCase().includes(search.toLowerCase()) ||
      String(d.entityId).includes(search) ||
      String(d.userId).includes(search) ||
      getUser(d.userId)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
    )

  const formatValues = (raw) => {
    if (!raw || raw === '—' || raw === 'N/A') return null
    try {
      const obj = JSON.parse(raw)
      return Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)', minWidth: 110, flexShrink: 0 }}>{k}</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))
    } catch {
      return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{raw}</span>
    }
  }

  const uniqueActions = ['All', ...new Set(data.map(d => d.action).filter(Boolean))]

  const exportCsv = () => {
    const headers = ['#', 'Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Description']
    const rows = filtered.map(r => {
      const u = getUser(r.userId)
      return [
        r.auditLogId,
        r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
        u?.name || `User #${r.userId}`,
        u?.role || '',
        r.action || '',
        r.entityType || '',
        r.entityId || '',
        (r.description || '').replace(/,/g, ';'),
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'auditLogId', label: '#', render: r => (
      <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>#{r.auditLogId}</span>
    )},
    { key: 'createdAt', label: 'Timestamp', render: r => (
      <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : '—'}
      </span>
    )},
    { key: 'userId', label: 'User', render: r => {
      const u = getUser(r.userId)
      return (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{u?.name || `User #${r.userId}`}</div>
          {u && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{u.role}</div>}
        </div>
      )
    }},
    { key: 'action', label: 'Action', render: r => {
      const s = ACTION_STYLE[r.action] || { bg: 'rgba(255,255,255,.05)', color: 'var(--text-muted)', icon: 'bi-activity' }
      return (
        <span style={{ background: s.bg, color: s.color, padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <i className={`bi ${s.icon}`}></i> {r.action}
        </span>
      )
    }},
    { key: 'entityType', label: 'Entity', render: r => (
      <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 12 }}>{r.entityType || '—'}</span>
    )},
    { key: 'entityId', label: 'ID', render: r => r.entityId
      ? <span style={{ fontSize: 12, color: 'var(--cyan)' }}>#{r.entityId}</span>
      : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    { key: 'description', label: 'Description', render: r => (
      <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{r.description || '—'}</span>
    )},
    { key: 'details', label: 'Changes', render: r => {
      const hasChanges = (r.oldValues && r.oldValues !== '—' && r.oldValues !== 'N/A') ||
                         (r.newValues && r.newValues !== '—' && r.newValues !== 'N/A')
      if (!hasChanges) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
      return (
        <button className="btn-icon" title="View changes"
          onClick={() => setExpanded(expanded === r.auditLogId ? null : r.auditLogId)}>
          <i className={`bi bi-chevron-${expanded === r.auditLogId ? 'up' : 'down'}`}></i>
        </button>
      )
    }},
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable compliance record — every action, who did it, and when"
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            <i className="bi bi-shield-check" style={{ color: 'var(--cyan-light)', marginRight: 6 }}></i>
            All Activity <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <select className="form-control-custom" style={{ width: 140 }}
              value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              {uniqueActions.map(a => <option key={a}>{a}</option>)}
            </select>
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, entity, action..." />
            <button className="btn-secondary-custom" onClick={exportCsv} title="Export visible rows to CSV">
              <i className="bi bi-download" style={{ marginRight: 5 }}></i>Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner" style={{ padding: 32 }}><span/><span/><span/></div>
        ) : error ? (
          <div style={{ padding: 24, color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No audit logs found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {columns.map(c => (
                  <th key={c.key} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-header)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <>
                  <tr key={row.auditLogId}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {columns.map(c => (
                      <td key={c.key} style={{ padding: '10px 12px' }}>{c.render(row)}</td>
                    ))}
                  </tr>
                  {expanded === row.auditLogId && (
                    <tr key={`exp-${row.auditLogId}`}
                      style={{ background: 'rgba(8,145,178,.04)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={columns.length} style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          {row.oldValues && row.oldValues !== '—' && row.oldValues !== 'N/A' && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                <i className="bi bi-dash-circle" style={{ marginRight: 5 }}></i>Before
                              </div>
                              <div style={{ background: 'rgba(239,68,68,.06)', borderRadius: 6, padding: '8px 10px' }}>
                                {formatValues(row.oldValues)}
                              </div>
                            </div>
                          )}
                          {row.newValues && row.newValues !== '—' && row.newValues !== 'N/A' && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                <i className="bi bi-plus-circle" style={{ marginRight: 5 }}></i>After
                              </div>
                              <div style={{ background: 'rgba(16,185,129,.06)', borderRadius: 6, padding: '8px 10px' }}>
                                {formatValues(row.newValues)}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}