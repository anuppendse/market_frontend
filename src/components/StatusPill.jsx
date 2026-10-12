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

export default function StatusPill({ status, label, onClick }) {
  const variant = VARIANT_BY_STATUS[status] || "pill-blue";

  // When onClick is provided, render as a clickable button (same look as
  // the plain pill) so the status itself toggles ACTIVE <-> INACTIVE.
  if (onClick) {
    return (
      <button
        type="button"
        className={`pill pill-clickable ${variant}`}
        onClick={onClick}
        title="Click to toggle status"
      >
        {label || status}
      </button>
    );
  }

  return <span className={`pill ${variant}`}>{label || status}</span>;
}
