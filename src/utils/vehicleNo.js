// Indian vehicle registration number: 2 letters (state), 1-2 digits (RTO
// code), 1-3 letters (series), 4 digits (unique number). e.g. MH14AB1234.
const VEHICLE_NO_PATTERN = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

// Strips spaces/hyphens and uppercases, so "mh 14 ab 1234", "MH-14-AB-1234"
// and "MH14AB1234" are treated as the same value everywhere: validation,
// matching against existing vehicles, and what actually gets stored.
export function normalizeVehicleNo(vehicleNo) {
  return (vehicleNo || "").replace(/[\s-]/g, "").toUpperCase();
}

export function isValidVehicleNo(vehicleNo) {
  return VEHICLE_NO_PATTERN.test(normalizeVehicleNo(vehicleNo));
}

// Returns an error message for the Vehicle No field, or "" if it's valid.
// Empty input gets its own message rather than the pattern one.
export function vehicleNoError(vehicleNo) {
  if (!vehicleNo || !vehicleNo.trim()) return "Vehicle number is required.";
  if (!isValidVehicleNo(vehicleNo)) return "Please enter a valid vehicle number (e.g., MH14AB1234).";
  return "";
}
