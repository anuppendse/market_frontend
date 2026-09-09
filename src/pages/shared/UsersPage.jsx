import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusPill from "../../components/StatusPill";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import {
  fetchUsers,
  createUser,
  updateUser,
  setUserStatus,
  fetchRoles,
  fetchMarkets,
  fetchShops,
  fetchUserLoginHistory,
} from "../../api/endpoints";

const EMPTY_FORM = {
  name: "",
  username: "",
  mobile: "",
  email: "",
  password: "",
  role_id: "",
  market_id: "",
  shop_id: "",
  status: "ACTIVE",
};

export default function UsersPage({ isAdmin }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [historyUser, setHistoryUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [usersData, rolesData, marketsData, shopsData] = await Promise.all([
      fetchUsers(),
      fetchRoles(),
      isAdmin ? fetchMarkets() : Promise.resolve([]),
      fetchShops().catch(() => []),
    ]);
    setUsers(usersData);
    setRoles(rolesData);
    setMarkets(marketsData);
    setShops(shopsData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role_name === roleFilter;
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.mobile || "").includes(search) ||
        u.username.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setSaveError("");
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      username: u.username,
      mobile: u.mobile || "",
      email: u.email || "",
      password: "",
      role_id: u.role_id,
      market_id: u.market_id || "",
      shop_id: u.shop_id || "",
      status: u.status,
    });
    setSaveError("");
    setModalOpen(true);
  }

  async function openHistory(u) {
    setHistoryUser(u);
    setHistoryLoading(true);
    const data = await fetchUserLoginHistory(u.id);
    setHistory(data);
    setHistoryLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    const payload = {
      ...form,
      role_id: Number(form.role_id),
      market_id: form.market_id ? Number(form.market_id) : null,
      shop_id: form.shop_id ? Number(form.shop_id) : null,
    };
    if (!payload.password) delete payload.password;

    try {
      if (editingId) {
        await updateUser(editingId, payload);
      } else {
        await createUser(payload);
      }
      setModalOpen(false);
      loadAll();
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save user.");
    }
  }

  async function toggleStatus(u) {
    await setUserStatus(u.id, u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    loadAll();
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "role_display_name", header: "Role" },
    { key: "mobile", header: "Mobile" },
    ...(isAdmin ? [{ key: "market_name", header: "Market" }] : []),
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Suspended"} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <>
          <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
          <button className="btn-text" onClick={() => openHistory(r)}>Login History</button>{" "}
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
        <SearchBox value={search} onChange={setSearch} placeholder="Search users..." />
        <FilterSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[{ value: "ALL", label: "Role: All" }, ...roles.map((r) => ({ value: r.name, label: r.display_name }))]}
        />
        <Spacer />
        <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>
      </Toolbar>

      <DataTable columns={columns} rows={filtered} loading={loading} />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit User" : "Add User"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{saveError}</div>
          )}
          <div className="field col-span-2">
            <label>Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!editingId}
              required
            />
          </div>
          <div className="field">
            <label>{editingId ? "New Password (optional)" : "Password"}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editingId}
              placeholder={editingId ? "Leave blank to keep current" : ""}
            />
          </div>
          <div className="field">
            <label>Mobile Number</label>
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required>
              <option value="" disabled>Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <div className="field">
              <label>Market</label>
              <select value={form.market_id} onChange={(e) => setForm({ ...form, market_id: e.target.value })}>
                <option value="">— None —</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Shop <span className="text-inksoft font-normal">(for Shop Keepers)</span></label>
            <select value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })}>
              <option value="">— None —</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {editingId && (
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Suspended</option>
              </select>
            </div>
          )}
          <div className="col-span-2 flex gap-2.5 mt-1">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!historyUser}
        title={`Login History — ${historyUser?.name || ""}`}
        onClose={() => setHistoryUser(null)}
      >
        {historyLoading && <p className="text-inksoft text-[13px]">Loading...</p>}
        {!historyLoading && history.length === 0 && (
          <p className="text-inksoft text-[13px]">No login sessions recorded yet.</p>
        )}
        {!historyLoading && history.length > 0 && (
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[11px] text-inksoft font-bold pb-2">Login</th>
                <th className="text-left text-[11px] text-inksoft font-bold pb-2">Logout</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="py-1.5 border-t border-line">{new Date(h.login_at).toLocaleString()}</td>
                  <td className="py-1.5 border-t border-line">
                    {h.logout_at ? new Date(h.logout_at).toLocaleString() : <span className="text-inksoft">Still active / not recorded</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
