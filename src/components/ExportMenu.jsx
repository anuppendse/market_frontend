import { useEffect, useRef, useState } from "react";
import { downloadExcel, hasRecords, reportFilename } from "../utils/reportExport";

/**
 * The "Export PDF/Excel" button. Clicking it offers PDF or Excel; both
 * export exactly the sections/rows currently shown on the page (i.e. the
 * applied date range). If there is nothing to export, a message is shown
 * instead of producing an empty file.
 */
export default function ExportMenu({ reportTitle, periodLabel, sections, filenameBase }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function guard() {
    if (!hasRecords(sections)) {
      setNotice("No records found for the selected period.");
      return false;
    }
    setNotice("");
    setOpen(false);
    return true;
  }

  function exportPdf() {
    if (guard()) window.print();
  }

  function exportExcel() {
    if (!guard()) return;
    downloadExcel({
      reportTitle,
      periodLabel,
      sections,
      filename: reportFilename(filenameBase, periodLabel),
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-primary"
        onClick={() => {
          setNotice("");
          setOpen((o) => !o);
        }}
      >
        Export PDF/Excel
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-20 bg-white border border-line rounded-card shadow-2xl p-3 w-[200px]">
          <div className="flex flex-col gap-2">
            <button type="button" className="btn btn-outline" onClick={exportPdf}>Export as PDF</button>
            <button type="button" className="btn btn-outline" onClick={exportExcel}>Export as Excel</button>
          </div>
          {notice && <div className="text-[11.5px] text-brand-red mt-2">{notice}</div>}
        </div>
      )}
    </div>
  );
}
