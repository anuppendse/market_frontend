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

  async function load(params = {}) {
    setLoading(true);
    const data = await fetchGateActivityReport(params);
    setGateActivity(data);
    setLoading(false);
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
    { key: "total_weight", header: "Total Weight", render: (r) => `${r.total_weight.toLocaleString("en-IN")} kg` },
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
