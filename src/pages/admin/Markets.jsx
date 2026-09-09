import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusPill from "../../components/StatusPill";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import {
  fetchMarkets,
  createMarket,
  updateMarket,
  setMarketStatus,
  fetchUsers,
} from "../../api/endpoints";

const EMPTY_FORM = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  market_admin_id: "",
  commission_percent: "0",
  status: "ACTIVE",
};

export default function Markets() {
  const [markets, setMarkets] = useState([]);
  const [marketAdmins, setMarketAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");

  async function loadAll() {
    setLoading(true);
    const [marketsData, usersData] = await Promise.all([
      fetchMarkets(),
      fetchUsers({ role: "MARKET_ADMIN" }),
    ]);
    setMarkets(marketsData);
    setMarketAdmins(usersData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    return markets.filter((m) => {
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.city || "").toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [markets, statusFilter, search]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setModalOpen(true);
  }

  function openEdit(m) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      code: m.code,
      address: m.address || "",
      city: m.city || "",
      state: m.state || "",
      pincode: m.pincode || "",
      market_admin_id: m.market_admin_id || "",
      commission_percent: m.commission_percent != null ? String(m.commission_percent) : "0",
      status: m.status,
    });
    setSaveError("");
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    const payload = {
      ...form,
      market_admin_id: form.market_admin_id ? Number(form.market_admin_id) : null,
      commission_percent: form.commission_percent ? Number(form.commission_percent) : 0,
    };
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
    await setMarketStatus(m.id, m.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    loadAll();
  }

  const totalShops = markets.reduce((sum, m) => sum + (m.shop_count || 0), 0);
  const totalUsers = markets.reduce((sum, m) => sum + (m.user_count || 0), 0);
  const activeMarkets = markets.filter((m) => m.status === "ACTIVE").length;

  const columns = [
    { key: "name", header: "Market Name" },
    { key: "code", header: "Code" },
    { key: "city", header: "City / State", render: (r) => [r.city, r.state].filter(Boolean).join(", ") || "—" },
    { key: "market_admin_name", header: "Market Admin", render: (r) => r.market_admin_name || <span className="text-inksoft">Unassigned</span> },
    { key: "shop_count", header: "Shops" },
    { key: "user_count", header: "Users" },
    { key: "commission_percent", header: "Commission", render: (r) => (r.commission_percent != null ? `${r.commission_percent}%` : "—") },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Inactive"} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <>
          <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
          <button className={r.status === "ACTIVE" ? "btn-danger-text" : "btn-text"} onClick={() => toggleStatus(r)}>
            {r.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </>
      ),
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
        <SearchBox value={search} onChange={setSearch} placeholder="Search markets..." />
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

      <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No markets yet — add your first APMC yard." />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Market" : "Add Market"}
        onClose={() => setModalOpen(false)}
        maxWidth="560px"
      >
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{saveError}</div>
          )}
          <div className="field col-span-2">
            <label>Market Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Pune APMC Yard" />
          </div>
          <div className="field">
            <label>Market Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={!!editingId}
              required
              placeholder="e.g. PUNE-APMC"
            />
          </div>
          <div className="field">
            <label>Assign Market Admin</label>
            <select value={form.market_admin_id} onChange={(e) => setForm({ ...form, market_admin_id: e.target.value })}>
              <option value="">— Unassigned —</option>
              {marketAdmins.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="field col-span-2">
            <label>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="field">
            <label>State</label>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div className="field">
            <label>Pincode</label>
            <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>
          <div className="field">
            <label>Commission % <span className="text-inksoft font-normal">(applied to every bill in this market)</span></label>
            <input type="number" step="0.1" min="0" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} />
          </div>
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
            <button type="submit" className="btn btn-primary">Save Market</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
