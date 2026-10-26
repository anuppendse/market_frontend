import { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "../../components/DataTable";
import { useAuth } from "../../context/AuthContext";
import { amountError, gatePassError, hasErrors } from "../../utils/validators";
import { fetchFarmers, fetchCommodities, fetchGateEntries, createBill, fetchBills, fetchMarket } from "../../api/endpoints";

let nextRowId = 1;

// Safe rupee formatting: never crashes if a number is missing from the API.
const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const blockBadNumberKeys = (e) => {
  // type="number" would otherwise accept e, E, + and - (negative values).
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

function emptyLine() {
  return { rowId: nextRowId++, commodity_id: "", quantity: "", rate_per_unit: "" };
}

export default function Billing() {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [gateEntries, setGateEntries] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [error, setError] = useState("");

  const [farmerId, setFarmerId] = useState("");
  const [gatePassNo, setGatePassNo] = useState("");
  const [marketFee, setMarketFee] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  // Preview is shown after "Generate Bill"; nothing is saved until "Print & Save".
  const [previewActive, setPreviewActive] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [printBill, setPrintBill] = useState(null);
  const printPending = useRef(false);

  // Commission % of this shop's market, used for the preview before saving.
  useEffect(() => {
    if (!user?.market_id) return;
    fetchMarket(user.market_id)
      .then((m) => setCommissionPercent(m?.commission_percent != null ? Number(m.commission_percent) : null))
      .catch(() => setCommissionPercent(null));
  }, [user?.market_id]);

  // Opens the browser print dialog once the receipt has been rendered.
  useEffect(() => {
    if (printBill && printPending.current) {
      printPending.current = false;
      const t = setTimeout(() => window.print(), 50);
      return () => clearTimeout(t);
    }
  }, [printBill]);

  function printReceipt(bill) {
    printPending.current = true;
    setPrintBill(bill);
  }

  // Each list loads independently, so one failing call (e.g. gate entries)
  // never blocks the farmer / commodity / recent-bills lists.
  async function loadAll() {
    setLoading(true);
    const [farmersRes, commoditiesRes, gateRes, billsRes] = await Promise.allSettled([
      fetchFarmers(),
      fetchCommodities(),
      fetchGateEntries(),
      fetchBills(),
    ]);
    const problems = [];
    if (farmersRes.status === "fulfilled") setFarmers(farmersRes.value || []);
    else problems.push("Unable to load farmers");
    if (commoditiesRes.status === "fulfilled") setCommodities(commoditiesRes.value || []);
    else problems.push("Unable to load commodities");
    if (gateRes.status === "fulfilled") setGateEntries(gateRes.value || []);
    // gate entries are optional here (only feeds the Gate Pass suggestions)
    if (billsRes.status === "fulfilled") setBills(billsRes.value || []);
    else problems.push("Unable to load recent bills");
    if (problems.length) setError(problems.join(". ") + ".");
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLine(rowId, field, value) {
    setLineErrors((errs) => ({ ...errs, [rowId]: { ...(errs[rowId] || {}), [field]: "" } }));
    setLines((rows) =>
      rows.map((row) => {
        if (row.rowId !== rowId) return row;
        const updated = { ...row, [field]: value };
        // Auto-fill today's rate when a commodity is picked, if the rate
        // field hasn't been touched yet.
        if (field === "commodity_id" && !row.rate_per_unit) {
          const commodity = commodities.find((c) => c.id === Number(value));
          if (commodity?.latest_rate != null) {
            updated.rate_per_unit = String(commodity.latest_rate);
          }
        }
        return updated;
      })
    );
  }

  function addLine() {
    setLines((rows) => [...rows, emptyLine()]);
  }

  function removeLine(rowId) {
    setLines((rows) => (rows.length > 1 ? rows.filter((r) => r.rowId !== rowId) : rows));
  }

  // Sum of quantity x rate over all lines (before market fee).
  const itemsTotal = useMemo(() => {
    return lines.reduce((sum, row) => {
      const qty = Number(row.quantity) || 0;
      const rate = Number(row.rate_per_unit) || 0;
      return sum + qty * rate;
    }, 0);
  }, [lines]);
  // Gross Total shown on the form and in the preview INCLUDES the market fee.
  const feeValue = Number(marketFee) > 0 ? Number(marketFee) : 0;
  const grossTotal = itemsTotal + feeValue;

  // Validates the form; returns the bill payload, or null (errors are shown).
  function buildPayload() {
    setError("");
    const errs = {
      farmer: farmerId ? "" : "Please select a farmer",
      gatePass: gatePassError(gatePassNo),
      marketFee: amountError("Market fee", marketFee), // required, must be greater than 0
    };
    const lineErrs = {};
    const seen = new Set();
    lines.forEach((row) => {
      const e = {
        commodity_id: row.commodity_id ? "" : "Select a commodity",
        quantity: amountError("Quantity", row.quantity),
        rate_per_unit: amountError("Rate", row.rate_per_unit),
      };
      if (row.commodity_id && seen.has(row.commodity_id)) e.commodity_id = "Commodity already added";
      if (row.commodity_id) seen.add(row.commodity_id);
      if (hasErrors(e)) lineErrs[row.rowId] = e;
    });
    setFieldErrors(errs);
    setLineErrors(lineErrs);
    if (hasErrors(errs) || Object.keys(lineErrs).length > 0) {
      setError("Please correct the highlighted fields.");
      return null;
    }

    const line_items = lines
      .filter((row) => row.commodity_id && row.quantity && row.rate_per_unit)
      .map((row) => ({
        commodity_id: Number(row.commodity_id),
        quantity: Number(row.quantity),
        rate_per_unit: Number(row.rate_per_unit),
      }));

    if (line_items.length === 0) {
      setError("Add at least one commodity line with quantity and rate.");
      return null;
    }

    return {
      shop_id: user.shop_id,
      farmer_id: Number(farmerId),
      gate_pass_no: gatePassNo || undefined,
      market_fee: Number(marketFee),
      line_items,
    };
  }

  // "Generate Bill": validate and show the preview only -- nothing is saved.
  function handleSubmit(e) {
    e.preventDefault();
    setPreviewActive(!!buildPayload());
  }

  // "Print & Save": save the bill, show it in Recent Bills straight away,
  // then open the print dialog for the saved receipt.
  async function handlePrintAndSave() {
    if (saving) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      const bill = await createBill(payload);
      setLastReceipt(bill);
      setBills((prev) => [bill, ...prev.filter((b) => b.id !== bill.id)]);
      setPreviewActive(false);
      setFieldErrors({});
      setLineErrors({});
      setFarmerId("");
      setGatePassNo("");
      setMarketFee("");
      setLines([emptyLine()]);
      printReceipt(bill);
      fetchBills().then(setBills).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create bill.");
    } finally {
      setSaving(false);
    }
  }

  // Draft figures for the preview (the server recalculates on save).
  const previewCommissionPct = commissionPercent ?? 0;
  const previewCommission = Math.round(itemsTotal * previewCommissionPct) / 100;
  const previewFee = feeValue;
  const previewNet = itemsTotal - previewCommission - previewFee;
  const previewFarmer = farmers.find((f) => String(f.id) === String(farmerId));

  const columns = [
    { key: "receipt_no", header: "Receipt No" },
    { key: "farmer_name", header: "Farmer" },
    { key: "line_items", header: "Items", render: (r) => { const n = (r.line_items || []).length; return n === 1 ? "1 item" : `${n} items`; } },
    { key: "gross_amount", header: "Gross (incl. fee)", render: (r) => inr(Number(r.gross_amount || 0) + Number(r.market_fee || 0)) },
    { key: "net_payable", header: "Net Payable", render: (r) => inr(r.net_payable) },
    { key: "bill_date", header: "Date" },
  ];

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-4">
      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">New Bill</h3></div>
        <div className="p-4.5">
          {error && <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="field">
                <label>Farmer</label>
                <select value={farmerId} onChange={(e) => { setFarmerId(e.target.value); setFieldErrors((f) => ({ ...f, farmer: "" })); }}>
                  <option value="" disabled>Select farmer</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
                  ))}
                </select>
                {fieldErrors.farmer && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.farmer}</div>}
              </div>
              <div className="field">
                <label>Gate Pass No <span className="text-inksoft font-normal">optional</span></label>
                <input
                  list="gate-pass-options"
                  value={gatePassNo}
                  onChange={(e) => { setGatePassNo(e.target.value); setFieldErrors((f) => ({ ...f, gatePass: "" })); }}
                  maxLength={30}
                  placeholder="e.g. GP-1001"
                />
                {fieldErrors.gatePass && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.gatePass}</div>}
                <datalist id="gate-pass-options">
                  {gateEntries.map((g) => (
                    <option key={g.id} value={g.gate_pass_no}>{g.vehicle_no}</option>
                  ))}
                </datalist>
              </div>
            </div>

            <label className="text-[12px] font-semibold text-ink mb-1.5 block">Commodities</label>
            <div className="border border-line rounded-md overflow-hidden mb-3">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F7F5EF]">
                    <th className="text-left text-[11px] text-inksoft font-bold px-2.5 py-2">Commodity</th>
                    <th className="text-left text-[11px] text-inksoft font-bold px-2.5 py-2">Quantity</th>
                    <th className="text-left text-[11px] text-inksoft font-bold px-2.5 py-2">Rate</th>
                    <th className="text-left text-[11px] text-inksoft font-bold px-2.5 py-2">Gross</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row) => {
                    const commodity = commodities.find((c) => c.id === Number(row.commodity_id));
                    const gross = (Number(row.quantity) || 0) * (Number(row.rate_per_unit) || 0);
                    const le = lineErrors[row.rowId] || {};
                    return (
                      <tr key={row.rowId} className="border-t border-line">
                        <td className="p-2">
                          <select
                            className="w-full border border-line rounded px-2 py-1.5 text-[13px]"
                            value={row.commodity_id}
                            onChange={(e) => updateLine(row.rowId, "commodity_id", e.target.value)}
                          >
                            <option value="" disabled>Select</option>
                            {commodities.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          {le.commodity_id && <div className="text-[11.5px] text-brand-red mt-1">{le.commodity_id}</div>}
                        </td>
                        <td className="p-2">
                          <input
                            type="number" step="0.01"
                            className="w-full border border-line rounded px-2 py-1.5 text-[13px]"
                            value={row.quantity}
                            onChange={(e) => updateLine(row.rowId, "quantity", e.target.value)}
                            onKeyDown={blockBadNumberKeys}
                            min="0.01"
                            placeholder={commodity ? commodity.unit : "qty"}
                          />
                          {le.quantity && <div className="text-[11.5px] text-brand-red mt-1">{le.quantity}</div>}
                        </td>
                        <td className="p-2">
                          <input
                            type="number" step="0.01"
                            className="w-full border border-line rounded px-2 py-1.5 text-[13px]"
                            value={row.rate_per_unit}
                            onChange={(e) => updateLine(row.rowId, "rate_per_unit", e.target.value)}
                            onKeyDown={blockBadNumberKeys}
                            min="0.01"
                          />
                          {le.rate_per_unit && <div className="text-[11.5px] text-brand-red mt-1">{le.rate_per_unit}</div>}
                        </td>
                        <td className="p-2 whitespace-nowrap text-inksoft">{inr(gross)}</td>
                        <td className="p-2">
                          <button type="button" className="btn-danger-text" onClick={() => removeLine(row.rowId)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-outline mb-4" onClick={addLine}>+ Add Commodity Line</button>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="field">
                <label>Market Fee (₹) <span className="text-brand-red">*</span></label>
                <input type="number" step="0.01" min="0.01" placeholder="e.g. 50" value={marketFee} onKeyDown={blockBadNumberKeys} onChange={(e) => { setMarketFee(e.target.value); setFieldErrors((f) => ({ ...f, marketFee: "" })); }} />
                {fieldErrors.marketFee && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.marketFee}</div>}
              </div>
              <div className="field">
                <label>Gross Total (incl. market fee)</label>
                <input value={inr(grossTotal)} disabled />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Generate Bill</button>
          </form>
        </div>
      </div>

      <div className="card h-fit">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">{previewActive ? "Bill Preview" : "Last Receipt"}</h3></div>
        <div className="p-4.5">
          {previewActive && (
            <>
              <table className="w-full text-[13px] mb-3">
                <tbody>
                  <tr><td className="text-inksoft py-1.5">Farmer</td><td className="text-right">{previewFarmer?.name || "—"}</td></tr>
                  {gatePassNo && <tr><td className="text-inksoft py-1.5">Gate Pass</td><td className="text-right">{gatePassNo}</td></tr>}
                </tbody>
              </table>
              <table className="w-full text-[12.5px] mb-3">
                <thead>
                  <tr>
                    <th className="text-left text-inksoft font-semibold pb-1">Commodity</th>
                    <th className="text-right text-inksoft font-semibold pb-1">Qty</th>
                    <th className="text-right text-inksoft font-semibold pb-1">Rate</th>
                    <th className="text-right text-inksoft font-semibold pb-1">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row) => {
                    const c = commodities.find((x) => x.id === Number(row.commodity_id));
                    const g = (Number(row.quantity) || 0) * (Number(row.rate_per_unit) || 0);
                    return (
                      <tr key={row.rowId} className="border-t border-line">
                        <td className="py-1">{c?.name || "—"}</td>
                        <td className="text-right py-1">{row.quantity}</td>
                        <td className="text-right py-1">{inr(row.rate_per_unit)}</td>
                        <td className="text-right py-1">{inr(g)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <table className="w-full text-[13px]">
                <tbody>
                  <tr><td className="text-inksoft py-1">Items Total</td><td className="text-right">{inr(itemsTotal)}</td></tr>
                  <tr><td className="text-inksoft py-1">Market Fee</td><td className="text-right">{inr(previewFee)}</td></tr>
                  <tr className="border-t border-line"><td className="text-inksoft py-1 font-semibold">Gross Total (incl. market fee)</td><td className="text-right font-semibold">{inr(grossTotal)}</td></tr>
                  <tr><td className="text-inksoft py-1">Commission ({previewCommissionPct}%)</td><td className="text-right">{inr(previewCommission)}</td></tr>
                  <tr className="border-t border-line"><td className="text-inksoft py-1 font-semibold">Net Payable</td><td className="text-right font-bold">{inr(previewNet)}</td></tr>
                </tbody>
              </table>
              <button
                type="button"
                className="btn btn-primary mt-4 w-full justify-center"
                onClick={handlePrintAndSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Print & Save"}
              </button>
              <button
                type="button"
                className="btn btn-outline mt-2 w-full justify-center"
                onClick={() => setPreviewActive(false)}
                disabled={saving}
              >
                Cancel Preview
              </button>
            </>
          )}
          {!previewActive && !lastReceipt && <p className="text-inksoft text-[13px]">Generate a bill to preview the receipt here.</p>}
          {!previewActive && lastReceipt && (
            <>
              <table className="w-full text-[13px] mb-3">
                <tbody>
                  <tr><td className="text-inksoft py-1.5">Receipt No</td><td className="text-right font-semibold">{lastReceipt.receipt_no}</td></tr>
                  <tr><td className="text-inksoft py-1.5">Farmer</td><td className="text-right">{lastReceipt.farmer_name}</td></tr>
                  {lastReceipt.gate_pass_no && (
                    <tr><td className="text-inksoft py-1.5">Gate Pass</td><td className="text-right">{lastReceipt.gate_pass_no}</td></tr>
                  )}
                </tbody>
              </table>
              <table className="w-full text-[12.5px] mb-3">
                <thead>
                  <tr>
                    <th className="text-left text-inksoft font-semibold pb-1">Commodity</th>
                    <th className="text-right text-inksoft font-semibold pb-1">Qty</th>
                    <th className="text-right text-inksoft font-semibold pb-1">Rate</th>
                    <th className="text-right text-inksoft font-semibold pb-1">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {(lastReceipt.line_items || []).map((li, i) => (
                    <tr key={li.id ?? i} className="border-t border-line">
                      <td className="py-1">{li.commodity_name}</td>
                      <td className="text-right py-1">{li.quantity}</td>
                      <td className="text-right py-1">{inr(li.rate_per_unit)}</td>
                      <td className="text-right py-1">{inr(li.gross_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-[13px]">
                <tbody>
                  <tr><td className="text-inksoft py-1">Items Total</td><td className="text-right">{inr(lastReceipt.gross_amount)}</td></tr>
                  <tr><td className="text-inksoft py-1">Market Fee</td><td className="text-right">{inr(lastReceipt.market_fee)}</td></tr>
                  <tr className="border-t border-line"><td className="text-inksoft py-1 font-semibold">Gross Total (incl. market fee)</td><td className="text-right font-semibold">{inr(Number(lastReceipt.gross_amount || 0) + Number(lastReceipt.market_fee || 0))}</td></tr>
                  <tr><td className="text-inksoft py-1">Commission ({lastReceipt.commission_percent}%)</td><td className="text-right">{inr(lastReceipt.commission_amount)}</td></tr>
                  <tr className="border-t border-line"><td className="text-inksoft py-1 font-semibold">Net Payable</td><td className="text-right font-bold">{inr(lastReceipt.net_payable)}</td></tr>
                </tbody>
              </table>
              <button type="button" className="btn btn-primary mt-4 w-full justify-center" onClick={() => printReceipt(lastReceipt)}>Print / Download</button>
            </>
          )}
        </div>
      </div>

      <div className="col-span-2">
        <h4 className="text-[12px] font-bold text-inksoft uppercase tracking-wide mb-2.5">Recent Bills</h4>
        <DataTable columns={columns} rows={bills} loading={loading} />
      </div>

      {printBill && (
        <div className="print-only">
          <h2 style={{ margin: "0 0 4px" }}>APMC Billing System</h2>
          <h3 style={{ margin: "0 0 12px" }}>Receipt {printBill.receipt_no}</h3>
          <p style={{ margin: "0 0 4px" }}>Farmer: {printBill.farmer_name}</p>
          {printBill.gate_pass_no && <p style={{ margin: "0 0 4px" }}>Gate Pass: {printBill.gate_pass_no}</p>}
          {printBill.bill_date && <p style={{ margin: "0 0 12px" }}>Date: {printBill.bill_date}</p>}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Commodity", "Qty", "Rate", "Gross"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Commodity" ? "left" : "right", borderBottom: "1px solid #ccc", padding: "6px 8px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(printBill.line_items || []).map((li, i) => (
                <tr key={li.id ?? i}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{li.commodity_name}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" }}>{li.quantity}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" }}>{inr(li.rate_per_unit)}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" }}>{inr(li.gross_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ marginLeft: "auto" }}>
            <tbody>
              <tr><td style={{ padding: "3px 12px" }}>Items Total</td><td style={{ textAlign: "right" }}>{inr(printBill.gross_amount)}</td></tr>
              <tr><td style={{ padding: "3px 12px" }}>Market Fee</td><td style={{ textAlign: "right" }}>{inr(printBill.market_fee)}</td></tr>
              <tr><td style={{ padding: "3px 12px", fontWeight: 600 }}>Gross Total (incl. market fee)</td><td style={{ textAlign: "right", fontWeight: 600 }}>{inr(Number(printBill.gross_amount || 0) + Number(printBill.market_fee || 0))}</td></tr>
              <tr><td style={{ padding: "3px 12px" }}>Commission ({printBill.commission_percent}%)</td><td style={{ textAlign: "right" }}>{inr(printBill.commission_amount)}</td></tr>
              <tr><td style={{ padding: "3px 12px", fontWeight: 700 }}>Net Payable</td><td style={{ textAlign: "right", fontWeight: 700 }}>{inr(printBill.net_payable)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
