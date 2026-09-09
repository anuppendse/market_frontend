import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import { Toolbar, Spacer } from "../../components/Toolbar";
import KpiCard from "../../components/KpiCard";
import { fetchGateEntries } from "../../api/endpoints";

export default function VehicleLogPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setEntries(await fetchGateEntries());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
        <button className="btn btn-outline">📅 Date range</button>
        <button className="btn btn-primary">Export PDF/Excel</button>
      </Toolbar>

      <DataTable columns={columns} rows={entries} loading={loading} />
    </div>
  );
}
