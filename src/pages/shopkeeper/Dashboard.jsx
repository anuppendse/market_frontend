import { useEffect, useState } from "react";
import KpiCard from "../../components/KpiCard";
import DataTable from "../../components/DataTable";
import { fetchFarmers, fetchBills } from "../../api/endpoints";

export default function Dashboard() {
  const [farmers, setFarmers] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    Promise.all([fetchFarmers(), fetchBills()]).then(([f, b]) => {
      setFarmers(f);
      setBills(b);
    });
  }, []);

  const todayTotal = bills.reduce((sum, b) => sum + b.net_payable, 0);

  const columns = [
    { key: "receipt_no", header: "Receipt No" },
    { key: "farmer_name", header: "Farmer" },
    { key: "commodities", header: "Commodities", render: (r) => r.line_items.map((li) => li.commodity_name).join(", ") },
    { key: "net_payable", header: "Net Payable", render: (r) => `₹${r.net_payable.toLocaleString("en-IN")}` },
    { key: "bill_date", header: "Date" },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3.5 mb-4.5">
        <KpiCard label="Farmers on Record" value={farmers.length} />
        <KpiCard label="Bills Generated" value={bills.length} />
        <KpiCard label="Total Net Payable" value={`₹${todayTotal.toLocaleString("en-IN")}`} tone="amber" />
      </div>

      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Recent Bills</h3></div>
        <div className="p-0">
          <DataTable columns={columns} rows={bills.slice(0, 8)} loading={false} />
        </div>
      </div>
    </div>
  );
}
