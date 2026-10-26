import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import DateRangePicker from "../../components/DateRangePicker";
import ExportMenu from "../../components/ExportMenu";
import ReportPrintSheet from "../../components/ReportPrintSheet";
import { Toolbar, Spacer } from "../../components/Toolbar";
import { fetchGateActivityReport } from "../../api/endpoints";

export default function GatekeeperReportsPage() {
  const [gateActivity, setGateActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(null); // null = default, unfiltered day-by-day view
  const [appliedLabel, setAppliedLabel] = useState(null);
  const [loadError, setLoadError] = useState("");

  async function load(params = {}) {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchGateActivityReport(params);
      setGateActivity(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchGateActivityReport failed:", err);
      setGateActivity([]);
      const status = err?.response?.status;
      setLoadError(`Could not load the gate activity report${status ? ` (server error ${status})` : " (cannot reach the server)"}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleApply(newPeriod, date_from, date_to, label) {
    setPeriod(newPeriod);
    setAppliedLabel(label);
    load({ period: newPeriod, date_from, date_to });
  }

  function handleClear() {
    setPeriod(null);
    setAppliedLabel(null);
    load();
  }

  const gateColumns = [
    { key: "day", header: "Date / Period" },
    { key: "entries", header: "Entries" },
    { key: "exits", header: "Exits" },
    { key: "unique_vehicles", header: "Unique Vehicles" },
    { key: "total_weight", header: "Total Weight", render: (r) => `${Number(r.total_weight || 0).toLocaleString("en-IN")} kg` },
  ];

  // "week"/"month"/"year" collapse the whole range into a single aggregate
  // row from the backend, so the print label is swapped in for it. "day" now
  // returns one row per date in the selected range, so each row keeps its
  // own date instead of being overwritten with the overall range label.
  const printRows =
    ["week", "month", "year"].includes(period) && gateActivity.length > 0
      ? gateActivity.map((r) => ({ ...r, day: appliedLabel }))
      : gateActivity;

  const sections = [{ title: "Gate Activity — Entries / Exits by Day", columns: gateColumns, rows: printRows }];

  return (
    <div>
      <Toolbar>
        <DateRangePicker onApply={handleApply} onClear={handleClear} appliedLabel={appliedLabel} />
        <Spacer />
        <ExportMenu
          reportTitle="Gate Activity Report"
          periodLabel={appliedLabel}
          sections={sections}
          filenameBase="gate_activity_report"
        />
      </Toolbar>

      {loadError && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{loadError}</div>
      )}
      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Gate Activity — Entries / Exits by Day</h3></div>
        <div className="p-0">
          <DataTable columns={gateColumns} rows={printRows} loading={loading} />
        </div>
      </div>

      <ReportPrintSheet reportTitle="Gate Activity Report" periodLabel={appliedLabel} sections={sections} />
    </div>
  );
}
