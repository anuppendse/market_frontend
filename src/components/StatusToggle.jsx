// A compact rounded toggle-switch control for ACTIVE / INACTIVE status,
// matching the green/red switch design used across the app. Sized to hug
// the text (not a fixed wide pill) so it stays small in dense tables.
//
// Used EVERYWHERE a row has an ACTIVE/INACTIVE status -- Shops, Commodities,
// Categories, Farmers -- on every dashboard (Admin, Market Admin,
// Shopkeeper). Pass onClick + disabled=false only for the role that is
// allowed to change it (Market Admin); everyone else gets it rendered with
// disabled (no onClick), so it's still the same control, just view-only.
export default function StatusToggle({ status, onClick, disabled }) {
  const isActive = status === "ACTIVE";
  const knob = (
    <span
      className={`w-[12px] h-[12px] rounded-full shrink-0 border-2 border-white ${
        isActive ? "bg-transparent" : "bg-white"
      }`}
    />
  );

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? undefined : "Click to toggle status"}
      className={`inline-flex items-center w-fit h-[19px] rounded-full border-none px-1 gap-1 font-bold text-[9px] tracking-wide text-white transition-colors ${
        isActive ? "bg-[#3BA757]" : "bg-[#E0432B]"
      } ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
    >
      {isActive ? (
        <>
          <span>ACTIVE</span>
          {knob}
        </>
      ) : (
        <>
          {knob}
          <span>INACTIVE</span>
        </>
      )}
    </button>
  );
}
