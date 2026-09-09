const VARIANT_BY_STATUS = {
  ACTIVE: "pill-green",
  INACTIVE: "pill-grey",
  ENTERED: "pill-green",
  EXITED: "pill-grey",
  FINALIZED: "pill-green",
  DRAFT: "pill-amber",
  CANCELLED: "pill-red",
  SUCCESS: "pill-green",
  FAILED: "pill-red",
};

export default function StatusPill({ status, label }) {
  const variant = VARIANT_BY_STATUS[status] || "pill-blue";
  return <span className={`pill ${variant}`}>{label || status}</span>;
}
