import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusToggle from "../../components/StatusToggle";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import { fetchShops, createShop, updateShop, setShopStatus, deleteShop, fetchMarkets } from "../../api/endpoints";

const EMPTY_FORM = {
  name: "",
  owner_name: "",
  mobile: "",
  market_id: "",
  status: "ACTIVE",
};

// Shop search only hits the backend once at least 3 characters are typed
// (1-2 characters => no request; the previously loaded list stays as-is).
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 300;

function validateShopForm(form, isAdmin) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Shop name is required.";
  if (!form.owner_name.trim()) errors.owner_name = "Owner name is required.";
  if (!form.mobile.trim()) {
    errors.mobile = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(form.mobile.trim())) {
    errors.mobile = "Mobile number must be exactly 10 digits.";
  }
  if (isAdmin && !form.market_id) errors.market_id = "Please select a market.";
  return errors;
}

export default function ShopsPage({ isAdmin, isShopkeeper }) {
  const { user: me } = useAuth();
  // Only the Market Admin may add/edit/delete shop records (name, owner,
  // contact, market). Admin and Shop Keeper get a read-only listing for
  // those fields.
  const canManageShops = !isAdmin && !isShopkeeper;
  // Only the Market Admin may flip a shop's ACTIVE/INACTIVE status (enforced
  // server-side too). Admin and Shop Keeper see the same toggle, but
  // view-only.
  const canManageShopStatus = !isAdmin && !isShopkeeper;

  const [shops, setShops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [marketFilter, setMarketFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function loadShops(query) {
    setLoading(true);
    const params = query && query.length >= SEARCH_MIN_CHARS ? { q: query } : {};
    const data = await fetchShops(params);
    setShops(data);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) {
      fetchMarkets().then(setMarkets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced, min-3-character server search. 1-2 characters => no request.
  useEffect(() => {
    if (search.length > 0 && search.length < SEARCH_MIN_CHARS) return;
    const handle = setTimeout(() => loadShops(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    let list = shops;
    if (statusFilter !== "ALL") list = list.filter((s) => s.status === statusFilter);
    if (isAdmin && marketFilter) list = list.filter((s) => String(s.market_id) === marketFilter);
    return list;
  }, [shops, statusFilter, marketFilter, isAdmin]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      owner_name: s.owner_name || "",
      mobile: s.mobile || "",
      market_id: s.market_id,
      status: s.status,
    });
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    const errors = validateShopForm(form, isAdmin);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = { ...form, market_id: Number(form.market_id) };
    try {
      if (editingId) {
        await updateShop(editingId, payload);
      } else {
        await createShop(payload);
      }
      setModalOpen(false);
      loadShops(search);
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save shop.");
    }
  }

  async function toggleStatus(s) {
    await setShopStatus(s.id, s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    loadShops(search);
  }

  async function handleDelete(s) {
    if (!window.confirm(`Delete shop "${s.name}"? This cannot be undone.`)) return;
    try {
      await deleteShop(s.id);
      loadShops(search);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not delete shop.");
    }
  }

  const columns = [
    { key: "name", header: "Shop Name" },
    { key: "market_name", header: "Market Name" },
    { key: "owner_name", header: "Owner" },
    { key: "mobile", header: "Contact" },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        canManageShopStatus ? (
          <StatusToggle status={r.status} onClick={() => toggleStatus(r)} />
        ) : (
          <StatusToggle status={r.status} disabled />
        ),
    },
    ...(canManageShops
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <>
                <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
                <button className="btn-danger-text" onClick={() => handleDelete(r)}>Delete</button>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search shops... (min 3 characters)" />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "Status: All" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
        {isAdmin && (
          <FilterSelect
            value={marketFilter}
            onChange={setMarketFilter}
            options={[
              { value: "", label: "Market: All" },
              ...markets.map((m) => ({ value: String(m.id), label: m.name })),
            ]}
          />
        )}
        <Spacer />
        {canManageShops && <button className="btn btn-primary" onClick={openAdd}>+ Add Shop</button>}
      </Toolbar>

      <DataTable columns={columns} rows={filtered} loading={loading} />

      <Modal open={modalOpen} title={editingId ? "Edit Shop" : "Add Shop"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{saveError}</div>
          )}
          <div className="field col-span-2">
            <label>Shop Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            {fieldErrors.name && <span className="text-[12px] text-brand-red">{fieldErrors.name}</span>}
          </div>
          <div className="field">
            <label>Owner Name</label>
            <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} required />
            {fieldErrors.owner_name && <span className="text-[12px] text-brand-red">{fieldErrors.owner_name}</span>}
          </div>
          <div className="field">
            <label>Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              maxLength={10}
              required
            />
            {fieldErrors.mobile && <span className="text-[12px] text-brand-red">{fieldErrors.mobile}</span>}
          </div>
          {isAdmin && (
            <div className="field col-span-2">
              <label>Market</label>
              <select value={form.market_id} onChange={(e) => setForm({ ...form, market_id: e.target.value })}>
                <option value="" disabled>Select market</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {fieldErrors.market_id && <span className="text-[12px] text-brand-red">{fieldErrors.market_id}</span>}
            </div>
          )}
          <div className="col-span-2 flex gap-2.5 mt-1">
            <button type="submit" className="btn btn-primary">Save Shop</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
