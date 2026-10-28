import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusToggle from "../../components/StatusToggle";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { activeSearchTerm } from "../../utils/search";
import {
  cleanName,
  businessNameError,
  marketCodeError,
  addressError,
  pincodeError,
  commissionError,
  marketFeeError,
  hasErrors,
} from "../../utils/validators";
import {
  fetchMarkets,
  createMarket,
  updateMarket,
  setMarketStatus,
  fetchStates,
  fetchDistricts,
  checkPincode,
} from "../../api/endpoints";

const EMPTY_FORM = {
  name: "",
  code: "",
  address: "",
  state: "",
  state_id: "",
  district: "",
  district_id: "",
  pincode: "",
  market_fee: "",
  commission_percent: "", // compulsory: the user must enter it (0 is allowed, blank is not)
};

export default function Markets() {
  const [markets, setMarkets] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [showStates, setShowStates] = useState(false);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [showDistricts, setShowDistricts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetchMarkets();
      setMarkets(Array.isArray(res) ? res : []);
    } catch (err) {
      setLoadError(err?.response?.data?.error || "Could not load markets. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // State type-ahead: typing shows matching states (sorted by name) from the states table.
  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetchStates(form.state.trim())
        .then((r) => !cancelled && setStateOptions(Array.isArray(r) ? r : []))
        .catch(() => !cancelled && setStateOptions([]));
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.state, modalOpen]);

  // District type-ahead: only districts of the chosen state, matching what is typed.
  useEffect(() => {
    if (!modalOpen || !form.state_id) {
      setDistrictOptions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      fetchDistricts(form.state_id, form.district.trim())
        .then((r) => !cancelled && setDistrictOptions(Array.isArray(r) ? r : []))
        .catch(() => !cancelled && setDistrictOptions([]));
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.district, form.state_id, modalOpen]);

  // Searching starts only after 3 characters; with 1-2 characters the full list stays.
  const term = activeSearchTerm(search).toLowerCase();
  const filtered = useMemo(() => {
    return markets.filter((m) => {
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      const matchesSearch =
        !term ||
        (m.name || "").toLowerCase().includes(term) ||
        (m.district || "").toLowerCase().includes(term) ||
        (m.state || "").toLowerCase().includes(term) ||
        (m.code || "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [markets, statusFilter, term]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(m) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      code: m.code,
      address: m.address || "",
      state: m.state || "",
      state_id: m.state_id || "",
      district: m.district || "",
      district_id: m.district_id || "",
      pincode: m.pincode || "",
      market_fee: m.market_fee != null ? String(m.market_fee) : "",
      commission_percent: m.commission_percent != null ? String(m.commission_percent) : "",
    });
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    const errs = {
      name: businessNameError("Market name", form.name),
      code: editingId ? "" : marketCodeError(form.code),
      address: addressError(form.address),
      state: form.state_id ? "" : "Select a state from the list",
      district: !form.state_id ? "" : form.district_id ? "" : "Select a district from the list",
      pincode: pincodeError(form.pincode),
      commission_percent: commissionError(form.commission_percent),
      market_fee: marketFeeError(form.market_fee),
    };
    // The pincode must exist in the pincodes table for the chosen state + district.
    if (!errs.state && !errs.district && !errs.pincode && form.state_id && form.district_id) {
      try {
        const res = await checkPincode(form.state_id, form.district_id, form.pincode.trim());
        if (!res.valid) errs.pincode = res.error || "Pincode is wrong";
      } catch {
        errs.pincode = "Could not verify the pincode. Please try again.";
      }
    }
    setFieldErrors(errs);
    if (hasErrors(errs)) return;

    // Status is NOT part of this form: it is changed only from the toggle in the
    // Market Management table. New markets start as ACTIVE; edits never send status.
    const payload = {
      ...form,
      name: cleanName(form.name),
      code: form.code.trim(),
      address: cleanName(form.address),
      state: cleanName(form.state),
      state_id: Number(form.state_id),
      district: cleanName(form.district),
      district_id: Number(form.district_id),
      pincode: form.pincode.trim(),
      market_fee: Number(form.market_fee),
      commission_percent: Number(form.commission_percent),
    };
    if (!editingId) payload.status = "ACTIVE";
    try {
      if (editingId) {
        await updateMarket(editingId, payload);
      } else {
        await createMarket(payload);
      }
      setModalOpen(false);
      loadAll();
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save market.");
    }
  }

  async function toggleStatus(m) {
    try {
      await setMarketStatus(m.id, m.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not change market status.");
    }
  }

  const totalShops = markets.reduce((sum, m) => sum + (m.shop_count || 0), 0);
  const totalUsers = markets.reduce((sum, m) => sum + (m.user_count || 0), 0);
  const activeMarkets = markets.filter((m) => m.status === "ACTIVE").length;

  const columns = [
    { key: "name", header: "Market Name" },
    { key: "code", header: "Code" },
    { key: "district", header: "District / State", render: (r) => [r.district, r.state].filter(Boolean).join(", ") || "—" },
    { key: "market_admin_name", header: "Market Admin", render: (r) => r.market_admin_name || <span className="text-inksoft">Unassigned</span> },
    { key: "shop_count", header: "Shops" },
    { key: "user_count", header: "Users" },
    { key: "market_fee", header: "Market Fees", render: (r) => (r.market_fee != null ? `₹${r.market_fee}` : "—") },
    { key: "commission_percent", header: "Commission", render: (r) => (r.commission_percent != null ? `${r.commission_percent}%` : "—") },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusToggle status={r.status} onClick={() => toggleStatus(r)} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-3.5 mb-4.5">
        <div className="card p-4">
          <div className="text-[12px] text-inksoft mb-1.5">Total Markets</div>
          <div className="text-[22px] font-bold text-green-900">{markets.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[12px] text-inksoft mb-1.5">Active Markets</div>
          <div className="text-[22px] font-bold text-green-900">{activeMarkets}</div>
        </div>
        <div className="card p-4">
          <div className="text-[12px] text-inksoft mb-1.5">Total Shops (all markets)</div>
          <div className="text-[22px] font-bold text-amber-600">{totalShops}</div>
        </div>
        <div className="card p-4">
          <div className="text-[12px] text-inksoft mb-1.5">Total Users (all markets)</div>
          <div className="text-[22px] font-bold text-green-900">{totalUsers}</div>
        </div>
      </div>

      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search markets... (min 3 characters)" />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "Status: All" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
        <Spacer />
        <button className="btn btn-primary" onClick={openAdd}>+ Add Market</button>
      </Toolbar>

      {loadError && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{loadError}</div>
      )}
      <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No markets yet — add your first APMC yard." />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Market" : "Add Market"}
        onClose={() => setModalOpen(false)}
        maxWidth="560px"
      >
        <form onSubmit={handleSave} noValidate className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{saveError}</div>
          )}
          <div className="field col-span-2">
            <label>Market Name</label>
            <input value={form.name} maxLength={100} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((f) => ({ ...f, name: "" })); }} placeholder="e.g. Pune APMC Yard" />
            {fieldErrors.name && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.name}</div>}
          </div>
          <div className="field">
            <label>Market Code</label>
            <input
              value={form.code}
              onChange={(e) => { setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") }); setFieldErrors((f) => ({ ...f, code: "" })); }}
              disabled={!!editingId}
              maxLength={20}
              placeholder="e.g. PUNE-APMC"
            />
            {fieldErrors.code && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.code}</div>}
          </div>
          <div className="field col-span-2">
            <label>Address</label>
            <input value={form.address} maxLength={200} onChange={(e) => { setForm({ ...form, address: e.target.value }); setFieldErrors((f) => ({ ...f, address: "" })); }} />
            {fieldErrors.address && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.address}</div>}
          </div>
          <div className="field relative">
            <label>State</label>
            <input
              value={form.state}
              maxLength={50}
              autoComplete="off"
              placeholder="Type to search state"
              onFocus={() => setShowStates(true)}
              onBlur={() => setTimeout(() => setShowStates(false), 150)}
              onChange={(e) => { setForm({ ...form, state: e.target.value, state_id: "", district: "", district_id: "" }); setShowStates(true); setFieldErrors((f) => ({ ...f, state: "", district: "", pincode: "" })); }}
            />
            {showStates && !form.state_id && form.state.trim() && stateOptions.length === 0 && (
              <div className="text-[11.5px] text-inksoft mt-1">No matching state</div>
            )}
            {showStates && !form.state_id && stateOptions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 max-h-48 overflow-auto bg-white border border-line rounded-md shadow-lg text-[13px]">
                {stateOptions.map((s) => (
                  <li
                    key={s.state_id}
                    className="px-3 py-1.5 cursor-pointer hover:bg-green-50"
                    onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, state: s.state_name, state_id: s.state_id, district: "", district_id: "" }); setShowStates(false); setFieldErrors((f) => ({ ...f, state: "", district: "", pincode: "" })); }}
                  >
                    {s.state_name}
                  </li>
                ))}
              </ul>
            )}
            {fieldErrors.state && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.state}</div>}
          </div>
          <div className="field relative">
            <label>District</label>
            <input
              value={form.district}
              maxLength={100}
              autoComplete="off"
              disabled={!form.state_id}
              placeholder={form.state_id ? "Type to search district" : "Select a state first"}
              onFocus={() => setShowDistricts(true)}
              onBlur={() => setTimeout(() => setShowDistricts(false), 150)}
              onChange={(e) => { setForm({ ...form, district: e.target.value, district_id: "" }); setShowDistricts(true); setFieldErrors((f) => ({ ...f, district: "", pincode: "" })); }}
            />
            {showDistricts && form.state_id && !form.district_id && form.district.trim() && districtOptions.length === 0 && (
              <div className="text-[11.5px] text-inksoft mt-1">No matching district in this state</div>
            )}
            {showDistricts && form.state_id && !form.district_id && districtOptions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 max-h-48 overflow-auto bg-white border border-line rounded-md shadow-lg text-[13px]">
                {districtOptions.map((d) => (
                  <li
                    key={d.district_id}
                    className="px-3 py-1.5 cursor-pointer hover:bg-green-50"
                    onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, district: d.district_name, district_id: d.district_id }); setShowDistricts(false); setFieldErrors((f) => ({ ...f, district: "", pincode: "" })); }}
                  >
                    {d.district_name}
                  </li>
                ))}
              </ul>
            )}
            {fieldErrors.district && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.district}</div>}
          </div>
          <div className="field">
            <label>Pincode</label>
            <input value={form.pincode} inputMode="numeric" maxLength={6} placeholder="6-digit pincode" onChange={(e) => { setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") }); setFieldErrors((f) => ({ ...f, pincode: "" })); }} />
            {fieldErrors.pincode && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.pincode}</div>}
          </div>
          <div className="field">
            <label>Commission % <span className="text-brand-red">*</span> <span className="text-inksoft font-normal">(required, applied to every bill in this market)</span></label>
            <input type="number" step="0.01" min="0" max="100" required placeholder="e.g. 5" value={form.commission_percent} onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }} onChange={(e) => { setForm({ ...form, commission_percent: e.target.value }); setFieldErrors((f) => ({ ...f, commission_percent: "" })); }} />
            {fieldErrors.commission_percent && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.commission_percent}</div>}
          </div>
          <div className="field">
            <label>Market Fees <span className="text-brand-red">*</span></label>
            <input type="number" step="0.01" min="0.01" required placeholder="e.g. 500" value={form.market_fee} onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }} onChange={(e) => { setForm({ ...form, market_fee: e.target.value }); setFieldErrors((f) => ({ ...f, market_fee: "" })); }} />
            {fieldErrors.market_fee && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.market_fee}</div>}
          </div>
          <div className="col-span-2 flex gap-2.5 mt-1">
            <button type="submit" className="btn btn-primary">Save Market</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
