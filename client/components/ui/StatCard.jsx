const TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-600/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/10",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/10",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/10",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        {Icon ? (
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${TONES[tone] ?? TONES.brand}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
