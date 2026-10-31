import { useEffect, useRef, useState } from "react";
import DataTable from "../../components/DataTable";
import StatusPill from "../../components/StatusPill";
import Modal from "../../components/Modal";
import { Toolbar, Spacer } from "../../components/Toolbar";
import { fetchGateEntries, fetchVehicles, fetchShops, logVehicleEntry, logVehicleExit } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { normalizeVehicleNo, vehicleNoError as getVehicleNoError } from "../../utils/vehicleNo";
import { cleanName, driverNameError as getDriverNameError, weightError as getWeightError } from "../../utils/validators";

// Turns a failed API call into a message that says WHAT failed and with which
// HTTP status, so a server problem (500) is easy to tell apart from a form problem.
function describeError(err, fallback) {
  const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
  if (serverMsg) return serverMsg;
  const status = err?.response?.status;
  if (status) return `${fallback} (server error ${status})`;
  return `${fallback} (cannot reach the server)`;
}

function shopsText(entry) {
  const list = Array.isArray(entry?.shops) ? entry.shops : [];
  return list.length ? list.join(", ") : "—";
}

function EntrySummaryTable({ entry }) {
  return (
    <table className="w-full text-[13px]">
      <tbody>
        <tr><td className="text-inksoft py-1.5">Gate Pass No</td><td className="text-right font-semibold">{entry.gate_pass_no || "To be issued on save"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Vehicle No</td><td className="text-right">{entry.vehicle_no || "—"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Driver Name</td><td className="text-right">{entry.driver_name || "—"}</td></tr>
        <tr><td className="text-inksoft py-1.5">Shop(s)</td><td className="text-right">{shopsText(entry)}</td></tr>
        <tr><td className="text-inksoft py-1.5">Estimated Weight</td><td className="text-right">{entry.weight_kg != null ? `${Number(entry.weight_kg).toLocaleString("en-IN")} kg` : "Not weighed yet"}</td></tr>
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

const EMPTY_ENTRY = { vehicle_no: "", driver_name: "", weight_kg: "", shop_ids: [] };

export default function GateOperations() {
  const { user } = useAuth();
  const [tab, setTab] = useState("entry");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [vehicleNoErr, setVehicleNoErr] = useState("");
  const [driverErr, setDriverErr] = useState("");
  const [weightErr, setWeightErr] = useState("");
  const [shopErr, setShopErr] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [shops, setShops] = useState([]);
  const [shopSearch, setShopSearch] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const vehicleFieldRef = useRef(null);

  const [exitEntryId, setExitEntryId] = useState("");
  const [exitErr, setExitErr] = useState("");
  const [exitSearch, setExitSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const printPending = useRef(false);

  const [loadErrors, setLoadErrors] = useState([]);

  // Each call is independent: if one fails, the others still load, and the
  // message names exactly which one failed and with what status.
  async function loadAll() {
    setLoading(true);
    const [entriesRes, vehiclesRes, shopsRes] = await Promise.allSettled([
      fetchGateEntries(),
      fetchVehicles({ market_id: user?.market_id }),
      fetchShops({ market_id: user?.market_id }),
    ]);
    const problems = [];
    if (entriesRes.status === "fulfilled") setEntries(entriesRes.value || []);
    else {
      console.error("fetchGateEntries failed:", entriesRes.reason);
      problems.push(`Failed to load: gate entries (${entriesRes.reason?.response?.status || entriesRes.reason?.message || "unknown error"}). Try refreshing the page.`);
    }
    if (vehiclesRes.status === "fulfilled") setVehicles(vehiclesRes.value || []);
    else {
      console.error("fetchVehicles failed:", vehiclesRes.reason);
      problems.push(`Failed to load: vehicle list (${vehiclesRes.reason?.response?.status || vehiclesRes.reason?.message || "unknown error"}). Vehicle suggestions are unavailable.`);
    }
    if (shopsRes.status === "fulfilled") setShops((shopsRes.value || []).filter((s) => s.status !== "INACTIVE"));
    else {
      console.error("fetchShops failed:", shopsRes.reason);
      problems.push(`Failed to load: shops (${shopsRes.reason?.response?.status || shopsRes.reason?.message || "unknown error"}). You cannot select shops until this loads.`);
    }
    setLoadErrors(problems);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Opens the browser print dialog once the gate pass has been rendered.
  useEffect(() => {
    if (previewData && printPending.current) {
      printPending.current = false;
      const t = setTimeout(() => window.print(), 80);
      return () => clearTimeout(t);
    }
  }, [previewData]);

  function printGatePass(entry) {
    printPending.current = true;
    // Always a new object so the effect above fires even for the same entry.
    setPreviewData({ ...entry });
  }

  const openEntries = entries.filter((e) => e.entry_status === "ENTERED");
  // Exit search: matches vehicle number (spaces/dashes ignored), gate pass number or driver name.
  const exitTerm = exitSearch.trim().toLowerCase();
  const exitTermVehicle = normalizeVehicleNo(exitSearch).toLowerCase();
  const exitMatches = openEntries.filter(
    (e) =>
      !exitTerm ||
      (exitTermVehicle && normalizeVehicleNo(e.vehicle_no).toLowerCase().includes(exitTermVehicle)) ||
      (e.gate_pass_no || "").toLowerCase().includes(exitTerm) ||
      (e.driver_name || "").toLowerCase().includes(exitTerm)
  );

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

  function toggleShop(id) {
    setEntryForm((f) => ({
      ...f,
      shop_ids: f.shop_ids.includes(id) ? f.shop_ids.filter((x) => x !== id) : [...f.shop_ids, id],
    }));
    setShopErr("");
  }

  // Validates every entry field, shows each error next to its field, and
  // returns true only when the whole form is valid.
  function validateForm() {
    const vErr = getVehicleNoError(entryForm.vehicle_no);
    const dErr = getDriverNameError(entryForm.driver_name);
    const wErr = getWeightError(entryForm.weight_kg);
    const sErr = entryForm.shop_ids.length === 0 ? "Please select at least one shop" : "";
    setVehicleNoErr(vErr);
    setDriverErr(dErr);
    setWeightErr(wErr);
    setShopErr(sErr);
    return !vErr && !dErr && !wErr && !sErr;
  }

  function selectedShopNames() {
    return shops.filter((s) => entryForm.shop_ids.includes(s.id)).map((s) => s.name);
  }

  function buildDraftPreview() {
    return {
      isDraft: true,
      gate_pass_no: null,
      vehicle_no: normalizeVehicleNo(entryForm.vehicle_no),
      driver_name: cleanName(entryForm.driver_name),
      shops: selectedShopNames(),
      weight_kg: entryForm.weight_kg ? Number(entryForm.weight_kg) : null,
      entry_time: new Date().toISOString(),
    };
  }

  // Step 1: "Preview Gate Pass" -- shows what will be issued, nothing is saved yet.
  function openDraftPreview() {
    if (!validateForm()) return;
    setErrors([]);
    setMessage("");
    setVehicleDropdownOpen(false);
    setPreviewData(buildDraftPreview());
    setPreviewOpen(true);
  }

  function openSavedPreview() {
    setPreviewData(lastEntry);
    setPreviewOpen(true);
  }

  // Step 2: issue the gate pass and log the entry (from the form button or from
  // the preview window). On success the issued gate pass opens, ready to print.
  async function issueEntry() {
    if (saving) return;
    setMessage("");
    setVehicleDropdownOpen(false);
    if (!validateForm()) {
      setPreviewOpen(false);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const names = selectedShopNames();
      const created = await logVehicleEntry({
        market_id: user.market_id,
        vehicle_no: normalizeVehicleNo(entryForm.vehicle_no),
        driver_name: cleanName(entryForm.driver_name),
        weight_kg: entryForm.weight_kg ? Number(entryForm.weight_kg) : null,
        shop_ids: entryForm.shop_ids,
      });
      const issued = {
        ...created,
        // If the server does not echo the shops back, keep the ones that were selected.
        shops: Array.isArray(created.shops) && created.shops.length ? created.shops : names,
        isDraft: false,
      };
      setMessage(`Gate pass ${issued.gate_pass_no} issued and entry logged.`);
      setLastEntry(issued);
      setPreviewData(issued);
      setPreviewOpen(true);
      setEntryForm(EMPTY_ENTRY);
      setShopSearch("");
      setVehicleNoErr("");
      setDriverErr("");
      setWeightErr("");
      setShopErr("");
      // Refetches the vehicle master list too, so a newly-registered vehicle
      // number is immediately searchable without a page refresh.
      loadAll();
    } catch (err) {
      // The backend is the source of truth (e.g. the vehicle already has an
      // open entry inside the yard); whatever it reports is shown here.
      setPreviewOpen(false);
      setErrors([describeError(err, "Could not log entry. Please try again")]);
    } finally {
      setSaving(false);
    }
  }

  function submitEntry(e) {
    e.preventDefault();
    issueEntry();
  }

  async function submitExit(e) {
    e.preventDefault();
    setMessage("");
    setErrors([]);
    if (!exitEntryId) {
      setExitErr("Please select a vehicle / gate pass to exit");
      return;
    }
    setExitErr("");
    try {
      await logVehicleExit(exitEntryId, {});
      setExitEntryId("");
      setExitSearch("");
      setMessage("Vehicle exit logged.");
      loadAll();
    } catch (err) {
      setErrors([describeError(err, "Could not log exit. Please try again")]);
    }
  }

  const logColumns = [
    { key: "vehicle_no", header: "Vehicle No" },
    { key: "driver_name", header: "Driver" },
    { key: "gate_pass_no", header: "Gate Pass No" },
    { key: "shops", header: "Shop(s)", render: (r) => shopsText(r) },
    { key: "weight_kg", header: "Weight", render: (r) => (r.weight_kg != null ? `${Number(r.weight_kg).toLocaleString("en-IN")} kg` : "Not weighed yet") },
    { key: "entry_time", header: "Entry Time", render: (r) => (r.entry_time ? new Date(r.entry_time).toLocaleTimeString() : "—") },
    { key: "exit_time", header: "Exit Time", render: (r) => (r.exit_time ? new Date(r.exit_time).toLocaleTimeString() : "—") },
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

  // "Today's Log": everything that happened today, plus any vehicle that is
  // still inside from an earlier day (it has not left yet, so it belongs on top).
  const todaysEntries = entries.filter(
    (e) => e.entry_status === "ENTERED" || isToday(e.entry_time) || isToday(e.exit_time)
  );

  // Entered vehicles first (latest entry first), then Exited vehicles (latest exit first).
  const sortedLogEntries = [...todaysEntries].sort((a, b) => {
    if (a.entry_status !== b.entry_status) {
      return a.entry_status === "ENTERED" ? -1 : 1;
    }
    if (a.entry_status === "ENTERED") {
      return new Date(b.entry_time) - new Date(a.entry_time);
    }
    return new Date(b.exit_time || b.entry_time) - new Date(a.exit_time || a.entry_time);
  });

  return (
    <div>
      <div className="flex gap-1.5 mb-4 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMessage(""); setErrors([]); }}
            className={`bg-transparent font-semibold text-[13px] px-1 py-2.5 mr-4.5 border-b-2 ${
              tab === t.id ? "text-green-800 border-amber-600" : "text-inksoft border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadErrors.length > 0 && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">
          {loadErrors.map((m, i) => <div key={i}>{m}</div>)}
          <button type="button" className="btn-text mt-1" onClick={loadAll}>Retry</button>
        </div>
      )}
      {errors.length > 0 && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">
          {errors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}
      {message && <div className="mb-3 text-[12.5px] text-[#2A6B36] bg-[#E1EEE0] rounded-md px-3 py-2">{message}</div>}

      {tab === "entry" && (
        <div className="card">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Register Vehicle &amp; Log Entry</h3></div>
          <div className="p-4.5">
            <form onSubmit={submitEntry} noValidate className="grid grid-cols-2 gap-4">
              <div className="field relative" ref={vehicleFieldRef}>
                <label>Vehicle No <span className="text-brand-red">*</span></label>
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
                  maxLength={16}
                  autoComplete="off"
                  placeholder="e.g. MH14 AB 1234"
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
                <label>Driver Name <span className="text-brand-red">*</span></label>
                <input
                  value={entryForm.driver_name}
                  maxLength={60}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, driver_name: e.target.value });
                    setDriverErr("");
                  }}
                />
                {driverErr && <div className="text-[11.5px] text-brand-red mt-1">{driverErr}</div>}
              </div>

              <div className="field col-span-2">
                <label>Shop(s) <span className="text-brand-red">*</span> <span className="text-inksoft font-normal">select at least one</span></label>
                <input
                  value={shopSearch}
                  autoComplete="off"
                  placeholder="Type shop name to search"
                  disabled={shops.length === 0}
                  className="mb-2"
                  onChange={(e) => setShopSearch(e.target.value)}
                />
                <div className={`border rounded-md max-h-[170px] overflow-y-auto p-2 grid grid-cols-2 gap-x-4 gap-y-1 ${shopErr ? "border-brand-red" : "border-line"}`}>
                  {shops.length === 0 && (
                    <div className="col-span-2 text-[12.5px] text-inksoft px-1 py-1">
                      {loading ? "Loading shops..." : "No active shops available in this market."}
                    </div>
                  )}
                  {shops
                    .filter((s) => !shopSearch.trim() || (s.name || "").toLowerCase().includes(shopSearch.trim().toLowerCase()))
                    .map((s) => (
                      <label key={s.id} className="items-center gap-2 text-[12.5px] cursor-pointer py-0.5" style={{ display: "flex", fontWeight: 400, marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          style={{ width: "auto", padding: 0 }}
                          checked={entryForm.shop_ids.includes(s.id)}
                          onChange={() => toggleShop(s.id)}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  {shops.length > 0 && shopSearch.trim() && !shops.some((s) => (s.name || "").toLowerCase().includes(shopSearch.trim().toLowerCase())) && (
                    <div className="col-span-2 text-[12.5px] text-inksoft px-1 py-1">No matching shop found</div>
                  )}
                </div>
                {entryForm.shop_ids.length > 0 && (
                  <div className="text-[11.5px] text-inksoft mt-1">{entryForm.shop_ids.length} shop(s) selected</div>
                )}
                {shopErr && <div className="text-[11.5px] text-brand-red mt-1">{shopErr}</div>}
              </div>

              <div className="field">
                <label>Weight (kg) <span className="text-inksoft font-normal">optional, if known at entry</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.weight_kg}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, weight_kg: e.target.value });
                    setWeightErr("");
                  }}
                  onKeyDown={(e) => {
                    // type="number" would otherwise accept e, E, + and -
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  placeholder="e.g. 8420"
                />
                {weightErr && <div className="text-[11.5px] text-brand-red mt-1">{weightErr}</div>}
              </div>

              <div className="col-span-2 flex gap-2.5">
                <button type="button" className="btn btn-outline" onClick={openDraftPreview}>Preview Gate Pass</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Issuing..." : "Issue Gate Pass & Log Entry"}
                </button>
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
              <button className="btn btn-primary" onClick={() => printGatePass(lastEntry)}>Print Gate Pass</button>
            </div>
          </div>
        </div>
      )}

      {tab === "exit" && (
        <div className="card">
          <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Log Vehicle Exit</h3></div>
          <div className="p-4.5">
            <form onSubmit={submitExit} noValidate className="grid grid-cols-2 gap-4">
              <div className="field col-span-2">
                <label>Vehicle / Gate Pass <span className="text-brand-red">*</span></label>
                <input
                  value={exitSearch}
                  onChange={(e) => setExitSearch(e.target.value)}
                  placeholder="Search by vehicle no, gate pass no or driver name"
                  autoComplete="off"
                />
                <div className="border border-line rounded-md mt-2 max-h-[240px] overflow-y-auto">
                  {exitMatches.length === 0 && (
                    <div className="px-3 py-2 text-[12.5px] text-inksoft">
                      {openEntries.length === 0 ? "No vehicles are currently inside." : "No matching vehicle found."}
                    </div>
                  )}
                  {exitMatches.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { setExitEntryId(String(e.id)); setExitErr(""); }}
                      className={`flex items-center justify-between w-full text-left px-3 py-2 text-[12.5px] border-b border-line last:border-b-0 ${
                        String(exitEntryId) === String(e.id) ? "bg-[#E1EEE0] font-semibold" : "hover:bg-[#F3F6F2]"
                      }`}
                    >
                      <span>{e.vehicle_no} <span className="text-inksoft font-normal">· {e.gate_pass_no}{e.driver_name ? ` · ${e.driver_name}` : ""}</span></span>
                      <span className="text-inksoft text-[11px]">Entered {new Date(e.entry_time).toLocaleTimeString()}</span>
                    </button>
                  ))}
                </div>
                {exitErr && <div className="text-[11.5px] text-brand-red mt-1">{exitErr}</div>}
                {openEntries.length === 0 && !loading && (
                  <div className="text-[11.5px] text-inksoft mt-1">No vehicles are currently inside.</div>
                )}
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
            <span className="text-[12.5px] text-inksoft">
              {openEntries.length} inside · {todaysEntries.length - openEntries.length} exited
            </span>
            <Spacer />
          </Toolbar>
          <DataTable columns={logColumns} rows={sortedLogEntries} loading={loading} emptyText="No vehicle movements today." />
        </div>
      )}

      {previewData && (
        <Modal open={previewOpen} title="Gate Pass Preview" onClose={() => setPreviewOpen(false)} maxWidth="480px">
          <EntrySummaryTable entry={previewData} />
          {previewData.isDraft && (
            <p className="text-[12px] text-inksoft mt-3">This is a preview. The gate pass number is generated when you issue it.</p>
          )}
          <div className="flex gap-2.5 mt-4">
            {previewData.isDraft ? (
              <button className="btn btn-primary" onClick={issueEntry} disabled={saving}>
                {saving ? "Issuing..." : "Issue Gate Pass & Log Entry"}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => printGatePass(previewData)}>Print Gate Pass</button>
            )}
            <button className="btn btn-outline" onClick={() => setPreviewOpen(false)}>Close</button>
          </div>
        </Modal>
      )}

      {previewData && !previewData.isDraft && (
        <div className="print-only">
          <h2 style={{ margin: "0 0 4px" }}>APMC Gate Pass</h2>
          <p style={{ margin: "0 0 16px", color: "#555" }}>{user?.market_name || "APMC Yard"}</p>
          <EntrySummaryTable entry={previewData} />
        </div>
      )}
    </div>
  );
}
