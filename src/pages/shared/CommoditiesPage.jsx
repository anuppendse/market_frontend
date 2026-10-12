import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusToggle from "../../components/StatusToggle";
import { Toolbar, SearchBox, FilterSelect, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import {
  fetchCommodities,
  createCommodity,
  updateCommodity,
  setCommodityStatus,
  deleteCommodity,
  addCommodityRate,
  fetchCommodityRates,
  fetchMarkets,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/endpoints";

const EMPTY_FORM = { name: "", category_id: "", unit: "KG", rate_per_unit: "", market_id: "" };
const EMPTY_CATEGORY_FORM = { name: "", description: "", market_id: "" };

// Validates the Add Commodity form. Every field is mandatory except the
// opening rate, which is optional but -- if given -- cannot be negative
// (0 is the lowest allowed value).
function validateCommodityForm(form, isAdmin) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Commodity name is required.";
  if (!form.category_id) errors.category_id = "Please select a category.";
  if (!form.unit) errors.unit = "Please select a unit.";
  if (isAdmin && !form.market_id) errors.market_id = "Please select a market.";
  if (form.rate_per_unit !== "" && form.rate_per_unit !== null && form.rate_per_unit !== undefined) {
    const rate = Number(form.rate_per_unit);
    if (Number.isNaN(rate) || rate < 0) {
      errors.rate_per_unit = "Opening rate cannot be less than 0.";
    }
  }
  return errors;
}

// Search only hits the backend once at least 3 characters are typed
// (1-2 characters => no request; the previously loaded list stays as-is).
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 300;

// props:
//   isAdmin   - Admin view: Market filter/columns shown, everything is
//               VIEW-ONLY (status is a plain pill, not editable) -- Admin
//               can list, search, sort and view current rate + rate
//               history, but cannot add/edit/delete Shops, Commodities or
//               Categories, and cannot flip status.
//   readOnly  - Shop Keeper view: view + search commodities and categories,
//               no management actions of any kind.
//   (neither) - Market Admin view: full manage rights (add/edit/delete,
//               status toggle) for Commodities and Categories.
export default function CommoditiesPage({ isAdmin, readOnly }) {
  const { user: me } = useAuth();
  const [tab, setTab] = useState("commodities");

  // Only the Market Admin may manage or toggle status for Commodities/Categories.
  const isMarketAdmin = !isAdmin && !readOnly;
  const canManageCommodities = isMarketAdmin;
  const canToggleCommodityStatus = isMarketAdmin;
  const canManageCategories = isMarketAdmin;
  const canViewRateHistory = isMarketAdmin;

  const [commodities, setCommodities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [marketFilter, setMarketFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [commodityStatusFilter, setCommodityStatusFilter] = useState("ALL");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryStatusFilter, setCategoryStatusFilter] = useState("ALL");
  const [categoryMarketFilter, setCategoryMarketFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [rateModal, setRateModal] = useState(null);
  const [newRate, setNewRate] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [historyModal, setHistoryModal] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [categoryError, setCategoryError] = useState("");

  async function loadCommodities(query, marketId, status) {
    setLoading(true);
    const params = {};
    if (query && query.length >= SEARCH_MIN_CHARS) params.q = query;
    if (isAdmin && marketId) params.market_id = marketId;
    if (status && status !== "ALL") params.status = status;
    const data = await fetchCommodities(params);
    setCommodities(data);
    setLoading(false);
  }

  async function loadCategories(query, marketId, status) {
    setCategoriesLoading(true);
    const params = {};
    if (query && query.length >= SEARCH_MIN_CHARS) params.q = query;
    if (isAdmin && marketId) params.market_id = marketId;
    if (status && status !== "ALL") params.status = status;
    const data = await fetchCategories(params);
    setCategories(data);
    setCategoriesLoading(false);
  }

  async function loadStatic() {
    const marketsData = isAdmin ? await fetchMarkets() : [];
    setMarkets(marketsData);
  }

  // Map market_id -> market name (fallback for when a row's market_name
  // isn't populated by the API directly).
  const marketNameById = Object.fromEntries(markets.map((m) => [String(m.id), m.name]));
  const resolveMarketName = (r) => r.market_name || marketNameById[String(r.market_id)] || "—";

  useEffect(() => {
    loadStatic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced, min-3-character commodity search. 1-2 characters => no request.
  useEffect(() => {
    if (search.length > 0 && search.length < SEARCH_MIN_CHARS) return;
    const handle = setTimeout(
      () => loadCommodities(search, marketFilter, commodityStatusFilter),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, marketFilter, commodityStatusFilter]);

  // Debounced, min-3-character category search. 1-2 characters => no request.
  useEffect(() => {
    if (categorySearch.length > 0 && categorySearch.length < SEARCH_MIN_CHARS) return;
    const handle = setTimeout(
      () => loadCategories(categorySearch, categoryMarketFilter, categoryStatusFilter),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySearch, categoryMarketFilter, categoryStatusFilter]);

  // ---- Commodities -------------------------------------------------

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name, category_id: c.category_id || "", unit: c.unit, rate_per_unit: "", market_id: c.market_id });
    setSaveError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    if (!editingId) {
      const errors = validateCommodityForm(form, isAdmin);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    try {
      if (editingId) {
        await updateCommodity(editingId, {
          name: form.name,
          category_id: form.category_id ? Number(form.category_id) : null,
          unit: form.unit,
        });
      } else {
        await createCommodity({
          name: form.name,
          category_id: form.category_id ? Number(form.category_id) : null,
          unit: form.unit,
          market_id: Number(form.market_id),
          rate_per_unit: form.rate_per_unit ? Number(form.rate_per_unit) : undefined,
        });
      }
      setModalOpen(false);
      loadCommodities(search, marketFilter, commodityStatusFilter);
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save commodity.");
    }
  }

  async function toggleCommodityStatus(c) {
    try {
      await setCommodityStatus(c.id, c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      loadCommodities(search, marketFilter, commodityStatusFilter);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not update commodity status.");
    }
  }

  async function handleDeleteCommodity(c) {
    if (!window.confirm(`Delete commodity "${c.name}"? This cannot be undone.`)) return;
    try {
      await deleteCommodity(c.id);
      loadCommodities(search, marketFilter, commodityStatusFilter);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not delete commodity.");
    }
  }

  async function saveRate() {
    if (!newRate) return;
    await addCommodityRate(rateModal.id, { rate_per_unit: Number(newRate) });
    setRateModal(null);
    setNewRate("");
    loadCommodities(search, marketFilter, commodityStatusFilter);
  }

  async function openHistory(c) {
    setHistoryModal(c);
    setHistoryLoading(true);
    const data = await fetchCommodityRates(c.id);
    setHistoryRows(data);
    setHistoryLoading(false);
  }

  const commodityColumns = [
    { key: "name", header: "Commodity" },
    ...(isAdmin ? [{ key: "market_name", header: "Market", render: (r) => resolveMarketName(r) }] : []),
    { key: "category_name", header: "Category", render: (r) => r.category_name || <span className="text-inksoft">Uncategorized</span> },
    { key: "unit", header: "Unit" },
    { key: "latest_rate", header: "Current Rate", render: (r) => (r.latest_rate != null ? `₹${r.latest_rate.toLocaleString("en-IN")}` : "—") },
    { key: "latest_rate_date", header: "Last Updated", render: (r) => r.latest_rate_date || "—" },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        canToggleCommodityStatus ? (
          <StatusToggle status={r.status} onClick={() => toggleCommodityStatus(r)} />
        ) : (
          <StatusToggle status={r.status} disabled />
        ),
    },
    ...(isMarketAdmin
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <>
                <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
                <button className="btn-text" onClick={() => setRateModal(r)}>Update Rate</button>{" "}
                <button className="btn-text" onClick={() => openHistory(r)}>View History</button>{" "}
                <button className="btn-danger-text" onClick={() => handleDeleteCommodity(r)}>Delete</button>
              </>
            ),
          },
        ]
      : []),
  ];

  // ---- Categories ----------------------------------------------------

  function openAddCategory() {
    setEditingCategoryId(null);
    setCategoryForm({ ...EMPTY_CATEGORY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setCategoryError("");
    setCategoryModalOpen(true);
  }

  function openEditCategory(c) {
    setEditingCategoryId(c.id);
    setCategoryForm({ name: c.name, description: c.description || "", market_id: c.market_id });
    setCategoryError("");
    setCategoryModalOpen(true);
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    setCategoryError("");
    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: categoryForm.name,
          description: categoryForm.description,
          ...(isAdmin ? { market_id: Number(categoryForm.market_id) } : {}),
        });
      } else {
        await createCategory({
          name: categoryForm.name,
          description: categoryForm.description,
          market_id: Number(categoryForm.market_id),
        });
      }
      setCategoryModalOpen(false);
      loadCategories(categorySearch, categoryMarketFilter, categoryStatusFilter);
    } catch (err) {
      setCategoryError(err?.response?.data?.error || "Could not save category.");
    }
  }

  async function toggleCategoryStatus(c) {
    try {
      await updateCategory(c.id, { status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      loadCategories(categorySearch, categoryMarketFilter, categoryStatusFilter);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not update category status.");
    }
  }

  async function handleDeleteCategory(c) {
    try {
      await deleteCategory(c.id);
      loadCategories(categorySearch, categoryMarketFilter, categoryStatusFilter);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not delete category.");
    }
  }

  const categoryColumns = [
    { key: "name", header: "Category" },
    ...(isAdmin ? [{ key: "market_name", header: "Market", render: (r) => resolveMarketName(r) }] : []),
    { key: "description", header: "Description", render: (r) => r.description || "—" },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        canManageCategories ? (
          <StatusToggle status={r.status} onClick={() => toggleCategoryStatus(r)} />
        ) : (
          <StatusToggle status={r.status} disabled />
        ),
    },
    ...(canManageCategories
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <>
                <button className="btn-text" onClick={() => openEditCategory(r)}>Edit</button>{" "}
                <button className="btn-danger-text" onClick={() => handleDeleteCategory(r)}>Delete</button>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex gap-1.5 mb-4 border-b border-line">
        {[
          { id: "commodities", label: "Commodities" },
          { id: "categories", label: "Categories" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bg-transparent font-semibold text-[13px] px-1 py-2.5 mr-4.5 border-b-2 ${
              tab === t.id ? "text-green-800 border-amber-600" : "text-inksoft border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "commodities" && (
        <div>
          <div className="text-[12.5px] text-inksoft mb-2">{commodities.length} commodities</div>
          <Toolbar>
            <SearchBox value={search} onChange={setSearch} placeholder="Search commodities... (min 3 characters)" />
            <FilterSelect
              value={commodityStatusFilter}
              onChange={setCommodityStatusFilter}
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
                  { value: "", label: "All Markets" },
                  ...markets.map((m) => ({ value: String(m.id), label: m.name })),
                ]}
              />
            )}
            <Spacer />
            {canManageCommodities && <button className="btn btn-primary" onClick={openAdd}>+ Add Commodity</button>}
          </Toolbar>
          <div className="mt-4">
            <DataTable columns={commodityColumns} rows={commodities} loading={loading} />
          </div>
        </div>
      )}

      {tab === "categories" && (
        <div>
          <div className="text-[12.5px] text-inksoft mb-2">{categories.length} categories</div>
          <Toolbar>
            <SearchBox value={categorySearch} onChange={setCategorySearch} placeholder="Search categories... (min 3 characters)" />
            <FilterSelect
              value={categoryStatusFilter}
              onChange={setCategoryStatusFilter}
              options={[
                { value: "ALL", label: "Status: All" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
            {isAdmin && (
              <FilterSelect
                value={categoryMarketFilter}
                onChange={setCategoryMarketFilter}
                options={[
                  { value: "", label: "Market: All" },
                  ...markets.map((m) => ({ value: String(m.id), label: m.name })),
                ]}
              />
            )}
            <Spacer />
            {canManageCategories && <button className="btn btn-primary" onClick={openAddCategory}>+ Add Category</button>}
          </Toolbar>
          <div className="mt-4">
            <DataTable columns={categoryColumns} rows={categories} loading={categoriesLoading} />
          </div>
        </div>
      )}

      <Modal open={modalOpen} title={editingId ? "Edit Commodity" : "Add Commodity"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{saveError}</div>
          )}
          <div className="field col-span-2">
            <label>Commodity Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            {fieldErrors.name && <span className="text-[12px] text-brand-red">{fieldErrors.name}</span>}
          </div>
          <div className="field">
            <label>Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              required={!editingId}
            >
              {editingId ? (
                <option value="">— Uncategorized —</option>
              ) : (
                <option value="" disabled>Select category</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {fieldErrors.category_id && <span className="text-[12px] text-brand-red">{fieldErrors.category_id}</span>}
          </div>
          <div className="field">
            <label>Unit</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required>
              {["KG", "QUINTAL", "TON", "BAG", "DOZEN"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {fieldErrors.unit && <span className="text-[12px] text-brand-red">{fieldErrors.unit}</span>}
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
              {fieldErrors.market_id && <span className="text-[12px] text-brand-red">{fieldErrors.market_id}</span>}
            </div>
          )}
          {!editingId && (
            <div className="field">
              <label>Opening Rate (optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.rate_per_unit}
                onChange={(e) => setForm({ ...form, rate_per_unit: e.target.value })}
              />
              {fieldErrors.rate_per_unit && <span className="text-[12px] text-brand-red">{fieldErrors.rate_per_unit}</span>}
            </div>
          )}
          <div className="col-span-2 flex gap-2.5 mt-1">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!rateModal} title={`Update Rate — ${rateModal?.name || ""}`} onClose={() => setRateModal(null)}>
        <div className="field mb-4">
          <label>New Rate per {rateModal?.unit}</label>
          <input type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} autoFocus />
        </div>
        <div className="flex gap-2.5">
          <button className="btn btn-primary" onClick={saveRate}>Save Rate</button>
          <button className="btn btn-outline" onClick={() => setRateModal(null)}>Cancel</button>
        </div>
      </Modal>

      <Modal
        open={!!historyModal}
        title={`Rate History — ${historyModal?.name || ""}`}
        onClose={() => setHistoryModal(null)}
        maxWidth="640px"
      >
        <DataTable
          loading={historyLoading}
          emptyText="No rate history recorded yet."
          columns={[
            { key: "recorded_at", header: "Date/Time", render: (r) => (r.recorded_at ? new Date(r.recorded_at).toLocaleString("en-IN") : r.rate_date) },
            { key: "commodity_name", header: "Commodity" },
            { key: "market_name", header: "Market" },
            { key: "rate_per_unit", header: "Rate", render: (r) => `₹${r.rate_per_unit.toLocaleString("en-IN")}` },
          ]}
          rows={historyRows}
        />
      </Modal>

      <Modal
        open={categoryModalOpen}
        title={editingCategoryId ? "Edit Category" : "Add Category"}
        onClose={() => setCategoryModalOpen(false)}
      >
        <form onSubmit={handleSaveCategory} className="grid grid-cols-1 gap-4">
          {categoryError && (
            <div className="text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{categoryError}</div>
          )}
          <div className="field">
            <label>Category Name</label>
            <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required placeholder="e.g. Vegetable" />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
          </div>
          {isAdmin && (
            <div className="field">
              <label>Market</label>
              <select value={categoryForm.market_id} onChange={(e) => setCategoryForm({ ...categoryForm, market_id: e.target.value })} required>
                <option value="" disabled>Select market</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2.5 mt-1">
            <button type="submit" className="btn btn-primary">Save Category</button>
            <button type="button" className="btn btn-outline" onClick={() => setCategoryModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
