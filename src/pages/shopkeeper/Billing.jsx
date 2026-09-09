import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import { useAuth } from "../../context/AuthContext";
import { fetchFarmers, fetchCommodities, fetchGateEntries, createBill, fetchBills } from "../../api/endpoints";

let nextRowId = 1;

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
  const [marketFee, setMarketFee] = useState("0");
  const [lines, setLines] = useState([emptyLine()]);

  async function loadAll() {
    setLoading(true);
    const [farmersData, commoditiesData, gateEntriesData, billsData] = await Promise.all([
      fetchFarmers(),
      fetchCommodities(),
      fetchGateEntries(),
      fetchBills(),
    ]);
    setFarmers(farmersData);
    setCommodities(commoditiesData);
    setGateEntries(gateEntriesData);
    setBills(billsData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function updateLine(rowId, field, value) {
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

  const grossTotal = useMemo(() => {
    return lines.reduce((sum, row) => {
      const qty = Number(row.quantity) || 0;
      const rate = Number(row.rate_per_unit) || 0;
      return sum + qty * rate;
    }, 0);
  }, [lines]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const line_items = lines
      .filter((row) => row.commodity_id && row.quantity && row.rate_per_unit)
      .map((row) => ({
        commodity_id: Number(row.commodity_id),
        quantity: Number(row.quantity),
        rate_per_unit: Number(row.rate_per_unit),
      }));

    if (line_items.length === 0) {
      setError("Add at least one commodity line with quantity and rate.");
      return;
    }
    if (!farmerId) {
      setError("Select a farmer.");
      return;
    }

    try {
      const bill = await createBill({
        shop_id: user.shop_id,
        farmer_id: Number(farmerId),
        gate_pass_no: gatePassNo || undefined,
        market_fee: marketFee ? Number(marketFee) : 0,
        line_items,
      });
      setLastReceipt(bill);
      setFarmerId("");
      setGatePassNo("");
      setMarketFee("0");
      setLines([emptyLine()]);
      loadAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create bill.");
    }
  }

  const columns = [
    { key: "receipt_no", header: "Receipt No" },
    { key: "farmer_name", header: "Farmer" },
    { key: "line_items", header: "Items", render: (r) => `${r.line_items.length} commodity${r.line_items.length > 1 ? "ies" : ""}` },
    { key: "gross_amount", header: "Gross", render: (r) => `₹${r.gross_amount.toLocaleString("en-IN")}` },
    { key: "net_payable", header: "Net Payable", render: (r) => `₹${r.net_payable.toLocaleString("en-IN")}` },
    { key: "bill_date", header: "Date" },
  ];

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-4">
      <div className="card">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">New Bill</h3></div>
        <div className="p-4.5">
          {error && <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="field">
                <label>Farmer</label>
                <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} required>
                  <option value="" disabled>Select farmer</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Gate Pass No <span className="text-inksoft font-normal">optional</span></label>
                <input
                  list="gate-pass-options"
                  value={gatePassNo}
                  onChange={(e) => setGatePassNo(e.target.value)}
                  placeholder="e.g. GP-1001"
                />
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
                    return (
                      <tr key={row.rowId} className="border-t border-line">
                        <td className="p-2">
                          <select
                            className="w-full border border-line rounded px-2 py-1.5 text-[13px]"
                            value={row.commodity_id}
                            onChange={(e) => updateLine(row.rowId, "commodity_id", e.target.value)}
                            required
                          >
                            <option value="" disabled>Select</option>
                            {commodities.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number" step="0.01"
                            className="w-full border border-line rounded px-2 py-1.5 text-[13px]"
                            value={row.quantity}
                            onChange={(e) => updateLine(row.rowId, "quantity", e.target.value)}
                            placeholder={commodity ? commodity.unit : "qty"}
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number" step="0.01"
                            className="w-full border border-line rounded px-2 py-1.5 text-[13px]"
                            value={row.rate_per_unit}
                            onChange={(e) => updateLine(row.rowId, "rate_per_unit", e.target.value)}
                            required
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap text-inksoft">₹{gross.toLocaleString("en-IN")}</td>
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
                <label>Market Fee</label>
                <input type="number" step="0.01" value={marketFee} onChange={(e) => setMarketFee(e.target.value)} />
              </div>
              <div className="field">
                <label>Gross Total (preview)</label>
                <input value={`₹${grossTotal.toLocaleString("en-IN")}`} disabled />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Generate Bill</button>
          </form>
        </div>
      </div>

      <div className="card h-fit">
        <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Last Receipt</h3></div>
        <div className="p-4.5">
          {!lastReceipt && <p className="text-inksoft text-[13px]">Generate a bill to preview the receipt here.</p>}
          {lastReceipt && (
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
                  {lastReceipt.line_items.map((li) => (
                    <tr key={li.id} className="border-t border-line">
                      <td className="py-1">{li.commodity_name}</td>
                      <td className="text-right py-1">{li.quantity}</td>
                      <td className="text-right py-1">₹{li.rate_per_unit}</td>
                      <td className="text-right py-1">₹{li.gross_amount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-[13px]">
                <tbody>
                  <tr><td className="text-inksoft py-1">Gross Amount</td><td className="text-right">₹{lastReceipt.gross_amount.toLocaleString("en-IN")}</td></tr>
                  <tr><td className="text-inksoft py-1">Commission ({lastReceipt.commission_percent}%)</td><td className="text-right">₹{lastReceipt.commission_amount.toLocaleString("en-IN")}</td></tr>
                  <tr><td className="text-inksoft py-1">Market Fee</td><td className="text-right">₹{lastReceipt.market_fee.toLocaleString("en-IN")}</td></tr>
                  <tr><td className="text-inksoft py-1 font-semibold">Net Payable</td><td className="text-right font-bold">₹{lastReceipt.net_payable.toLocaleString("en-IN")}</td></tr>
                </tbody>
              </table>
              <button className="btn btn-primary mt-4 w-full justify-center">Print / Download</button>
            </>
          )}
        </div>
      </div>

      <div className="col-span-2">
        <h4 className="text-[12px] font-bold text-inksoft uppercase tracking-wide mb-2.5">Recent Bills</h4>
        <DataTable columns={columns} rows={bills} loading={loading} />
      </div>
    </div>
  );
}
