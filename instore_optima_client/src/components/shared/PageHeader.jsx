// PageHeader.jsx
// A simple, reusable page-title strip placed at the top of most content pages.
// It renders a heading on the left (with an optional subtitle) and an optional
// action element — typically a button like "Add Product" — pinned to the right.

// Props:
//   title    – main page heading text (e.g. "Products").
//   subtitle – optional secondary line beneath the heading (e.g. record count).
//   action   – optional JSX node rendered on the right side (e.g. an <AddButton>).
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {/* Only render the subtitle paragraph when one is provided */}
        {subtitle && <p>{subtitle}</p>}
      </div>
      {/* flexShrink: 0 stops the action button from being squeezed on narrow screens */}
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}