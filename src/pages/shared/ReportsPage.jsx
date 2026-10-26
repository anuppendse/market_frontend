import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import DateRangePicker from "../../components/DateRangePicker";
import ExportMenu from "../../components/ExportMenu";
import ReportPrintSheet from "../../components/ReportPrintSheet";
import { Toolbar, Spacer } from "../../components/Toolbar";
import { fetchSalesReport, fetchGateActivityReport } from "../../api/endpoints";

export default function ReportsPage({ showSales = true, showGateActivity = true }) {
  const [sales, setSales] = useState([]);
  const [gateActivity, setGateActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(null); // null = default, unfiltered day-by-day view
  const [appliedLabel, setAppliedLabel] = useState(null);
  const [loadErrors, setLoadErrors] = useState([]);

  // Sales and gate activity load independently: if one fails the other still
  // shows, and the page never stays stuck on "Loading...".
  async function load(params = {}) {
    setLoading(true);
    const [salesRes, gateRes] = await Promise.allSettled([
      showSales ? fetchSalesReport(params) : Promise.resolve([]),
      showGateActivity ? fetchGateActivityReport(params) : Promise.resolve([]),
    ]);
    const problems = [];
    const describe = (r) => (r.reason?.response?.status ? `server error ${r.reason.response.status}` : "cannot reach the server");
    if (salesRes.status === "fulfilled") setSales(Array.isArray(salesRes.value) ? salesRes.value : []);
    else { setSales([]); problems.push(`Could not load the sales report (${describe(salesRes)}).`); }
    if (gateRes.status === "fulfilled") setGateActivity(Array.isArray(gateRes.value) ? gateRes.value : []);
    else { setGateActivity([]); problems.push(`Could not load the gate activity report (${describe(gateRes)}).`); }
    setLoadErrors(problems);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [showSales, showGateActivity]);

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

  const salesColumns = [
    { key: "bill_date", header: "Date" },
    { key: "bill_count", header: "Bills" },
    { key: "gross_total", header: "Gross Amount", render: (r) => `₹${Number(r.gross_total || 0).toLocaleString("en-IN")}` },
    { key: "commission_total", header: "Commission", render: (r) => `₹${Number(r.commission_total || 0).toLocaleString("en-IN")}` },
    { key: "market_fee_total", header: "Market Fee", render: (r) => `₹${Number(r.market_fee_total || 0).toLocaleString("en-IN")}` },
    { key: "net_total", header: "Net Payable", render: (r) => `₹${Number(r.net_total || 0).toLocaleString("en-IN")}` },
  ];

  const gateColumns = [
    { key: "day", header: "Date" },
    { key: "entries", header: "Entries" },
    { key: "exits", header: "Exits" },
    { key: "unique_vehicles", header: "Unique Vehicles" },
    { key: "total_weight", header: "Total Weight", render: (r) => `${Number(r.total_weight || 0).toLocaleString("en-IN")} kg` },
  ];

  // "week"/"month"/"year" collapse the whole range into a single aggregate
  // row from the backend, so the readable period label is swapped in for it
  // (same behaviour as the Gate Keeper report). "day" keeps one row per date.
  const collapsed = ["week", "month", "year"].includes(period);
  const salesRows = collapsed ? sales.map((r) => ({ ...r, bill_date: appliedLabel })) : sales;
  const gateRows = collapsed ? gateActivity.map((r) => ({ ...r, day: appliedLabel })) : gateActivity;

  const sections = [];
  if (showSales) sections.push({ title: "Sales & Commission — By Day", columns: salesColumns, rows: salesRows });
  if (showGateActivity) sections.push({ title: "Gate Activity — Entries / Exits by Day", columns: gateColumns, rows: gateRows });

  const reportTitle = showSales && showGateActivity ? "Sales & Gate Activity Report" : "Sales & Commission Report";
  const filenameBase = showSales && showGateActivity ? "sales_gate_activity_report" : "sales_commission_report";

  return (
    <div>
      <Toolbar>
        <DateRangePicker onApply={handleApply} onClear={handleClear} appliedLabel={appliedLabel} />
        <Spacer />
        <ExportMenu reportTitle={reportTitle} periodLabel={appliedLabel} sections={sections} filenameBase={filenameBase} />
      </Toolbar>

      {loadErrors.length > 0 && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">
          {loadErrors.map((m, i) => <div key={i}>{m}</div>)}
        </div>
      )}

      {showSales && (
        <div className="mb-6">
          <div className="card">
            <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Sales &amp; Commission — By Day</h3></div>
            <div className="p-0">
              <DataTable columns={salesColumns} rows={salesRows} loading={loading} />
            </div>
          </div>
        </div>
      )}

      {showGateActivity && (
        <div className="card">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Gate Activity — Entries / Exits by Day</h3></div>
          <div className="p-0">
            <DataTable columns={gateColumns} rows={gateRows} loading={loading} />
          </div>
        </div>
      )}

      <ReportPrintSheet reportTitle={reportTitle} periodLabel={appliedLabel} sections={sections} />
    </div>
  );
}
