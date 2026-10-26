import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_CONFIG } from "../utils/navConfig";
import { hasErrors } from "../utils/validators";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {
      username: !username.trim()
        ? "Username is required"
        : username.trim().length > 30
        ? "Username must not exceed 30 characters"
        : "",
      password: !password ? "Password is required" : password.length > 64 ? "Password must not exceed 64 characters" : "",
    };
    setFieldErrors(errs);
    if (hasErrors(errs)) return;
    try {
      const user = await login(username.trim(), password);
      const base = NAV_CONFIG[user.role_name]?.basePath || "/login";
      navigate(base);
    } catch {
      // error is already surfaced via context
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-[1.15] bg-gradient-to-br from-green-900 to-green-800 text-[#EAF1EA] px-16 py-16 flex flex-col justify-center hidden md:flex">
        <div className="font-bold text-[15px] text-white mb-6 flex items-center gap-2">
          🌾 <span>APMC Billing System</span>
        </div>
        <h1 className="text-[34px] leading-tight font-bold text-white mb-4 max-w-md">
          Digitizing market receipts, billing &amp; gate operations for every APMC yard.
        </h1>
        <p className="text-[14px] text-[#C9D6CB] max-w-md mb-6">
          One platform for Admins, Market Admins, Shop Keepers and Gate Keepers to manage
          arrivals, billing, commissions and compliance in real time.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          {["Role-based access", "Live gate tracking", "Digital receipts", "Multi-market"].map(
            (tag) => (
              <span
                key={tag}
                className="border border-white/30 rounded-full px-3.5 py-1.5 text-[12px] text-[#EAF1EA]"
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-paper p-10">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-line rounded-2xl px-8 pt-8 pb-6 w-full max-w-[380px] shadow-lg"
        >
          <div className="text-[11px] font-bold text-amber-600 tracking-wide mb-1.5">
            USER LOGIN
          </div>
          <h2 className="m-0 mb-1 text-[21px]">Welcome back</h2>
          <p className="text-inksoft text-[12.5px] mb-5">Sign in with your username and password</p>

          {error && (
            <div className="mb-4 text-[12.5px] text-brand-red bg-[#F5E1DE] border border-[#E7C3BC] rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="field mb-3.5">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setFieldErrors((f) => ({ ...f, username: "" })); }}
              maxLength={30}
              autoComplete="username"
            />
            {fieldErrors.username && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.username}</div>}
          </div>
          <div className="field mb-3.5">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: "" })); }}
              maxLength={64}
              autoComplete="current-password"
            />
            {fieldErrors.password && <div className="text-[11.5px] text-brand-red mt-1">{fieldErrors.password}</div>}
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full justify-center py-2.5 text-[13.5px]"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
          <p className="text-[11px] text-inksoft mt-3.5 leading-relaxed">
            Sample logins (password: <code>Password@123</code>): admin · ravi.kulkarni ·
            vinod.shinde · suresh.pawar
          </p>
        </form>
      </div>
    </div>
  );
}
