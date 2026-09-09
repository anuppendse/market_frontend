export default function DataTable({ columns, rows, loading, emptyText = "No records found." }) {
  return (
    <div className="card">
      <div className="p-0 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-[11px] text-inksoft font-bold px-3.5 py-2.5 border-b border-line bg-[#F7F5EF] whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="text-center text-inksoft text-[13px] py-8">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-inksoft text-[13px] py-8">
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, idx) => (
                <tr key={row.id ?? idx} className="hover:bg-[#FAF9F4]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3.5 py-2.5 border-b border-line align-middle last:border-b-0">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
