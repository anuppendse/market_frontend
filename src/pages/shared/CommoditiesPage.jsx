import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import StatusPill from "../../components/StatusPill";
import { Toolbar, SearchBox, Spacer } from "../../components/Toolbar";
import { useAuth } from "../../context/AuthContext";
import {
  fetchCommodities,
  createCommodity,
  updateCommodity,
  addCommodityRate,
  fetchMarkets,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/endpoints";

const EMPTY_FORM = { name: "", category_id: "", unit: "KG", rate_per_unit: "", market_id: "" };
const EMPTY_CATEGORY_FORM = { name: "", description: "", market_id: "" };

export default function CommoditiesPage({ isAdmin, readOnly }) {
  const { user: me } = useAuth();
  const [tab, setTab] = useState("commodities");

  const [commodities, setCommodities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [rateModal, setRateModal] = useState(null);
  const [newRate, setNewRate] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [categoryError, setCategoryError] = useState("");

  async function loadAll() {
    setLoading(true);
    const [commoditiesData, categoriesData, marketsData] = await Promise.all([
      fetchCommodities(),
      fetchCategories(),
      isAdmin ? fetchMarkets() : Promise.resolve([]),
    ]);
    setCommodities(commoditiesData);
    setCategories(categoriesData);
    setMarkets(marketsData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCommodities = commodities.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ---- Commodities -------------------------------------------------

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, market_id: isAdmin ? "" : me?.market_id || "" });
    setSaveError("");
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name, category_id: c.category_id || "", unit: c.unit, rate_per_unit: "", market_id: c.market_id });
    setSaveError("");
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
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
      loadAll();
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save commodity.");
    }
  }

  async function saveRate() {
    if (!newRate) return;
    await addCommodityRate(rateModal.id, { rate_per_unit: Number(newRate) });
    setRateModal(null);
    setNewRate("");
    loadAll();
  }

  const commodityColumns = [
    { key: "name", header: "Commodity" },
    { key: "category_name", header: "Category", render: (r) => r.category_name || <span className="text-inksoft">Uncategorized</span> },
    { key: "unit", header: "Unit" },
    { key: "latest_rate", header: "Today's Rate", render: (r) => (r.latest_rate != null ? `₹${r.latest_rate.toLocaleString("en-IN")}` : "—") },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Inactive"} /> },
    ...(readOnly
      ? []
      : [
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <>
                <button className="btn-text" onClick={() => openEdit(r)}>Edit</button>{" "}
                <button className="btn-text" onClick={() => setRateModal(r)}>Update Rate</button>
              </>
            ),
          },
        ]),
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
        await updateCategory(editingCategoryId, { name: categoryForm.name, description: categoryForm.description });
      } else {
        await createCategory({
          name: categoryForm.name,
          description: categoryForm.description,
          market_id: Number(categoryForm.market_id),
        });
      }
      setCategoryModalOpen(false);
      loadAll();
    } catch (err) {
      setCategoryError(err?.response?.data?.error || "Could not save category.");
    }
  }

  async function handleDeleteCategory(c) {
    try {
      await deleteCategory(c.id);
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not delete category.");
    }
  }

  const categoryColumns = [
    { key: "name", header: "Category" },
    { key: "description", header: "Description", render: (r) => r.description || "—" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} label={r.status === "ACTIVE" ? "Active" : "Inactive"} /> },
    ...(readOnly
      ? []
      : [
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
        ]),
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
          <Toolbar>
            <SearchBox value={search} onChange={setSearch} placeholder="Search commodities..." />
            <Spacer />
            {!readOnly && <button className="btn btn-primary" onClick={openAdd}>+ Add Commodity</button>}
          </Toolbar>
          <DataTable columns={commodityColumns} rows={filteredCommodities} loading={loading} />
        </div>
      )}

      {tab === "categories" && (
        <div>
          <Toolbar>
            <span className="text-[12.5px] text-inksoft">{categories.length} categories</span>
            <Spacer />
            {!readOnly && <button className="btn btn-primary" onClick={openAddCategory}>+ Add Category</button>}
          </Toolbar>
          <DataTable columns={categoryColumns} rows={categories} loading={loading} />
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
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Unit</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {["KG", "QUINTAL", "TON", "BAG", "DOZEN"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
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
          {!editingId && (
            <div className="field">
              <label>Opening Rate (optional)</label>
              <input type="number" step="0.01" value={form.rate_per_unit} onChange={(e) => setForm({ ...form, rate_per_unit: e.target.value })} />
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
          {isAdmin && !editingCategoryId && (
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
