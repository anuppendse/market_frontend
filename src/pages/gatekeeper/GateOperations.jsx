import { useEffect, useRef, useState } from "react";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import Modal from "../../components/Modal";
import { Toolbar, Spacer } from "../../components/Toolbar";
import { fetchGateEntries, fetchVehicles, logVehicleEntry, logVehicleExit } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { normalizeVehicleNo, vehicleNoError as getVehicleNoError } from "../../utils/vehicleNo";
import { cleanName, driverNameError as getDriverNameError, weightError as getWeightError } from "../../utils/validators";

function EntrySummaryTable({ entry }) {
  return (
    <table className="w-full text-[13px]">
      <tbody>
        <tr><td className="text-inksoft py-1.5">Gate Pass No</td><td className="text-right font-semibold">{entry.gate_pass_no || "To be issued on save"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Vehicle No</td><td className="text-right">{entry.vehicle_no || "—"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Driver Name</td><td className="text-right">{entry.driver_name || "—"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Estimated Weight</td><td className="text-right">{entry.weight_kg != null ? `${entry.weight_kg.toLocaleString("en-IN")} kg` : "Not weighed yet"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Entry Date</td><td className="text-right">{new Date(entry.entry_time).toLocaleDateString()}</td></tr>
        <tr><td className="text-inksoft py-1.5">Entry Time</td><td className="text-right">{new Date(entry.entry_time).toLocaleTimeString()}</td></tr>
      </tbody>
    </table>
  );
}

const TABS = [
  { id: "entry", label: "Log Entry" },
  { id: "exit", label: "Log Exit" },
  { id: "log", label: "Today's Log" },
];

export default function GateOperations() {
  const { user } = useAuth();
  const [tab, setTab] = useState("entry");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [entryForm, setEntryForm] = useState({
    vehicle_no: "",
    driver_name: "",
    weight_kg: "",
  });
  const [vehicleNoErr, setVehicleNoErr] = useState("");
  const [driverErr, setDriverErr] = useState("");
  const [weightErr, setWeightErr] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const vehicleFieldRef = useRef(null);

  const [exitEntryId, setExitEntryId] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [lastEntry, setLastEntry] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    try {
      const [gateEntries, vehicleList] = await Promise.all([
        fetchGateEntries(),
        fetchVehicles({ market_id: user.market_id }),
      ]);
      setEntries(gateEntries);
      setVehicles(vehicleList);
    } catch (err) {
      console.error("fetchGateEntries failed:", err);
      setLoadError(`Failed to load: gate entries (${err?.response?.status || err?.message || "unknown error"}). Try refreshing the page.`);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Close the Vehicle No autocomplete dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(e) {
      if (vehicleFieldRef.current && !vehicleFieldRef.current.contains(e.target)) {
        setVehicleDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openEntries = entries.filter((e) => e.entry_status === "ENTERED");

  // Existing vehicles whose normalized number starts with what's typed so
  // far -- "MH12" matches "MH12AB1234", typing "MH" lists everything.
  const vehicleMatches = (() => {
    const typed = normalizeVehicleNo(entryForm.vehicle_no);
    if (!typed) return [];
    return vehicles.filter((v) => normalizeVehicleNo(v.vehicle_no).startsWith(typed));
  })();

  function selectVehicle(vehicleNo) {
    setEntryForm((f) => ({ ...f, vehicle_no: vehicleNo }));
    setVehicleNoErr("");
    setVehicleDropdownOpen(false);
    setHighlightedIndex(-1);
  }

  // Arrow Down/Up move the highlighted suggestion, Enter selects it
  // (without submitting the form), Escape closes the dropdown.
  function handleVehicleNoKeyDown(e) {
    if (!vehicleDropdownOpen || vehicleMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % vehicleMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? vehicleMatches.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < vehicleMatches.length) {
        e.preventDefault();
        selectVehicle(vehicleMatches[highlightedIndex].vehicle_no);
      }
    } else if (e.key === "Escape") {
      setVehicleDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  }

  // Validates every entry field, shows each error next to its field, and
  // returns true only when the whole form is valid.
  function validateForm() {
    const vErr = getVehicleNoError(entryForm.vehicle_no);
    const dErr = getDriverNameError(entryForm.driver_name);
    const wErr = getWeightError(entryForm.weight_kg);
    setVehicleNoErr(vErr);
    setDriverErr(dErr);
    setWeightErr(wErr);
    return !vErr && !dErr && !wErr;
  }

  function buildDraftPreview() {
    return {
      gate_pass_no: null,
      vehicle_no: normalizeVehicleNo(entryForm.vehicle_no),
      driver_name: cleanName(entryForm.driver_name),
      weight_kg: entryForm.weight_kg ? Number(entryForm.weight_kg) : null,
      entry_time: new Date().toISOString(),
    };
  }

  function openDraftPreview() {
    if (!validateForm()) return;
    setErrors([]);
    setVehicleDropdownOpen(false);
    setPreviewData(buildDraftPreview());
    setPreviewOpen(true);
  }

  function openSavedPreview() {
    setPreviewData(lastEntry);
    setPreviewOpen(true);
  }

  async function submitEntry(e) {
    e.preventDefault();
    setMessage("");
    setVehicleDropdownOpen(false);
    if (!validateForm()) return;
    setErrors([]);
    try {
      const created = await logVehicleEntry({
        market_id: user.market_id,
        vehicle_no: normalizeVehicleNo(entryForm.vehicle_no),
        driver_name: cleanName(entryForm.driver_name),
        weight_kg: entryForm.weight_kg ? Number(entryForm.weight_kg) : null,
      });
      setMessage(`Gate pass ${created.gate_pass_no} issued and entry logged.`);
      setLastEntry(created);
      setEntryForm({ vehicle_no: "", driver_name: "", weight_kg: "" });
      setVehicleNoErr("");
      setDriverErr("");
      setWeightErr("");
      // Refetches the vehicle master list too, so a newly-registered
      // vehicle number is immediately searchable in the autocomplete
      // without needing a page refresh.
      loadAll();
    } catch (err) {
      // e.g. the vehicle already has an open entry inside the yard -- the
      // backend is the source of truth for this, so whatever it reports
      // (checked against real data, not any state kept in this tab) is
      // shown in the same error banner as the field-validation errors above.
      setErrors([err?.response?.data?.error || "Could not log entry. Please try again."]);
    }
  }

  async function submitExit(e) {
    e.preventDefault();
    if (!exitEntryId) return;
    await logVehicleExit(exitEntryId, {});
    setExitEntryId("");
    loadAll();
  }

  const logColumns = [
    { key: "vehicle_no", header: "Vehicle No" },
    { key: "driver_name", header: "Driver" },
    { key: "gate_pass_no", header: "Gate Pass No" },
    { key: "weight_kg", header: "Weight", render: (r) => (r.weight_kg != null ? `${r.weight_kg.toLocaleString("en-IN")} kg` : "Not weighed yet") },
    { key: "entry_time", header: "Entry", render: (r) => new Date(r.entry_time).toLocaleTimeString() },
    { key: "exit_time", header: "Exit", render: (r) => (r.exit_time ? new Date(r.exit_time).toLocaleTimeString() : "—") },
    { key: "entry_status", header: "Status", render: (r) => <StatusPill status={r.entry_status} label={r.entry_status === "ENTERED" ? "Entered" : "Exited"} /> },
  ];

  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  // "Today's Log" only ever shows today's movements -- entries from other
  // days (e.g. a vehicle that entered yesterday and is still inside, kept
  // in `entries` so it still shows up in the Log Exit dropdown) are left
  // out of this list and its count.
  const todaysEntries = entries.filter((e) => isToday(e.entry_time));

  // Entered vehicles first (latest entry first), then Exited vehicles (latest exit first).
  const sortedLogEntries = [...todaysEntries].sort((a, b) => {
    if (a.entry_status !== b.entry_status) {
      return a.entry_status === "ENTERED" ? -1 : 1;
    }
    if (a.entry_status === "ENTERED") {
      return new Date(b.entry_time) - new Date(a.entry_time);
    }
    return new Date(b.exit_time) - new Date(a.exit_time);
  });

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
            {loadError && (
              <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{loadError}</div>
            )}
            {errors.length > 0 && (
              <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">
                {errors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            )}
            {message && <div className="mb-3 text-[12.5px] text-[#2A6B36] bg-[#E1EEE0] rounded-md px-3 py-2">{message}</div>}
            <form onSubmit={submitEntry} noValidate className="grid grid-cols-2 gap-4">
              <div className="field relative" ref={vehicleFieldRef}>
                <label>Vehicle No</label>
                <input
                  value={entryForm.vehicle_no}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, vehicle_no: e.target.value });
                    setVehicleNoErr("");
                    setVehicleDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => {
                    setVehicleDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleVehicleNoKeyDown}
                  placeholder="e.g. MH14 AB 1234"
                  required
                />
                {vehicleNoErr && (
                  <div className="text-[11.5px] text-brand-red mt-1">{vehicleNoErr}</div>
                )}
                {vehicleDropdownOpen && vehicleMatches.length > 0 && (
                  <div className="absolute top-full left-0 mt-1.5 z-20 bg-white border border-line rounded-card shadow-2xl w-full max-h-[220px] overflow-y-auto">
                    {vehicleMatches.map((v, i) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectVehicle(v.vehicle_no)}
                        onMouseEnter={() => setHighlightedIndex(i)}
                        className={`flex items-center justify-between w-full text-left px-3 py-2 text-[12.5px] border-b border-line last:border-b-0 ${
                          i === highlightedIndex ? "bg-[#F3F6F2]" : "hover:bg-[#F3F6F2]"
                        }`}
                      >
                        <span className="font-semibold">{v.vehicle_no}</span>
                        <span className="text-inksoft text-[11px]">Already visited</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="field">
                <label>Driver Name</label>
                <input
                  value={entryForm.driver_name}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, driver_name: e.target.value });
                    setDriverErr("");
                  }}
                  required
                />
                {driverErr && <div className="text-[11.5px] text-brand-red mt-1">{driverErr}</div>}
              </div>

              <div className="field">
                <label>Weight (kg) <span className="text-inksoft font-normal">optional, if known at entry</span></label>
                <input
                  type="number"
                  value={entryForm.weight_kg}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, weight_kg: e.target.value });
                    setWeightErr("");
                  }}
                  onKeyDown={(e) => {
                    // type="number" would otherwise accept e, E, + and -
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  placeholder="e.g. 8,420"
                />
                {weightErr && <div className="text-[11.5px] text-brand-red mt-1">{weightErr}</div>}
              </div>

              <div className="col-span-2 flex gap-2.5">
                <button type="submit" className="btn btn-primary">Issue Gate Pass &amp; Log Entry</button>
                <button type="button" className="btn btn-outline" onClick={openDraftPreview}>Preview Gate Pass</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "entry" && lastEntry && (
        <div className="card mt-4">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Entry Summary</h3></div>
          <div className="p-4.5">
            <EntrySummaryTable entry={lastEntry} />
            <div className="flex gap-2.5 mt-4">
              <button className="btn btn-outline" onClick={openSavedPreview}>Preview Gate Pass</button>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Gate Pass</button>
            </div>
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
            <span className="text-[12.5px] text-inksoft">{todaysEntries.length} vehicle movements today</span>
            <Spacer />
          </Toolbar>
          <DataTable columns={logColumns} rows={sortedLogEntries} loading={loading} />
        </div>
      )}

      {previewData && (
        <Modal open={previewOpen} title="Gate Pass Preview" onClose={() => setPreviewOpen(false)} maxWidth="480px">
          <EntrySummaryTable entry={previewData} />
          <div className="flex gap-2.5 mt-4">
            <button className="btn btn-primary" onClick={() => window.print()}>Print Gate Pass</button>
            <button className="btn btn-outline" onClick={() => setPreviewOpen(false)}>Close</button>
          </div>
        </Modal>
      )}

      {previewData && (
        <div className="print-only">
          <h2 style={{ margin: "0 0 4px" }}>APMC Gate Pass</h2>
          <p style={{ margin: "0 0 16px", color: "#555" }}>{user?.market_name || "APMC Yard"}</p>
          <EntrySummaryTable entry={previewData} />
        </div>
      )}
    </div>
  );
}
