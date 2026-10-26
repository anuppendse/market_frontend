import { useEffect, useState } from "react";
import KpiCard from "../../components/KpiCard";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import Modal from "../../components/Modal";
import { fetchGateEntries } from "../../api/endpoints";
import { todayISO } from "../../utils/dateRanges";

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setLoadError("");
    // Filtered server-side to today's date, rather than fetching every
    // record ever logged and cutting it down in the browser -- keeps this
    // fast no matter how much history has piled up.
    const today = todayISO();
    fetchGateEntries({ date_from: today, date_to: today })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("fetchGateEntries failed:", err);
        setEntries([]);
        const status = err?.response?.status;
        setLoadError(`Could not load today's gate activity${status ? ` (server error ${status})` : " (cannot reach the server)"}.`);
      })
      .finally(() => setLoading(false));
  }

  // "Vehicles Today" counts each distinct vehicle once, even if it made
  // more than one visit today.
  const uniqueVehiclesToday = new Set(entries.map((e) => e.vehicle_no)).size;
  const inside = entries.filter((e) => e.entry_status === "ENTERED").length;
  const totalWeight = entries.reduce((sum, e) => sum + (Number(e.weight_kg) || 0), 0);

  // Latest activity first -- an exited vehicle's most recent activity is its
  // exit, not its (earlier) entry, so this sorts on whichever is later.
  // Vehicles still inside come first, exited vehicles below them.
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.entry_status !== b.entry_status) return a.entry_status === "ENTERED" ? -1 : 1;
    return new Date(b.exit_time || b.entry_time) - new Date(a.exit_time || a.entry_time);
  });

  const columns = [
    {
      key: "vehicle_no",
      header: "Vehicle No",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelected(r)}
          className="text-green-800 font-semibold underline decoration-dotted underline-offset-2 bg-transparent border-none p-0 cursor-pointer"
        >
          {r.vehicle_no}
        </button>
      ),
    },
    { key: "driver_name", header: "Driver" },
    { key: "gate_pass_no", header: "Gate Pass No" },
    { key: "shops", header: "Shop(s)", render: (r) => (Array.isArray(r.shops) && r.shops.length ? r.shops.join(", ") : "—") },
    { key: "entry_time", header: "Entry", render: (r) => new Date(r.entry_time).toLocaleTimeString() },
    { key: "exit_time", header: "Exit", render: (r) => (r.exit_time ? new Date(r.exit_time).toLocaleTimeString() : "—") },
    { key: "entry_status", header: "Status", render: (r) => <StatusPill status={r.entry_status} label={r.entry_status === "ENTERED" ? "Entered" : "Exited"} /> },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3.5 mb-4.5">
        <KpiCard label="Vehicles Today" value={uniqueVehiclesToday} />
        <KpiCard label="Currently Inside" value={inside} tone="amber" />
        <KpiCard label="Total Arrivals Today" value={`${totalWeight.toLocaleString("en-IN")} kg`} />
      </div>

      {loadError && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">
          {loadError} <button type="button" className="btn-text" onClick={load}>Retry</button>
        </div>
      )}
      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Recent Gate Activity</h3></div>
        <div className="p-0">
          <DataTable columns={columns} rows={sortedEntries} loading={loading} emptyText="No vehicle activity today" />
        </div>
      </div>

      <Modal open={!!selected} title="Vehicle Details" onClose={() => setSelected(null)} maxWidth="380px">
        {selected && (
          <table className="w-full text-[13px]">
            <tbody>
              <tr><td className="text-inksoft py-1.5">Vehicle No</td><td className="text-right">{selected.vehicle_no || "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Driver Name</td><td className="text-right">{selected.driver_name || "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Gate Pass No</td><td className="text-right">{selected.gate_pass_no || "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Shop(s)</td><td className="text-right">{Array.isArray(selected.shops) && selected.shops.length ? selected.shops.join(", ") : "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Entry Date</td><td className="text-right">{selected.entry_time ? new Date(selected.entry_time).toLocaleDateString() : "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Entry Time</td><td className="text-right">{selected.entry_time ? new Date(selected.entry_time).toLocaleTimeString() : "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Exit Date</td><td className="text-right">{selected.exit_time ? new Date(selected.exit_time).toLocaleDateString() : "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Exit Time</td><td className="text-right">{selected.exit_time ? new Date(selected.exit_time).toLocaleTimeString() : "—"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Status</td><td className="text-right">{selected.entry_status === "ENTERED" ? "Entered" : "Exited"}</td></tr>
              <tr><td className="text-inksoft py-1.5">Weight</td><td className="text-right">{selected.weight_kg != null ? `${selected.weight_kg.toLocaleString("en-IN")} kg` : "Not weighed yet"}</td></tr>
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
