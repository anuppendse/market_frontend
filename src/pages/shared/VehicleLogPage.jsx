import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import DateRangePicker from "../../components/DateRangePicker";
import { Toolbar, Spacer } from "../../components/Toolbar";
import KpiCard from "../../components/KpiCard";
import { fetchGateEntries } from "../../api/endpoints";

export default function VehicleLogPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedLabel, setAppliedLabel] = useState(null);

  async function load(params = {}) {
    setLoading(true);
    setEntries(await fetchGateEntries(params));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handleApply(period, date_from, date_to, label) {
    setAppliedLabel(label);
    load({ date_from, date_to });
  }

  function handleClear() {
    setAppliedLabel(null);
    load();
  }

  function exportPdf() {
    window.print();
  }

  const totalWeight = entries.reduce((sum, e) => sum + (e.weight_kg || 0), 0);

  const columns = [
    { key: "vehicle_no", header: "Vehicle No" },
    { key: "driver_name", header: "Driver" },
    { key: "shops", header: "Shop(s)", render: (r) => r.shops?.join(", ") || "—" },
    { key: "gate_pass_no", header: "Gate Pass No" },
    { key: "weight_kg", header: "Weight", render: (r) => (r.weight_kg != null ? `${r.weight_kg.toLocaleString("en-IN")} kg` : "—") },
    { key: "entry_time", header: "Entry", render: (r) => (r.entry_time ? new Date(r.entry_time).toLocaleTimeString() : "—") },
    { key: "exit_time", header: "Exit", render: (r) => (r.exit_time ? new Date(r.exit_time).toLocaleTimeString() : "—") },
    { key: "entry_status", header: "Status", render: (r) => <StatusPill status={r.entry_status} label={r.entry_status === "ENTERED" ? "Entered" : "Exited"} /> },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3.5 mb-4.5">
        <KpiCard label="Vehicles Today" value={entries.length} />
        <KpiCard label="Currently Inside" value={entries.filter((e) => e.entry_status === "ENTERED").length} tone="amber" />
        <KpiCard label="Total Weight" value={`${totalWeight.toLocaleString("en-IN")} kg`} />
      </div>

      <Toolbar>
        <span className="text-[12.5px] text-inksoft">{entries.length} vehicle movements logged</span>
        <Spacer />
        <DateRangePicker onApply={handleApply} onClear={handleClear} appliedLabel={appliedLabel} />
        <button className="btn btn-primary" onClick={exportPdf}>Export PDF/Excel</button>
      </Toolbar>

      <DataTable columns={columns} rows={entries} loading={loading} />

      <div className="print-only">
        <h2 style={{ margin: "0 0 4px" }}>APMC Billing System</h2>
        <h3 style={{ margin: "0 0 4px" }}>Vehicle Entry Log</h3>
        <p style={{ margin: "0 0 16px", color: "#555" }}>{appliedLabel ? `Period: ${appliedLabel}` : "All available entries"}</p>
        <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 8px" }}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.key} style={{ borderBottom: "1px solid #eee", padding: "6px 8px" }}>
                    {c.key === "entry_status" ? (r.entry_status === "ENTERED" ? "Entered" : "Exited") : c.render ? c.render(r) : r[c.key]}
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
