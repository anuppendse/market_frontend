// Shared Day/Week/Month/Year range helpers used by any page with the
// "Date range" filter (Gatekeeper Report, Vehicle Entry Log). Centralized
// so a fix only needs to happen once.

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function todayISOWeek() {
  const d = new Date();
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to this week's Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatPretty(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ISO week ("YYYY-Www") -> [mondayDateStr, sundayDateStr]
export function isoWeekToRange(weekValue) {
  const [yearStr, weekStr] = weekValue.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dow + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

// "YYYY-MM" -> [firstOfMonth, lastOfMonth]
export function monthToRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return [from, to];
}

export function yearToRange(year) {
  return [`${year}-01-01`, `${year}-12-31`];
}

// Builds { date_from, date_to, label } for a given period + its raw input
// value. Returns null if the period's value isn't set yet (so callers can
// no-op instead of silently applying an empty filter).
export function resolvePeriod(period, { dayFromValue, dayToValue, weekValue, monthValue, yearValue }) {
  if (period === "day") {
    if (!dayFromValue || !dayToValue) return null;
    const label =
      dayFromValue === dayToValue
        ? formatPretty(dayFromValue)
        : `${formatPretty(dayFromValue)} — ${formatPretty(dayToValue)}`;
    return { date_from: dayFromValue, date_to: dayToValue, label };
  }
  if (period === "week") {
    if (!weekValue) return null;
    const [date_from, date_to] = isoWeekToRange(weekValue);
    return { date_from, date_to, label: `${formatPretty(date_from)} — ${formatPretty(date_to)}` };
  }
  if (period === "month") {
    if (!monthValue) return null;
    const [date_from, date_to] = monthToRange(monthValue);
    const label = new Date(date_from + "T00:00:00").toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    return { date_from, date_to, label };
  }
  if (period === "year") {
    if (!yearValue) return null;
    const [date_from, date_to] = yearToRange(yearValue);
    return { date_from, date_to, label: String(yearValue) };
  }
  return null;
}
