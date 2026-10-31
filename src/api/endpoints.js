import client from "./client";

// ---- Auth --------------------------------------------------------------
export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data);

export const logout = () => client.post("/auth/logout").then((r) => r.data);

export const fetchMe = () => client.get("/auth/me").then((r) => r.data);

// ---- Roles ---------------------------------------------------------------
export const fetchRoles = () => client.get("/roles").then((r) => r.data);

// ---- Markets (Market Management) ------------------------------------
export const fetchMarkets = (params = {}) =>
  client.get("/markets", { params }).then((r) => r.data);

export const fetchMarket = (id) => client.get(`/markets/${id}`).then((r) => r.data);

export const createMarket = (payload) =>
  client.post("/markets", payload).then((r) => r.data);

export const updateMarket = (id, payload) =>
  client.put(`/markets/${id}`, payload).then((r) => r.data);

export const setMarketStatus = (id, status) =>
  client.patch(`/markets/${id}/status`, { status }).then((r) => r.data);

export const deleteMarket = (id) => client.delete(`/markets/${id}`).then((r) => r.data);

// ---- Users -----------------------------------------------------------
export const fetchUsers = (params = {}) =>
  client.get("/users", { params }).then((r) => r.data);

export const createUser = (payload) => client.post("/users", payload).then((r) => r.data);

export const updateUser = (id, payload) =>
  client.put(`/users/${id}`, payload).then((r) => r.data);

export const setUserStatus = (id, status) =>
  client.patch(`/users/${id}/status`, { status }).then((r) => r.data);

export const fetchUserLoginHistory = (id) =>
  client.get(`/users/${id}/login-history`).then((r) => r.data);

// ---- Shops -------------------------------------------------------------
export const fetchShops = (params = {}) =>
  client.get("/shops", { params }).then((r) => r.data);

export const createShop = (payload) => client.post("/shops", payload).then((r) => r.data);

export const updateShop = (id, payload) =>
  client.put(`/shops/${id}`, payload).then((r) => r.data);

export const setShopStatus = (id, status) =>
  client.patch(`/shops/${id}/status`, { status }).then((r) => r.data);

export const deleteShop = (id) => client.delete(`/shops/${id}`).then((r) => r.data);

// ---- Categories -----------------------------------------------------------
export const fetchCategories = (params = {}) =>
  client.get("/categories", { params }).then((r) => r.data);

export const createCategory = (payload) =>
  client.post("/categories", payload).then((r) => r.data);

export const updateCategory = (id, payload) =>
  client.put(`/categories/${id}`, payload).then((r) => r.data);

export const deleteCategory = (id) => client.delete(`/categories/${id}`).then((r) => r.data);

// ---- Commodities & Rates ------------------------------------------------
export const fetchCommodities = (params = {}) =>
  client.get("/commodities", { params }).then((r) => r.data);

export const createCommodity = (payload) =>
  client.post("/commodities", payload).then((r) => r.data);

export const updateCommodity = (id, payload) =>
  client.put(`/commodities/${id}`, payload).then((r) => r.data);

export const setCommodityStatus = (id, status) =>
  client.patch(`/commodities/${id}/status`, { status }).then((r) => r.data);

export const deleteCommodity = (id) => client.delete(`/commodities/${id}`).then((r) => r.data);

export const addCommodityRate = (id, payload) =>
  client.post(`/commodities/${id}/rates`, payload).then((r) => r.data);

export const fetchCommodityRates = (id) =>
  client.get(`/commodities/${id}/rates`).then((r) => r.data);

// ---- Farmers (market-level) ------------------------------------------------
export const fetchFarmers = (params = {}) =>
  client.get("/farmers", { params }).then((r) => r.data);

export const createFarmer = (payload) => client.post("/farmers", payload).then((r) => r.data);

export const updateFarmer = (id, payload) =>
  client.put(`/farmers/${id}`, payload).then((r) => r.data);

export const deleteFarmer = (id) => client.delete(`/farmers/${id}`).then((r) => r.data);

// ---- Vehicles / Gate Entries ----------------------------------------------
// tz_offset lets the server treat "today" as the user's local day (times are stored in UTC).
const tzParam = () => ({ tz_offset: new Date().getTimezoneOffset() });

export const fetchGateEntries = (params = {}) =>
  client.get("/vehicles/gate-entries", { params: { ...tzParam(), ...params } }).then((r) => r.data);

// The vehicle master list -- used to power the Vehicle No autocomplete on
// the entry form (which existing vehicles have visited before).
export const fetchVehicles = (params = {}) =>
  client.get("/vehicles", { params }).then((r) => r.data);

export const logVehicleEntry = (payload) =>
  // tz_offset lets the server number the gate pass with the user's local date.
  client.post("/vehicles/gate-entries/entry", { tz_offset: new Date().getTimezoneOffset(), ...payload }).then((r) => r.data);

export const logVehicleExit = (entryId, payload = {}) =>
  client.post(`/vehicles/gate-entries/${entryId}/exit`, payload).then((r) => r.data);

// ---- Billing (header + line items) ---------------------------------------
export const fetchBills = (params = {}) => client.get("/bills", { params }).then((r) => r.data);

export const createBill = (payload) => client.post("/bills", payload).then((r) => r.data);

export const cancelBill = (id) => client.patch(`/bills/${id}/cancel`).then((r) => r.data);

// ---- Reports ---------------------------------------------------------
export const fetchSalesReport = (params = {}) =>
  client.get("/reports/sales", { params }).then((r) => r.data);

export const fetchGateActivityReport = (params = {}) =>
  client.get("/reports/gate-activity", { params: { ...tzParam(), ...params } }).then((r) => r.data);

// ---- States / Districts / Pincodes (tables: states, districts, pincodes) ----
// Type-ahead: pass what the user typed in q to get the matching rows.
export const fetchStates = (q = "") =>
  client.get("/geo/states", { params: q ? { q } : {} }).then((r) => r.data);

export const fetchDistricts = (stateId, q = "") =>
  client.get("/geo/districts", { params: { state_id: stateId, ...(q ? { q } : {}) } }).then((r) => r.data);

// Is this pincode in the pincodes table for this state + district? -> { valid, error }
export const checkPincode = (stateId, districtId, pincode) =>
  client.get("/geo/pincodes/check", { params: { state_id: stateId, district_id: districtId, pincode } }).then((r) => r.data);
