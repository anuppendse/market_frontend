import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import { Toolbar, Spacer } from "../../components/Toolbar";
import { fetchSalesReport, fetchGateActivityReport } from "../../api/endpoints";

export default function ReportsPage({ showSales = true, showGateActivity = true }) {
  const [sales, setSales] = useState([]);
  const [gateActivity, setGateActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [salesData, gateData] = await Promise.all([
        showSales ? fetchSalesReport() : Promise.resolve([]),
        showGateActivity ? fetchGateActivityReport() : Promise.resolve([]),
      ]);
      setSales(salesData);
      setGateActivity(gateData);
      setLoading(false);
    }
    load();
  }, [showSales, showGateActivity]);

  const salesColumns = [
    { key: "bill_date", header: "Date" },
    { key: "bill_count", header: "Bills" },
    { key: "gross_total", header: "Gross Amount", render: (r) => `₹${r.gross_total.toLocaleString("en-IN")}` },
    { key: "commission_total", header: "Commission", render: (r) => `₹${r.commission_total.toLocaleString("en-IN")}` },
    { key: "market_fee_total", header: "Market Fee", render: (r) => `₹${r.market_fee_total.toLocaleString("en-IN")}` },
    { key: "net_total", header: "Net Payable", render: (r) => `₹${r.net_total.toLocaleString("en-IN")}` },
  ];

  const gateColumns = [
    { key: "day", header: "Date" },
    { key: "entries", header: "Entries" },
    { key: "exits", header: "Exits" },
    { key: "unique_vehicles", header: "Unique Vehicles" },
    { key: "total_weight", header: "Total Weight", render: (r) => `${r.total_weight.toLocaleString("en-IN")} kg` },
  ];

  return (
    <div>
      <Toolbar>
        <button className="btn btn-outline">📅 Date range</button>
        <Spacer />
        <button className="btn btn-primary">Export PDF/Excel</button>
      </Toolbar>

      {showSales && (
        <div className="mb-6">
          <div className="card">
            <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Sales &amp; Commission — By Day</h3></div>
            <div className="p-0">
              <DataTable columns={salesColumns} rows={sales} loading={loading} />
            </div>
          </div>
        </div>
      )}

      {showGateActivity && (
        <div className="card">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Gate Activity — Entries / Exits by Day</h3></div>
          <div className="p-0">
            <DataTable columns={gateColumns} rows={gateActivity} loading={loading} />
          </div>
        </div>
      )}
    </div>
  );
}
