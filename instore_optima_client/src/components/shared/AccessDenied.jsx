export default function AccessDenied({ role, requiredRole }) {
  const messages = {
    Staff:   { title: 'Access Restricted', sub: `This section requires ${requiredRole || 'Manager'} access or higher. Your current role is Staff.` },
    Manager: { title: 'Admin Only',        sub: 'This section is restricted to Administrators only. Your current role is Manager.' },
  }
  const { title, sub } = messages[role] || { title: 'Access Restricted', sub: 'You do not have permission to view this page.' }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 360, padding: 40, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(239,68,68,.1)', border: '2px solid rgba(239,68,68,.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30, color: '#f87171', marginBottom: 20,
      }}>
        <i className="bi bi-lock-fill"></i>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f1f5f9)', margin: '0 0 8px', letterSpacing: '-.02em' }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)', maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
        {sub}
      </p>
    </div>
  )
}
