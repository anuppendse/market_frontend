export function Toolbar({ children }) {
  return <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">{children}</div>;
}

// Search input. Searching only starts after 3 characters -- the pages use
// activeSearchTerm() from utils/search.js. The hint below tells the user why
// nothing is happening while they have typed only 1-2 characters.
export function SearchBox({ value, onChange, placeholder = "Search..." }) {
  const typed = (value || "").trim().length;
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-white border border-line rounded-md px-3 py-1.5 text-[12.5px] text-inksoft min-w-[220px]">
        <span>🔍</span>
        <input
          className="border-none outline-none font-inherit text-[12.5px] w-full bg-transparent"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {typed > 0 && typed < 3 && (
        <div className="absolute left-1 top-full mt-0.5 text-[11px] text-amber-600 whitespace-nowrap">
          Type at least 3 characters to search
        </div>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options }) {
  return (
    <select
      className="border border-line rounded-md px-2.5 py-1.5 font-inherit text-[12.5px] bg-white text-ink"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function Spacer() {
  return <div className="flex-1" />;
}
