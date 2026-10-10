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
