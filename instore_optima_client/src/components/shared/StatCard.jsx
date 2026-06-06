// StatCard.jsx
// A small metric card used on the Dashboard to display key numbers at a glance
// (e.g. "Total Products – 142", "Pending Orders – 7").
// Each card has a colour-coded accent and an optional delta row that shows a
// change indicator (e.g. "+3 this week") styled by its deltaType.

// COLOR_MAP validates the colour prop and maps it to a CSS class suffix.
// Only colours listed here get the matching stat-card CSS styling; anything
// else falls back to 'cyan'.
const COLOR_MAP = {
  cyan:   'cyan',
  purple: 'purple',
  amber:  'amber',
  green:  'green',
  red:    'red',
}

// Props:
//   label     – descriptive text below the main value (e.g. "Total Products").
//   value     – the primary metric to display (number or string).
//   color     – accent colour key from COLOR_MAP (defaults to 'cyan').
//   delta     – optional change string (e.g. "+3 this week").  Omit to hide the row.
//   deltaType – CSS class for the delta colouring: 'positive', 'negative', or 'neutral'.
export default function StatCard({ label, value, color = 'cyan', delta, deltaType = 'neutral' }) {
  return (
    // The color class drives the card's accent border / background via CSS.
    <div className={`stat-card ${COLOR_MAP[color] || 'cyan'}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {/* Delta row only renders when a delta string is provided */}
      {delta && <div className={`stat-delta ${deltaType}`}>{delta}</div>}
    </div>
  )
}