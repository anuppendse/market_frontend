import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusToggle from "../../components/StatusToggle";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import { cleanName, personNameError, mobileError, placeNameError, requiredSelectError, hasErrors } from "../../utils/validators";
import { fetchFarmers, createFarmer, updateFarmer, deleteFarmer, fetchMarkets } from "../../api/endpoints";
import { activeSearchTerm, isSearchTooShort, SEARCH_DEBOUNCE_MS } from "../../utils/search";

const EMPTY_FORM = { name: "", mobile: "", village: "", market_id: "" };

export default function FarmersPage({ canDelete, isAdmin }) {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [marketFilter, setMarketFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [loadError, setLoadError] = useState("");

  // Loads the market list (admin only) once.
  useEffect(() => {
    if (!isAdmin) return;
    fetchMarkets()
      .then(setMarkets)
      .catch(() => setLoadError("Could not load the market list."));
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      // Search text is only sent once at least 3 characters are typed.
      const data = await fetchFarmers({
        q: activeSearchTerm(search) || undefined,
        market_id: isAdmin && marketFilter !== "ALL" ? marketFilter : undefined,
      });
      setFarmers(data);
    } catch (err) {
      setLoadError(err?.response?.data?.error || "Could not load farmers. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 1-2 typed characters => do nothing (the list stays as it is). Otherwise
  // reload after a short pause so we don't fire a request on every keystroke.
  useEffect(() => {
    if (isSearchTooShort(search)) return;
    const handle = setTimeout(load, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, marketFilter]);

  // Safety net: even if the server ignores market_id, only show farmers of the
  // selected market (e.g. choose "Pune" -> only Pune's farmers are listed).
  const visibleFarmers =
    isAdmin && marketFilter !== "ALL"
      ? farmers.filter((f) => String(f.market_id) === String(marketFilter))
      : farmers;

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : user?.market_id || "" });
    setError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(f) {
    setEditingId(f.id);
    setForm({ name: f.name, mobile: f.mobile || "", village: f.village || "", market_id: f.market_id });
    setError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    const errs = {
      name: personNameError("Farmer name", form.name),
      mobile: mobileError(form.mobile),
      village: placeNameError("Village", form.village),
      market_id: isAdmin && !editingId ? requiredSelectError("a market", form.market_id) : "",
    };
    setFieldErrors(errs);
    if (hasErrors(errs)) return;

    const clean = { name: cleanName(form.name), mobile: form.mobile.trim(), village: cleanName(form.village) };
    try {
      if (editingId) {
        await updateFarmer(editingId, clean);
      } else {
        await createFarmer({
          ...clean,
          market_id: Number(form.market_id),
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save farmer.");
    }
  }

  async function toggleStatus(f) {
    try {
      await updateFarmer(f.id, { status: f.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      load();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not change status.");
    }
  }

  async function handleDelete(f) {
    if (!window.confirm(`Delete ${f.name}? This can't be undone.`)) return;
    try {
      await deleteFarmer(f.id);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not delete farmer.");
    }
  }

  const columns = [
    { key: "name", header: "Farmer Name" },
    { key: "mobile", header: "Mobile" },
    { key: "village", header: "Village" },
    ...(isAdmin ? [{ key: "market_name", header: "Market" }] : []),
    { key: "status", header: "Status", render: (r) =>
        user?.role_name === "SHOPKEEPER" ? (
          <StatusToggle status={r.status} onClick={() => toggleStatus(r)} />
        ) : (
          <StatusToggle status={r.status} disabled />
        ),
    },
    
    ...(isAdmin 
      ? []
      
    :[{
      key: "actions",
      header: "Actions",
      render: (r) => (
        <>
          <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>
          {canDelete && (
            <>
              {" "}
              <button className="btn-danger-text" onClick={() => handleDelete(r)}>Delete</button>
            </>
          )}
        </>
      ),
    }]),
  ];

  return (
    <div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search farmers... (min 3 characters)" />
        {isAdmin && (
          <FilterSelect
            value={marketFilter}
            onChange={setMarketFilter}
            options={[{ value: "ALL", label: "Market: All" }, ...markets.map((m) => ({ value: String(m.id), label: m.name }))]}
          />
        )}
        <Spacer />
        {user?.role_name === "SHOPKEEPER" && (
  <button className="btn btn-primary" onClick={openAdd}>+ Add Farmer</button>
)}
      </Toolbar>

      {loadError && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{loadError}</div>
      )}
      <DataTable columns={columns} rows={visibleFarmers} loading={loading} emptyText="No farmers found." />

      <Modal open={modalOpen} title={editingId ? "Edit Farmer" : "Add Farmer"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} noValidate className="grid grid-cols-1 gap-4">
          {error && <div className="text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{error}</div>}
          <div className="field">
            <label>Farmer Name</label>
            <input value={form.name} maxLength={60} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((f) => ({ ...f, name: "" })); }} />
            {fieldErrors.name && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.name}</div>}
          </div>
          <div className="field">
            <label>Mobile</label>
            <input value={form.mobile} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" onChange={(e) => { setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") }); setFieldErrors((f) => ({ ...f, mobile: "" })); }} />
            {fieldErrors.mobile && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.mobile}</div>}
          </div>
          <div className="field">
            <label>Village</label>
            <input value={form.village} maxLength={50} onChange={(e) => { setForm({ ...form, village: e.target.value }); setFieldErrors((f) => ({ ...f, village: "" })); }} />
            {fieldErrors.village && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.village}</div>}
          </div>
          {isAdmin && !editingId && (
            <div className="field">
              <label>Market</label>
              <select value={form.market_id} onChange={(e) => { setForm({ ...form, market_id: e.target.value }); setFieldErrors((f) => ({ ...f, market_id: "" })); }}>
                <option value="" disabled>Select market</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            {fieldErrors.market_id && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.market_id}</div>}
            </div>
          )}
          <div className="flex gap-2.5 mt-1">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
