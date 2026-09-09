export default function KpiCard({ label, value, tone }) {
  const toneClass = tone === "amber" ? "text-amber-600" : tone === "red" ? "text-brand-red" : "text-green-900";
  return (
    <div className="card p-4">
      <div className="text-[12px] text-inksoft mb-1.5">{label}</div>
      <div className={`text-[22px] font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
