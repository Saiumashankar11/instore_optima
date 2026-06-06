// SearchBar.jsx
// A controlled search input component with an embedded magnifier icon.
// Used at the top of data tables (Products, Stock, Orders, etc.) to let the
// user filter the visible rows by typing a keyword.
// This is a "controlled" component — the parent owns the state and passes both
// the current value and an onChange handler down as props.

// Props:
//   value       – the current search string stored in the parent's state.
//   onChange    – event handler called on every keystroke (e.g. e => setValue(e.target.value)).
//   placeholder – hint text shown when the input is empty.
export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    // search-wrap uses position: relative so the search icon can be layered over the input.
    <div className="search-wrap">
      {/* Search icon overlaid on the left of the input field */}
      <i className="bi bi-search search-icon"></i>
      {/* paddingLeft: 32 indents the typed text so it doesn't overlap the icon */}
      <input
        className="form-control-custom"
        style={{ paddingLeft: 32 }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}