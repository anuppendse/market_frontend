// Shared helpers for the Reports pages: turn report "sections" into cell
// text (so currency symbols and units are preserved) and download them as
// an Excel-openable file. PDF export reuses the browser print flow via the
// ReportPrintSheet component, exactly like the Gate Keeper report did.
//
// A section is: { title, columns: [{ key, header, render? }], rows: [] }

export function cellText(column, row) {
  const value = column.render ? column.render(row) : row[column.key];
  return value == null ? "" : String(value);
}

export function hasRecords(sections) {
  return sections.some((s) => s.rows.length > 0);
}

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Excel opens HTML tables saved as .xls, which lets one file hold a heading,
// the period, and several report tables without adding an XLSX library.
export function downloadExcel({ reportTitle, periodLabel, sections, filename }) {
  const parts = [
    `<h2>${esc("APMC Billing System")}</h2>`,
    `<h3>${esc(reportTitle)}</h3>`,
    `<p>${esc(periodLabel ? `Period: ${periodLabel}` : "Period: All available days")}</p>`,
  ];
  sections
    .filter((s) => s.rows.length > 0)
    .forEach((s) => {
      parts.push(`<h4>${esc(s.title)}</h4>`);
      parts.push(
        `<table border="1"><thead><tr>${s.columns.map((c) => `<th>${esc(c.header)}</th>`).join("")}</tr></thead><tbody>` +
          s.rows
            .map((r) => `<tr>${s.columns.map((c) => `<td>${esc(cellText(c, r))}</td>`).join("")}</tr>`)
            .join("") +
          `</tbody></table><br/>`
      );
    });

  const html =
    `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>` +
    parts.join("") +
    `</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportFilename(base, periodLabel) {
  const suffix = periodLabel ? periodLabel.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") : "all";
  return `${base}_${suffix}.xls`;
}
