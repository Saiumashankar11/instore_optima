const COLOR_MAP = {
  cyan:   'cyan',
  purple: 'purple',
  amber:  'amber',
  green:  'green',
  red:    'red',
}

export default function StatCard({ label, value, color = 'cyan', delta, deltaType = 'neutral' }) {
  return (
    <div className={`stat-card ${COLOR_MAP[color] || 'cyan'}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {delta && <div className={`stat-delta ${deltaType}`}>{delta}</div>}
    </div>
  )
}