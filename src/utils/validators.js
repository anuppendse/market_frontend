// Shared field validators. Each returns an error string, or "" when valid.

const LETTERS_AND_SPACES = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const MOBILE_PATTERN = /^[6-9][0-9]{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSITIVE_NUMBER = /^[0-9]+(\.[0-9]{1,2})?$/;

// Trims and collapses repeated spaces: "  john   doe " -> "john doe".
export function cleanName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function driverNameError(value) {
  const v = cleanName(value);
  if (!v) return "Driver name is required";
  if (!LETTERS_AND_SPACES.test(v)) return "Driver name can contain only letters and spaces";
  return "";
}

// Optional field: empty is fine. Otherwise a positive number, > 0.
export function weightError(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (!POSITIVE_NUMBER.test(v)) return "Enter a valid weight";
  if (Number(v) <= 0) return "Weight must be greater than 0";
  return "";
}

export function fullNameError(value) {
  const v = cleanName(value);
  if (!v) return "Full name is required";
  if (!LETTERS_AND_SPACES.test(v)) return "Full name can contain only letters and spaces";
  return "";
}

export function mobileError(value) {
  const v = (value || "").trim();
  if (!v) return "Mobile number is required";
  if (!MOBILE_PATTERN.test(v)) return "Enter a valid mobile number";
  return "";
}

export function emailError(value) {
  const v = (value || "").trim();
  if (!v) return "Email is required";
  if (!EMAIL_PATTERN.test(v)) return "Enter a valid email address";
  return "";
}

// Confirm Password is only required once a new password has been typed.
export function confirmPasswordError(password, confirm) {
  if (!password) return "";
  if (!confirm) return "Confirm password is required";
  if (password !== confirm) return "Passwords do not match";
  return "";
}

// ---------------------------------------------------------------------------
// Additional shared validators (same contract: error string, or "" if valid).
// ---------------------------------------------------------------------------

const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9._]*$/;
const PERSON_NAME_PATTERN = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*\.?$/;
const PLACE_NAME_PATTERN = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const BUSINESS_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,&'()/-]*$/;
const MARKET_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;
const GATE_PASS_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const AMOUNT_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;
const MAX_AMOUNT = 99999999.99;

export function lengthError(label, value, min, max) {
  const v = (value || "").length;
  if (v < min) return `${label} must be at least ${min} characters`;
  if (v > max) return `${label} must not exceed ${max} characters`;
  return "";
}

export function requiredSelectError(label, value) {
  return value === "" || value === null || value === undefined ? `Please select ${label}` : "";
}

// Username: 4-30 chars, starts with a letter, then letters/digits/dot/underscore.
export function usernameError(value) {
  const v = (value || "").trim();
  if (!v) return "Username is required";
  if (v.length < 4 || v.length > 30) return "Username must be 4 to 30 characters";
  if (!USERNAME_PATTERN.test(v)) {
    return "Username must start with a letter and contain only letters, numbers, dots and underscores";
  }
  return "";
}

// Password policy: 8-64 chars with upper, lower, digit and special character,
// no spaces. Pass required=false to allow blank (e.g. "leave blank to keep").
export function passwordError(value, required = true) {
  const v = value || "";
  if (!v) return required ? "Password is required" : "";
  if (v.length < 8) return "Password must be at least 8 characters";
  if (v.length > 64) return "Password must not exceed 64 characters";
  if (/\s/.test(v)) return "Password must not contain spaces";
  if (!/[A-Z]/.test(v)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(v)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(v)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(v)) return "Password must include a special character";
  return "";
}

// Person name (farmer / shop owner): letters with single spaces, dots,
// apostrophes or hyphens between words. 2-60 chars.
export function personNameError(label, value) {
  const v = cleanName(value);
  if (!v) return `${label} is required`;
  if (v.length < 2 || v.length > 60) return `${label} must be 2 to 60 characters`;
  if (!PERSON_NAME_PATTERN.test(v)) return `${label} can contain only letters, spaces, dots, apostrophes and hyphens`;
  return "";
}

// Business / master-data name (shop, market, commodity, category). 2-100 chars.
export function businessNameError(label, value) {
  const v = cleanName(value);
  if (!v) return `${label} is required`;
  if (v.length < 2 || v.length > 100) return `${label} must be 2 to 100 characters`;
  if (!BUSINESS_NAME_PATTERN.test(v)) return `${label} contains invalid characters`;
  if (!/[A-Za-z]/.test(v)) return `${label} must contain letters (not only numbers)`;
  return "";
}

// City / state / village. Required unless optional=true.
export function placeNameError(label, value, optional = false) {
  const v = cleanName(value);
  if (!v) return optional ? "" : `${label} is required`;
  if (v.length < 2 || v.length > 50) return `${label} must be 2 to 50 characters`;
  if (!PLACE_NAME_PATTERN.test(v)) return `${label} can contain only letters, spaces, dots, apostrophes and hyphens`;
  return "";
}

export function marketCodeError(value) {
  const v = (value || "").trim();
  if (!v) return "Market code is required";
  if (v.length < 3 || v.length > 20) return "Market code must be 3 to 20 characters";
  if (!MARKET_CODE_PATTERN.test(v)) return "Market code can contain only capital letters, numbers and hyphens (e.g. PUNE-APMC)";
  return "";
}

export function addressError(value) {
  const v = cleanName(value);
  if (!v) return "Address is required";
  if (v.length < 5 || v.length > 200) return "Address must be 5 to 200 characters";
  return "";
}

export function pincodeError(value) {
  const v = (value || "").trim();
  if (!v) return "Pincode is required";
  if (!PINCODE_PATTERN.test(v)) return "Enter a valid 6-digit pincode";
  return "";
}

// Optional free-text description with a length cap.
export function descriptionError(value, max = 200) {
  const v = cleanName(value);
  if (v.length > max) return `Description must not exceed ${max} characters`;
  return "";
}

// Optional mobile: blank is fine, otherwise must be a valid number.
export function optionalMobileError(value) {
  return (value || "").trim() ? mobileError(value) : "";
}

// Commission percentage: 0-100, up to 2 decimals.
export function commissionError(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Commission is required";
  if (!AMOUNT_PATTERN.test(v)) return "Enter a valid commission percentage";
  if (Number(v) > 100) return "Commission cannot exceed 100%";
  return "";
}

// Money / quantity: a number with up to 2 decimals. allowZero=false means
// the value must be > 0. Blank is an error unless required=false.
export function amountError(label, value, { required = true, allowZero = false } = {}) {
  const v = String(value ?? "").trim();
  if (!v) return required ? `${label} is required` : "";
  const n = Number(v);
  if (!Number.isFinite(n)) return `Enter a valid ${label.toLowerCase()}`;
  // Negative values (and zero, unless allowed) get a clear "greater than 0" message
  // instead of the generic "invalid" one.
  if (n < 0 || (n === 0 && !allowZero)) {
    return allowZero ? `${label} cannot be negative` : `${label} must be greater than 0`;
  }
  if (!AMOUNT_PATTERN.test(v)) return `Enter a valid ${label.toLowerCase()} (up to 2 decimal places)`;
  if (n > MAX_AMOUNT) return `${label} is too large`;
  return "";
}

// Optional gate pass number, e.g. GP-1001.
export function gatePassError(value) {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.length > 30) return "Gate pass number must not exceed 30 characters";
  if (!GATE_PASS_PATTERN.test(v)) return "Gate pass number can contain only letters, numbers and hyphens";
  return "";
}

export function hasErrors(errs) {
  return Object.values(errs).some(Boolean);
}

// Market fees: a number greater than 0.
export function marketFeeError(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Market fees is required";
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "Market fees must be a number";
  if (!(Number(v) > 0)) return "Market fees must be greater than 0";
  return "";
}
