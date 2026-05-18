export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-wrap">
      <i className="bi bi-search search-icon"></i>
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