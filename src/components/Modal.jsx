export default function Modal({ open, title, onClose, children, footer, maxWidth = "520px" }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(18,40,28,0.45)] flex items-center justify-center z-[100] p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-xl w-full shadow-2xl max-h-[88vh] overflow-y-auto"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="m-0 text-[15px] font-bold">{title}</h3>
          <button
            className="bg-transparent border-none text-inksoft text-lg cursor-pointer leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-between items-center px-5 pb-5 pt-1 gap-2.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
