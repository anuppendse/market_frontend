import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusToggle from "../../components/StatusToggle";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import { activeSearchTerm } from "../../utils/search";
import {
  cleanName,
  fullNameError,
  usernameError,
  passwordError,
  mobileError,
  emailError,
  requiredSelectError,
  hasErrors,
} from "../../utils/validators";
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
  // Status editability depends on the ROLE of the row being viewed, not just
  // who's viewing:
  //  - Admin may flip status only for Admin / Market Admin accounts.
  //  - Market Admin may flip status only for Shop Keeper / Gate Keeper
  //    accounts.
  // Every other combination gets the same toggle, view-only.
  function canManageStatus(roleName) {
    return allowedRoleNames.includes(roleName);
  }
  // Admin creates Market Admin / Shop Keeper / Gate Keeper (never another
  // Admin); Market Admin creates Shop Keeper / Gate Keeper only. Used for the
  // role dropdown, the role filter, and who can be edited / suspended.
  const allowedRoleNames = isAdmin
    ? ["MARKET_ADMIN", "SHOPKEEPER", "GATEKEEPER"]
    : ["SHOPKEEPER", "GATEKEEPER"];
  const [users, setUsers] = useState([]);
  const [allRoles, setRoles] = useState([]);
  const roles = allRoles.filter((r) => allowedRoleNames.includes(r.name));
  const [markets, setMarkets] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [historyUser, setHistoryUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    try {
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
    } catch (err) {
      setLoadError(err?.response?.data?.error || "Could not load users. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formRoleName = roles.find((r) => String(r.id) === String(form.role_id))?.name || "";
  // Shops offered in the form: only the chosen market's shops (Market Admin: own market),
  // and only active ones (plus the one already assigned when editing).
  const formMarketId = isAdmin ? form.market_id : me?.market_id;
  const marketShops = shops.filter(
    (s) =>
      String(s.market_id) === String(formMarketId) &&
      (s.status !== "INACTIVE" || String(s.id) === String(form.shop_id))
  );

  // Searching starts only after 3 characters; with 1-2 characters the full list stays.
  const term = activeSearchTerm(search).toLowerCase();
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role_name === roleFilter;
      const matchesSearch =
        !term ||
        (u.name || "").toLowerCase().includes(term) ||
        (u.mobile || "").includes(term) ||
        (u.username || "").toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, term]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setSaveError("");
    setFieldErrors({});
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
      shop_id: u.role_name === "SHOPKEEPER" ? u.shop_id || "" : "",
      status: u.status,
    });
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function openHistory(u) {
    setHistoryUser(u);
    setHistoryLoading(true);
    try {
      setHistory(await fetchUserLoginHistory(u.id));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");

    const selectedRole = roles.find((r) => String(r.id) === String(form.role_id));
    const duplicate = form.mobile.trim()
      ? users.find((u) => u.id !== editingId && (u.mobile || "").trim() === form.mobile.trim())
      : null;
    const existingMarketAdmin =
      selectedRole?.name === "MARKET_ADMIN" && form.market_id
        ? users.find(
            (u) =>
              u.id !== editingId &&
              u.role_name === "MARKET_ADMIN" &&
              String(u.market_id) === String(form.market_id)
          )
        : null;
    const errs = {
      name: fullNameError(form.name),
      username: editingId ? "" : usernameError(form.username),
      password: passwordError(form.password, !editingId),
      mobile:
        mobileError(form.mobile) ||
        (duplicate ? `This mobile number is already registered for ${duplicate.name} (${duplicate.role_display_name})` : ""),
      email: form.email.trim() ? emailError(form.email) : "",
      role_id: requiredSelectError("a role", form.role_id),
      market_id:
        isAdmin && selectedRole && !form.market_id
          ? "Please select a market"
          : selectedRole?.name === "MARKET_ADMIN" && existingMarketAdmin
          ? `This market already has a Market Admin (${existingMarketAdmin.name}). Only one Market Admin is allowed per market.`
          : "",
      shop_id:
        selectedRole?.name === "SHOPKEEPER" && !form.shop_id
          ? "Please select a shop for a Shop Keeper"
          : "",
    };
    setFieldErrors(errs);
    if (hasErrors(errs)) return;

    const payload = {
      ...form,
      name: cleanName(form.name),
      username: form.username.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      role_id: Number(form.role_id),
      market_id: form.market_id ? Number(form.market_id) : null,
      // Only a Shop Keeper has a shop.
      shop_id: selectedRole?.name === "SHOPKEEPER" && form.shop_id ? Number(form.shop_id) : null,
    };
    if (!isAdmin) payload.market_id = me?.market_id || null;
    if (!payload.password) delete payload.password;
    if (editingId) delete payload.username;

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
    try {
      await setUserStatus(u.id, u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not change user status.");
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "role_display_name", header: "Role" },
    { key: "mobile", header: "Mobile" },
    ...(isAdmin ? [{ key: "market_name", header: "Market" }] : []),
    {
      key: "status",
      header: "Status",
      render: (r) =>
        canManageStatus(r.role_name) ? (
          <StatusToggle status={r.status} onClick={() => toggleStatus(r)} />
        ) : (
          <StatusToggle status={r.status} disabled />
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <>
          {canManageStatus(r.role_name) && r.id !== me?.id && (
            <>
              <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
            </>
          )}
          <button className="btn-text" onClick={() => openHistory(r)}>Login History</button>
        </>
      ),
    },
  ];

  return (
    <div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search users... (min 3 characters)" />
        <FilterSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[{ value: "ALL", label: "Role: All" }, ...roles.map((r) => ({ value: r.name, label: r.display_name }))]}
        />
        <Spacer />
        <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>
      </Toolbar>

      {loadError && (
        <div className="mb-3 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{loadError}</div>
      )}
      <DataTable columns={columns} rows={filtered} loading={loading} />

      <Modal
        open={modalOpen}
        title={editingId ? "Edit User" : "Add User"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} noValidate className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{saveError}</div>
          )}
          <div className="field col-span-2">
            <label>Full Name</label>
            <input value={form.name} maxLength={60} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((f) => ({ ...f, name: "" })); }} />
            {fieldErrors.name && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.name}</div>}
          </div>
          <div className="field">
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => { setForm({ ...form, username: e.target.value }); setFieldErrors((f) => ({ ...f, username: "" })); }}
              disabled={!!editingId}
              maxLength={30}
              autoComplete="off"
            />
            {fieldErrors.username && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.username}</div>}
          </div>
          <div className="field">
            <label>{editingId ? "New Password (optional)" : "Password"}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((f) => ({ ...f, password: "" })); }}
              maxLength={64}
              autoComplete="new-password"
              placeholder={editingId ? "Leave blank to keep current" : ""}
            />
            {fieldErrors.password && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.password}</div>}
            {!fieldErrors.password && (
              <div className="text-[11px] text-inksoft mt-1">Min 8 characters with uppercase, lowercase, number and special character.</div>
            )}
          </div>
          <div className="field">
            <label>Mobile Number</label>
            <input
              value={form.mobile}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              onChange={(e) => { setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") }); setFieldErrors((f) => ({ ...f, mobile: "" })); }}
            />
            {fieldErrors.mobile && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.mobile}</div>}
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} maxLength={100} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((f) => ({ ...f, email: "" })); }} />
            {fieldErrors.email && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.email}</div>}
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role_id} onChange={(e) => {
                const rName = roles.find((r) => String(r.id) === e.target.value)?.name;
                setForm({
                  ...form,
                  role_id: e.target.value,
                  // Only Shop Keepers have a shop.
                  shop_id: rName === "SHOPKEEPER" ? form.shop_id : "",
                });
                setFieldErrors((f) => ({ ...f, role_id: "", market_id: "", shop_id: "" }));
              }}>
              <option value="" disabled>Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
            {fieldErrors.role_id && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.role_id}</div>}
          </div>
          {isAdmin && (
            <div className="field">
              <label>Market</label>
              <select
                value={form.market_id}
                onChange={(e) => {
                  // Changing the market clears the shop (shops belong to one market).
                  setForm({ ...form, market_id: e.target.value, shop_id: "" });
                  setFieldErrors((f) => ({ ...f, market_id: "", shop_id: "" }));
                }}
                disabled={!form.role_id}
              >
                <option value="">{form.role_id ? "Select market" : "Select a role first"}</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {fieldErrors.market_id && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.market_id}</div>}
            </div>
          )}
          {formRoleName === "SHOPKEEPER" && (
            <div className="field">
              <label>Shop</label>
              <select
                value={form.shop_id}
                onChange={(e) => { setForm({ ...form, shop_id: e.target.value }); setFieldErrors((f) => ({ ...f, shop_id: "" })); }}
                disabled={!formMarketId}
              >
                <option value="">{formMarketId ? "Select shop" : "Select a market first"}</option>
                {marketShops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {formMarketId && marketShops.length === 0 && (
                <div className="text-[11.5px] text-amber-600 mt-1">No shops available in this market yet. Add a shop first.</div>
              )}
              {fieldErrors.shop_id && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.shop_id}</div>}
            </div>
          )}
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
