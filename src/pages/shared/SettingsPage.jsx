import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateUser } from "../../api/endpoints";

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    mobile: user?.mobile || "",
    email: user?.email || "",
    password: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      const payload = { name: form.name, mobile: form.mobile, email: form.email };
      if (form.password) payload.password = form.password;
      await updateUser(user.id, payload);
      setSaved(true);
      setForm({ ...form, password: "" });
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save changes.");
    }
  }

  return (
    <div className="card">
      <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Profile</h3></div>
      <div className="p-4.5">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {saved && (
            <div className="col-span-2 text-[12.5px] text-[#2A6B36] bg-[#E1EEE0] rounded-md px-3 py-2">Changes saved.</div>
          )}
          {error && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{error}</div>
          )}
          <div className="field">
            <label>Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            <label>Change Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
