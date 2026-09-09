import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_CONFIG } from "../utils/navConfig";

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AppLayout({ roleKey }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = NAV_CONFIG[roleKey];

  const activeItem =
    nav.items.find((item) => {
      const full = `${nav.basePath}/${item.to}`.replace(/\/$/, "") || nav.basePath;
      return location.pathname === full || (item.to === "" && location.pathname === nav.basePath);
    }) || nav.items[0];

  return (
    <div className="flex min-h-screen">
      <aside className="w-[236px] shrink-0 bg-green-900 text-[#EAF1EA] flex flex-col p-4">
        <div className="flex items-center gap-2 font-bold text-[15px] text-white px-1.5 pb-4">
          <span className="text-lg">🌾</span>
          <span>APMC Billing</span>
        </div>
        <div className="text-[10.5px] font-bold tracking-wide text-amber-100 bg-[rgba(185,121,28,0.28)] border border-[rgba(185,121,28,0.45)] rounded-md px-2.5 py-1.5 mx-1.5 mb-4 text-center">
          {nav.roleBadge}
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {nav.items.map((item) => {
            const to = item.to ? `${nav.basePath}/${item.to}` : nav.basePath;
            return (
              <NavLink
                key={item.label}
                to={to}
                end={item.to === ""}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 text-left bg-transparent text-[13.5px] px-2.5 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-amber-600 text-white font-semibold"
                      : "text-[#C9D6CB] hover:bg-white/[0.06] hover:text-white"
                  }`
                }
              >
                <span className="w-[18px] text-center opacity-90 text-[14px]">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="text-[11px] text-[#7F9081] pt-3.5 px-2 border-t border-white/[0.08] mt-2.5">
          v1.0 · Yard Ops Portal
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-7 py-4.5 bg-white border-b border-line">
          <div>
            <h1 className="m-0 text-[19px] font-bold">{activeItem.title}</h1>
            <p className="mt-0.5 mb-0 text-inksoft text-[12.5px]">{activeItem.subtitle}</p>
          </div>
          <div className="flex items-center gap-4 text-[12.5px] text-inksoft">
            <span>📅 {new Date().toLocaleDateString("en-GB")}</span>
            {user?.market_name && <span>📍 {user.market_name}</span>}
            <button className="btn btn-outline py-1.5 px-3" onClick={logout}>
              Log Out
            </button>
            <span className="w-[30px] h-[30px] rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-[11.5px]">
              {initials(user?.name)}
            </span>
          </div>
        </header>

        <div className="p-7 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
