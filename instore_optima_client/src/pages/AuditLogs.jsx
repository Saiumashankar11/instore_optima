import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import { getAllAuditLogs } from '../services/userService'

export default function AuditLogs() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    getAllAuditLogs()
      .then(r => setData(r.data || []))
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [])

  const ACTION_STYLE = {
    Create: { bg: 'rgba(16,185,129,.1)',  color: '#34d399' },
    Update: { bg: 'rgba(8,145,178,.1)',   color: '#22d3ee' },
    Delete: { bg: 'rgba(239,68,68,.1)',   color: '#f87171' },
  }

  const filtered = data.filter(d =>
    d.action?.toLowerCase().includes(search.toLowerCase()) ||
    d.entityType?.toLowerCase().includes(search.toLowerCase()) ||
    String(d.userId).includes(search)
  )

  const columns = [
    { key: 'auditLogId',  label: 'ID',          render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.auditLogId}</span> },
    { key: 'userId',      label: 'User',         render: r => <span>#{r.userId}</span> },
    { key: 'action',      label: 'Action',       render: r => {
      const s = ACTION_STYLE[r.action] || { bg: 'rgba(255,255,255,.06)', color: 'var(--text-500)' }
      return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.action}</span>
    }},
    { key: 'entityType',  label: 'Entity',       render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.entityType || '—'}</span> },
    { key: 'entityId',    label: 'Entity ID',    render: r => r.entityId ? <span>#{r.entityId}</span> : '—' },
    { key: 'description', label: 'Description',  render: r => <span style={{ color: 'var(--text-600)', fontSize: 12 }}>{r.description || '—'}</span> },
    { key: 'createdAt',   label: 'Timestamp',    render: r => r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—' },
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Audit Logs"
        subtitle="Read-only compliance and activity trail"
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            <i className="bi bi-shield-check" style={{ color: 'var(--cyan-light)', fontSize: 14 }}></i>
            All Audit Logs <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, entity, user..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} emptyMsg="No audit logs found." />
      </div>
    </div>
  )
}