import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusPill from "../../components/StatusPill";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import { fetchFarmers, createFarmer, updateFarmer, deleteFarmer, fetchMarkets } from "../../api/endpoints";

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

  async function load() {
    setLoading(true);
    const [farmersData, marketsData] = await Promise.all([
      fetchFarmers({
        q: search || undefined,
        market_id: isAdmin && marketFilter !== "ALL" ? marketFilter : undefined,
      }),
      isAdmin ? fetchMarkets() : Promise.resolve([]),
    ]);
    setFarmers(farmersData);
    setMarkets(marketsData);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, marketFilter]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : user?.market_id || "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(f) {
    setEditingId(f.id);
    setForm({ name: f.name, mobile: f.mobile || "", village: f.village || "", market_id: f.market_id });
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await updateFarmer(editingId, { name: form.name, mobile: form.mobile, village: form.village });
      } else {
        await createFarmer({
          name: form.name,
          mobile: form.mobile,
          village: form.village,
          market_id: Number(form.market_id),
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save farmer.");
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
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Inactive"} /> },
    {
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
    },
  ];

  return (
    <div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search farmers..." />
        {isAdmin && (
          <FilterSelect
            value={marketFilter}
            onChange={setMarketFilter}
            options={[{ value: "ALL", label: "Market: All" }, ...markets.map((m) => ({ value: String(m.id), label: m.name }))]}
          />
        )}
        <Spacer />
        <button className="btn btn-primary" onClick={openAdd}>+ Add Farmer</button>
      </Toolbar>

      <DataTable columns={columns} rows={farmers} loading={loading} emptyText="No farmers in this market yet." />

      <Modal open={modalOpen} title={editingId ? "Edit Farmer" : "Add Farmer"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4">
          {error && <div className="text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{error}</div>}
          <div className="field">
            <label>Farmer Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Mobile</label>
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div className="field">
            <label>Village</label>
            <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
          </div>
          {isAdmin && !editingId && (
            <div className="field">
              <label>Market</label>
              <select value={form.market_id} onChange={(e) => setForm({ ...form, market_id: e.target.value })} required>
                <option value="" disabled>Select market</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
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
