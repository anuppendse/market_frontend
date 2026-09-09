import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import { Toolbar, Spacer } from "../../components/Toolbar";
import { fetchGateEntries, logVehicleEntry, logVehicleExit, fetchShops } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { id: "entry", label: "Log Entry" },
  { id: "exit", label: "Log Exit" },
  { id: "log", label: "Today's Log" },
];

export default function GateOperations() {
  const { user } = useAuth();
  const [tab, setTab] = useState("entry");
  const [entries, setEntries] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const [entryForm, setEntryForm] = useState({
    vehicle_no: "",
    driver_name: "",
    weight_kg: "",
    shop_ids: [],
  });
  const [exitEntryId, setExitEntryId] = useState("");
  const [finalWeight, setFinalWeight] = useState("");
  const [message, setMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    const [entriesData, shopsData] = await Promise.all([
      fetchGateEntries(),
      fetchShops(),
    ]);
    setEntries(entriesData);
    setShops(shopsData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const openEntries = entries.filter((e) => e.entry_status === "ENTERED");

  function toggleShop(id) {
    setEntryForm((f) => ({
      ...f,
      shop_ids: f.shop_ids.includes(id) ? f.shop_ids.filter((s) => s !== id) : [...f.shop_ids, id],
    }));
  }

  async function submitEntry(e) {
    e.preventDefault();
    setMessage("");
    const created = await logVehicleEntry({
      market_id: user.market_id,
      vehicle_no: entryForm.vehicle_no,
      driver_name: entryForm.driver_name,
      weight_kg: entryForm.weight_kg ? Number(entryForm.weight_kg) : null,
      shop_ids: entryForm.shop_ids,
    });
    setMessage(`Gate pass ${created.gate_pass_no} issued and entry logged.`);
    setEntryForm({ vehicle_no: "", driver_name: "", weight_kg: "", shop_ids: [] });
    loadAll();
  }

  async function submitExit(e) {
    e.preventDefault();
    if (!exitEntryId) return;
    await logVehicleExit(exitEntryId, finalWeight ? { final_weight_kg: Number(finalWeight) } : {});
    setExitEntryId("");
    setFinalWeight("");
    loadAll();
  }

  const logColumns = [
    { key: "vehicle_no", header: "Vehicle No" },
    { key: "driver_name", header: "Driver" },
    { key: "gate_pass_no", header: "Gate Pass No" },
    { key: "shops", header: "Shop(s)", render: (r) => r.shops?.join(", ") || "—" },
    { key: "weight_kg", header: "Weight", render: (r) => (r.weight_kg != null ? `${r.weight_kg.toLocaleString("en-IN")} kg` : "Not weighed yet") },
    { key: "entry_time", header: "Entry", render: (r) => new Date(r.entry_time).toLocaleTimeString() },
    { key: "exit_time", header: "Exit", render: (r) => (r.exit_time ? new Date(r.exit_time).toLocaleTimeString() : "—") },
    { key: "entry_status", header: "Status", render: (r) => <StatusPill status={r.entry_status} label={r.entry_status === "ENTERED" ? "Entered" : "Exited"} /> },
  ];

  return (
    <div>
      <div className="flex gap-1.5 mb-4 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bg-transparent font-semibold text-[13px] px-1 py-2.5 mr-4.5 border-b-2 ${
              tab === t.id ? "text-green-800 border-amber-600" : "text-inksoft border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "entry" && (
        <div className="card">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Register Vehicle &amp; Log Entry</h3></div>
          <div className="p-4.5">
            {message && <div className="mb-3 text-[12.5px] text-[#2A6B36] bg-[#E1EEE0] rounded-md px-3 py-2">{message}</div>}
            <form onSubmit={submitEntry} className="grid grid-cols-2 gap-4">
              <div className="field">
                <label>Vehicle No</label>
                <input value={entryForm.vehicle_no} onChange={(e) => setEntryForm({ ...entryForm, vehicle_no: e.target.value })} placeholder="e.g. MH14 AB 1234" required />
              </div>
              <div className="field">
                <label>Driver Name</label>
                <input value={entryForm.driver_name} onChange={(e) => setEntryForm({ ...entryForm, driver_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Weight (kg) <span className="text-inksoft font-normal">optional, if known at entry</span></label>
                <input type="number" value={entryForm.weight_kg} onChange={(e) => setEntryForm({ ...entryForm, weight_kg: e.target.value })} placeholder="e.g. 8,420" />
              </div>
              <div className="field col-span-2">
                <label>Shop(s)</label>
                <div className="flex gap-2 flex-wrap">
                  {shops.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 border border-line rounded-full px-3 py-1 text-[12px] cursor-pointer bg-[#F3F6F2]">
                      <input type="checkbox" checked={entryForm.shop_ids.includes(s.id)} onChange={() => toggleShop(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <button type="submit" className="btn btn-primary">Issue Gate Pass &amp; Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "exit" && (
        <div className="card">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Log Vehicle Exit</h3></div>
          <div className="p-4.5">
            <form onSubmit={submitExit} className="grid grid-cols-2 gap-4">
              <div className="field col-span-2">
                <label>Vehicle / Gate Pass</label>
                <select value={exitEntryId} onChange={(e) => setExitEntryId(e.target.value)} required>
                  <option value="" disabled>Select an entry currently inside</option>
                  {openEntries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.gate_pass_no} — {e.vehicle_no} (Entered {new Date(e.entry_time).toLocaleTimeString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Final Weight (kg) <span className="text-inksoft font-normal">optional, if re-weighed</span></label>
                <input type="number" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value)} />
              </div>
              <div className="col-span-2 flex gap-2.5">
                <button type="submit" className="btn btn-primary">Confirm Exit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "log" && (
        <div>
          <Toolbar>
            <span className="text-[12.5px] text-inksoft">{entries.length} vehicle movements today</span>
            <Spacer />
            <button className="btn btn-outline">📅 Date range</button>
          </Toolbar>
          <DataTable columns={logColumns} rows={entries} loading={loading} />
        </div>
      )}
    </div>
  );
}
