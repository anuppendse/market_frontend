export const NAV_CONFIG = {
  ADMIN: {
    roleBadge: "ADMIN",
    basePath: "/admin",
    items: [
      { to: "", icon: "▦", label: "Dashboard", title: "Dashboard", subtitle: "Platform-wide overview" },
      { to: "users", icon: "👤", label: "User Management", title: "User Management", subtitle: "Add, update, activate, suspend or remove platform users" },
      { to: "markets", icon: "🏛", label: "Market Management", title: "Market Management", subtitle: "Add and manage APMC markets/yards on the platform" },
      { to: "shops", icon: "🏬", label: "Shops", title: "Shops", subtitle: "Add, update, activate, suspend or remove shops" },
      { to: "commodities", icon: "🧺", label: "Commodities & Rates", title: "Commodities & Rates", subtitle: "Manage categories, the commodity master and daily rates" },
      { to: "farmers", icon: "👨‍🌾", label: "Farmers", title: "Farmers", subtitle: "Market-level farmer directory, visible to every shop in the market" },
      { to: "vehicles", icon: "🚚", label: "Vehicle Entry Log", title: "Vehicle Registration and Entry", subtitle: "View today's gate log across all shops and export it" },
      { to: "reports", icon: "📄", label: "Report", title: "Report", subtitle: "Generate and export sales, commission, gate and audit reports" },
      { to: "settings", icon: "⚙", label: "Settings", title: "Settings", subtitle: "Profile and platform-wide configuration" },
    ],
  },
  MARKET_ADMIN: {
    roleBadge: "MARKET ADMIN",
    basePath: "/market-admin",
    items: [
      { to: "", icon: "▦", label: "Dashboard", title: "Dashboard", subtitle: "Operations overview for your market" },
      { to: "users", icon: "👤", label: "User Management", title: "User Management", subtitle: "Manage users for this yard; search and filter by role" },
      { to: "shops", icon: "🏬", label: "Shops", title: "Shops", subtitle: "Add, update, activate, suspend or remove shops in this yard" },
      { to: "commodities", icon: "🧺", label: "Commodities & Rates", title: "Commodities & Rates", subtitle: "Manage categories, commodities and today's rates for this yard" },
      { to: "farmers", icon: "👨‍🌾", label: "Farmers", title: "Farmers", subtitle: "Market-level farmer directory; you can delete records here" },
      { to: "vehicles", icon: "🚚", label: "Vehicle Entry Log", title: "Vehicle Registration and Entry", subtitle: "View today's gate log for this yard and export it" },
      { to: "reports", icon: "📄", label: "Report", title: "Report", subtitle: "Generate and export reports for this yard" },
      { to: "settings", icon: "⚙", label: "Settings", title: "Settings", subtitle: "Your profile" },
    ],
  },
  SHOPKEEPER: {
    roleBadge: "SHOP KEEPER",
    basePath: "/shopkeeper",
    items: [
      { to: "", icon: "▦", label: "Dashboard", title: "Dashboard", subtitle: "Shop dashboard" },
      { to: "billing", icon: "🧾", label: "Billing & Receipt", title: "Billing & Receipt", subtitle: "Create a new multi-item bill for a farmer and print the receipt" },
      { to: "farmers", icon: "👨‍🌾", label: "Farmer Details", title: "Farmer Details", subtitle: "Every farmer in this market -- add new ones as they arrive" },
      { to: "commodities", icon: "🧺", label: "Commodities & Rates", title: "Commodities & Rates", subtitle: "Today's commodity rates for this yard (view only)" },
      { to: "reports", icon: "📄", label: "Report", title: "Report", subtitle: "Shop-level reports" },
      { to: "settings", icon: "⚙", label: "Settings", title: "Settings", subtitle: "Your profile" },
    ],
  },
  GATEKEEPER: {
    roleBadge: "GATE KEEPER",
    basePath: "/gatekeeper",
    items: [
      { to: "", icon: "▦", label: "Dashboard", title: "Dashboard", subtitle: "Gate & entry monitoring" },
      { to: "vehicles", icon: "🚚", label: "Vehicle Reg. & Entry", title: "Vehicle Registration and Entry", subtitle: "Register vehicles, log entries and exits, issue gate passes" },
      { to: "reports", icon: "📄", label: "Report", title: "Report", subtitle: "Gate activity over a period" },
      { to: "settings", icon: "⚙", label: "Settings", title: "Settings", subtitle: "Your profile" },
    ],
  },
};
