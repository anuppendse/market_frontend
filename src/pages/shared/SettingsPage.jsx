import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateUser as updateUserApi } from "../../api/endpoints";
import {
  cleanName,
  fullNameError,
  mobileError,
  emailError,
  confirmPasswordError,
} from "../../utils/validators";

export default function SettingsPage() {
  const { user, updateUser: updateAuthUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    mobile: user?.mobile || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const errs = {
      name: fullNameError(form.name),
      mobile: mobileError(form.mobile),
      email: emailError(form.email),
      confirmPassword: confirmPasswordError(form.password, form.confirmPassword),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    try {
      const payload = { name: cleanName(form.name), mobile: form.mobile.trim(), email: form.email.trim() };
      if (form.password) payload.password = form.password;
      const updated = await updateUserApi(user.id, payload);
      // Keep the profile popover, this form, and localStorage all in sync
      // with what was just saved -- so a refresh or re-login still shows it.
      updateAuthUser({ name: updated.name, mobile: updated.mobile, email: updated.email });
      setSaved(true);
      setForm({ ...form, name: payload.name, mobile: payload.mobile, email: payload.email, password: "", confirmPassword: "" });
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save changes.");
    }
  }

  return (
    <div className="card">
      <div className="card-head"><h3 className="m-0 text-[13.5px] font-bold">Profile</h3></div>
      <div className="p-4.5">
        <form onSubmit={handleSave} noValidate className="grid grid-cols-2 gap-4">
          {saved && (
            <div className="col-span-2 text-[12.5px] text-[#2A6B36] bg-[#E1EEE0] rounded-md px-3 py-2">Changes saved.</div>
          )}
          {error && (
            <div className="col-span-2 text-[12.5px] text-brand-red bg-[#F5E1DE] rounded-md px-3 py-2">{error}</div>
          )}
          <div className="field">
            <label>Full Name</label>
            <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((f) => ({ ...f, name: "" })); }} />
            {fieldErrors.name && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.name}</div>}
          </div>
          <div className="field">
            <label>Mobile Number</label>
            <input value={form.mobile} inputMode="numeric" maxLength={10} onChange={(e) => { setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") }); setFieldErrors((f) => ({ ...f, mobile: "" })); }} />
            {fieldErrors.mobile && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.mobile}</div>}
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((f) => ({ ...f, email: "" })); }} />
            {fieldErrors.email && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.email}</div>}
          </div>
          <div className="field">
            <label>Change Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((f) => ({ ...f, confirmPassword: "" })); }} />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); setFieldErrors((f) => ({ ...f, confirmPassword: "" })); }} />
            {fieldErrors.confirmPassword && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.confirmPassword}</div>}
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
