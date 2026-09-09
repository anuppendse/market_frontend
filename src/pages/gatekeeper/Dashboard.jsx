import { useEffect, useState } from "react";
import KpiCard from "../../components/KpiCard";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import { fetchGateEntries } from "../../api/endpoints";

export default function Dashboard() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchGateEntries().then(setEntries);
  }, []);

  const totalWeight = entries.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
  const inside = entries.filter((e) => e.entry_status === "ENTERED").length;

  const columns = [
    { key: "vehicle_no", header: "Vehicle No" },
    { key: "driver_name", header: "Driver" },
    { key: "entry_time", header: "Entry", render: (r) => new Date(r.entry_time).toLocaleTimeString() },
    { key: "entry_status", header: "Status", render: (r) => <StatusPill status={r.entry_status} label={r.entry_status === "ENTERED" ? "Entered" : "Exited"} /> },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3.5 mb-4.5">
        <KpiCard label="Vehicles Today" value={entries.length} />
        <KpiCard label="Currently Inside" value={inside} tone="amber" />
        <KpiCard label="Total Arrivals Today" value={`${totalWeight.toLocaleString("en-IN")} kg`} />
      </div>

      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Recent Gate Activity</h3></div>
        <div className="p-0">
          <DataTable columns={columns} rows={entries.slice(0, 8)} loading={false} />
        </div>
      </div>
    </div>
  );
}
