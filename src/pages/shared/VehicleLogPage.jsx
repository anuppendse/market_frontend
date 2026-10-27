import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import DateRangePicker from "../../components/DateRangePicker";
import ExportMenu from "../../components/ExportMenu";
import ReportPrintSheet from "../../components/ReportPrintSheet";
import { Toolbar, Spacer } from "../../components/Toolbar";
import KpiCard from "../../components/KpiCard";
import { fetchGateEntries } from "../../api/endpoints";
import { todayISO } from "../../utils/dateRanges";

const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString() : "—");
const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function VehicleLogPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [appliedLabel, setAppliedLabel] = useState(null);
  const [lastParams, setLastParams] = useState(null);

  // Default view is TODAY's gate log. Always ends loading -- even when the
  // server fails -- so the page can never sit on "Loading..." forever.
  async function load(params) {
    const effective = params || { date_from: todayISO(), date_to: todayISO() };
    setLastParams(params || null);
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchGateEntries(effective);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchGateEntries failed:", err);
      setEntries([]);
      const status = err?.response?.status;
      setLoadError(
        err?.response?.data?.error ||
          `Could not load the vehicle log${status ? ` (server error ${status})` : " (cannot reach the server)"}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(period, date_from, date_to, label) {
    setAppliedLabel(label);
    load({ date_from, date_to });
  }

  function handleClear() {
    setAppliedLabel(null);
    load();
  }

  // Vehicles currently inside (ENTERED) are listed first, newest entry on top;
  // exited vehicles follow below, most recent exit first.
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.entry_status !== b.entry_status) return a.entry_status === "ENTERED" ? -1 : 1;
    if (a.entry_status === "ENTERED") return new Date(b.entry_time) - new Date(a.entry_time);
    return new Date(b.exit_time || b.entry_time) - new Date(a.exit_time || a.entry_time);
  });

  const insideCount = entries.filter((e) => e.entry_status === "ENTERED").length;
  const totalWeight = entries.reduce((sum, e) => sum + (Number(e.weight_kg) || 0), 0);

  const columns = [
    { key: "vehicle_no", header: "Vehicle No" },
    { key: "driver_name", header: "Driver Name" },
    { key: "gate_pass_no", header: "Gate Pass No" },
    { key: "shops", header: "Shop(s)", render: (r) => (Array.isArray(r.shops) && r.shops.length ? r.shops.join(", ") : "—") },
    { key: "weight_kg", header: "Weight", render: (r) => (r.weight_kg != null ? `${Number(r.weight_kg).toLocaleString("en-IN")} kg` : "—") },
    { key: "entry_time", header: "Entry Time", render: (r) => (appliedLabel ? fmtDateTime(r.entry_time) : fmtTime(r.entry_time)) },
    { key: "exit_time", header: "Exit Time", render: (r) => (appliedLabel ? fmtDateTime(r.exit_time) : fmtTime(r.exit_time)) },
    { key: "entry_status", header: "Status", render: (r) => <StatusPill status={r.entry_status} label={r.entry_status === "ENTERED" ? "Entered" : "Exited"} /> },
  ];

  // Plain-text columns for the PDF / Excel export (the on-screen status pill is JSX).
  const exportColumns = columns.map((c) =>
    c.key === "entry_status"
      ? { key: c.key, header: c.header, render: (r) => (r.entry_status === "ENTERED" ? "Entered" : "Exited") }
      : c
  );
  const exportSections = [{ title: "Vehicle Entry Log", columns: exportColumns, rows: sortedEntries }];
  const exportPeriod = appliedLabel || `Today (${todayISO()})`;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3.5 mb-4.5">
        <KpiCard label={appliedLabel ? "Vehicle Movements" : "Vehicles Today"} value={entries.length} />
        <KpiCard label="Currently Inside" value={insideCount} tone="amber" />
        <KpiCard label="Total Weight" value={`${totalWeight.toLocaleString("en-IN")} kg`} />
      </div>

      <Toolbar>
        <span className="text-[12.5px] text-inksoft">
          {insideCount} entered · {entries.length - insideCount} exited
          {appliedLabel ? ` — ${appliedLabel}` : " — today"}
        </span>
        <Spacer />
        <DateRangePicker onApply={handleApply} onClear={handleClear} appliedLabel={appliedLabel} />
        <ExportMenu
          reportTitle="Vehicle Entry Log"
          periodLabel={exportPeriod}
          sections={exportSections}
          filenameBase="vehicle_entry_log"
        />
      </Toolbar>

      {loadError && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">
          {loadError}{" "}
          <button type="button" className="btn-text" onClick={() => load(lastParams)}>Retry</button>
        </div>
      )}

      <DataTable columns={columns} rows={sortedEntries} loading={loading} emptyText="No vehicle movements for this period." />

      <ReportPrintSheet reportTitle="Vehicle Entry Log" periodLabel={exportPeriod} sections={exportSections} />
    </div>
  );
}
