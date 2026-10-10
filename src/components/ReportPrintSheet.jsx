import { cellText } from "../utils/reportExport";

// Hidden on screen (.print-only); shown when the browser prints, which is
// what "Export → PDF" uses. Only sections that have records are printed.
export default function ReportPrintSheet({ reportTitle, periodLabel, sections }) {
  return (
    <div className="print-only">
      <h2 style={{ margin: "0 0 4px" }}>APMC Billing System</h2>
      <h3 style={{ margin: "0 0 4px" }}>{reportTitle}</h3>
      <p style={{ margin: "0 0 16px", color: "#555" }}>{periodLabel ? `Period: ${periodLabel}` : "All available days"}</p>
      {sections
        .filter((s) => s.rows.length > 0)
        .map((s) => (
          <div key={s.title} style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 6px" }}>{s.title}</h4>
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {s.columns.map((c) => (
                    <th key={c.key} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 8px" }}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i}>
                    {s.columns.map((c) => (
                      <td key={c.key} style={{ borderBottom: "1px solid #eee", padding: "6px 8px" }}>
                        {cellText(c, r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
