import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusPill from "../../components/StatusPill";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import { fetchShops, createShop, updateShop, setShopStatus, fetchMarkets } from "../../api/endpoints";

const EMPTY_FORM = {
  name: "",
  owner_name: "",
  mobile: "",
  market_id: "",
  status: "ACTIVE",
};

export default function ShopsPage({ isAdmin }) {
  const { user: me } = useAuth();
  const [shops, setShops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");

  async function loadAll() {
    setLoading(true);
    const [shopsData, marketsData] = await Promise.all([
      fetchShops(),
      isAdmin ? fetchMarkets() : Promise.resolve([]),
    ]);
    setShops(shopsData);
    setMarkets(marketsData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return shops.filter((s) => {
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.owner_name || "").toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [shops, statusFilter, search]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setSaveError("");
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
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    const payload = { ...form, market_id: Number(form.market_id) };
    try {
      if (editingId) {
        await updateShop(editingId, payload);
      } else {
        await createShop(payload);
      }
      setModalOpen(false);
      loadAll();
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save shop.");
    }
  }

  async function toggleStatus(s) {
    await setShopStatus(s.id, s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    loadAll();
  }

  const columns = [
    { key: "name", header: "Shop Name" },
    { key: "owner_name", header: "Owner" },
    { key: "mobile", header: "Contact" },
    ...(isAdmin ? [{ key: "market_name", header: "Market" }] : []),
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Inactive"} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <>
          <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
          <button className={r.status === "ACTIVE" ? "btn-danger-text" : "btn-text"} onClick={() => toggleStatus(r)}>
            {r.status === "ACTIVE" ? "Suspend" : "Reactivate"}
          </button>
        </>
      ),
    },
  ];

  return (
    <div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search shops..." />
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
        <button className="btn btn-primary" onClick={openAdd}>+ Add Shop</button>
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
          </div>
          <div className="field">
            <label>Owner Name</label>
            <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          </div>
          <div className="field">
            <label>Mobile</label>
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          {isAdmin && (
            <div className="field col-span-2">
              <label>Market</label>
              <select value={form.market_id} onChange={(e) => setForm({ ...form, market_id: e.target.value })} required>
                <option value="" disabled>Select market</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
          {editingId && (
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
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
