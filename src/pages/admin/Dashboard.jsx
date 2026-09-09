import { useEffect, useState } from "react";
import KpiCard from "../../components/KpiCard";
import DataTable from "../../components/DataTable";
import { fetchUsers, fetchMarkets, fetchShops, fetchBills } from "../../api/endpoints";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [shops, setShops] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchMarkets(), fetchShops(), fetchBills()]).then(
      ([u, m, s, b]) => {
        setUsers(u);
        setMarkets(m);
        setShops(s);
        setBills(b);
      }
    );
  }, []);

  const todayTotal = bills.reduce((sum, b) => sum + b.net_payable, 0);
  const activeShops = shops.filter((s) => s.status === "ACTIVE").length;

  const columns = [
    { key: "receipt_no", header: "Receipt No" },
    { key: "shop_name", header: "Shop" },
    { key: "farmer_name", header: "Farmer" },
    { key: "net_payable", header: "Net Payable", render: (r) => `₹${r.net_payable.toLocaleString("en-IN")}` },
    { key: "bill_date", header: "Date" },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-3.5 mb-4.5">
        <KpiCard label="Total Markets" value={markets.length} />
        <KpiCard label="Total Users" value={users.length} />
        <KpiCard label="Active Shops" value={activeShops} tone="amber" />
        <KpiCard label="Today's Transaction Value" value={`₹${todayTotal.toLocaleString("en-IN")}`} tone="amber" />
      </div>

      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Recent Bills — All Markets</h3></div>
        <div className="p-0">
          <DataTable columns={columns} rows={bills.slice(0, 8)} loading={false} />
        </div>
      </div>
    </div>
  );
}
