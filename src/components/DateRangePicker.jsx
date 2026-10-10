import { useEffect, useRef, useState } from "react";
import { todayISO, todayISOWeek, resolvePeriod } from "../utils/dateRanges";

const PERIODS = [
  { id: "day", label: "Day Wise" },
  { id: "week", label: "Week Wise" },
  { id: "month", label: "Month Wise" },
  { id: "year", label: "Year Wise" },
];

/**
 * onApply(period, date_from, date_to, label) is called when the user
 * applies a valid filter. onClear() is called when they clear it.
 * appliedLabel is shown on the trigger button once a filter is active.
 */
export default function DateRangePicker({ onApply, onClear, appliedLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const [period, setPeriod] = useState(null);
  const [error, setError] = useState("");
  // Every period gets a real default value up front -- this is what was
  // missing for "week" before, which let Apply silently no-op.
  const [dayFromValue, setDayFromValue] = useState(todayISO());
  const [dayToValue, setDayToValue] = useState(todayISO());
  const [weekValue, setWeekValue] = useState(todayISOWeek());
  const [monthValue, setMonthValue] = useState(todayISO().slice(0, 7));
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleApply() {
    if (period === "day" && dayFromValue && dayToValue && dayFromValue > dayToValue) {
      setError("From Date cannot be later than To Date");
      return;
    }
    if (period === "year" && !/^(20[0-9]{2}|2100)$/.test(String(yearValue))) {
      setError("Enter a valid year (2000–2100)");
      return;
    }
    setError("");
    const resolved = resolvePeriod(period, { dayFromValue, dayToValue, weekValue, monthValue, yearValue });
    if (!resolved) return;
    setOpen(false);
    onApply(period, resolved.date_from, resolved.date_to, resolved.label);
  }

  function handleClear() {
    setError("");
    setPeriod(null);
    setOpen(false);
    onClear();
  }

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-outline" onClick={() => setOpen((o) => !o)}>
        📅 {appliedLabel || "Date range"}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-20 bg-white border border-line rounded-card shadow-2xl p-4 w-[300px]">
          <div className="flex gap-1.5 flex-wrap mb-3.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id);
                  setError("");
                }}
                className={`text-[12px] font-semibold rounded-full px-3 py-1 border ${
                  period === p.id
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-[#F3F6F2] text-ink border-line"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === "day" && (
            <div className="field mb-3.5">
              <label>From Date</label>
              <input type="date" value={dayFromValue} onChange={(e) => { setDayFromValue(e.target.value); setError(""); }} />
            </div>
          )}

          {period === "day" && (
            <div className="field mb-3.5">
              <label>To Date</label>
              <input type="date" value={dayToValue} onChange={(e) => { setDayToValue(e.target.value); setError(""); }} />
            </div>
          )}

          {period === "week" && (
            <div className="field mb-3.5">
              <label>Select Week</label>
              <input type="week" value={weekValue} onChange={(e) => setWeekValue(e.target.value)} />
            </div>
          )}

          {period === "month" && (
            <div className="field mb-3.5">
              <label>Select Month</label>
              <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
            </div>
          )}

          {period === "year" && (
            <div className="field mb-3.5">
              <label>Select Year</label>
              <input
                type="number"
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                min="2000"
                max="2100"
              />
            </div>
          )}

          {error && <div className="text-[11.5px] text-brand-red mb-2.5">{error}</div>}

          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" disabled={!period} onClick={handleApply}>
              Apply
            </button>
            <button type="button" className="btn btn-outline" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
