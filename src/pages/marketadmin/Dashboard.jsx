import { useEffect, useState } from "react";
import KpiCard from "../../components/KpiCard";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import { fetchUsers, fetchShops, fetchGateEntries, fetchBills } from "../../api/endpoints";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [gateEntries, setGateEntries] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchShops(), fetchGateEntries(), fetchBills()]).then(
      ([u, s, g, b]) => {
        setUsers(u);
        setShops(s);
        setGateEntries(g);
        setBills(b);
      }
    );
  }, []);

  const totalWeight = gateEntries.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
  const todayTotal = bills.reduce((sum, b) => sum + b.net_payable, 0);

  const columns = [
    { key: "name", header: "User" },
    { key: "role_display_name", header: "Role" },
    { key: "mobile", header: "Mobile" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Suspended"} /> },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-3.5 mb-4.5">
        <KpiCard label="Total Users" value={users.length} />
        <KpiCard label="Active Shops" value={shops.filter((s) => s.status === "ACTIVE").length} />
        <KpiCard label="Today's Transaction Value" value={`₹${todayTotal.toLocaleString("en-IN")}`} tone="amber" />
        <KpiCard label="Total Arrivals Today" value={`${totalWeight.toLocaleString("en-IN")} kg`} />
      </div>

      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Users</h3></div>
        <div className="p-0">
          <DataTable columns={columns} rows={users.slice(0, 6)} loading={false} />
        </div>
      </div>
    </div>
  );
}
