import { REQUEST_STATUS } from "@/lib/format";

const TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-600/15",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default function Badge({ tone = "slate", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone] ?? TONES.slate} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = "" }) {
  const meta = REQUEST_STATUS[status] ?? { label: status, tone: "slate" };
  return (
    <Badge tone={meta.tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </Badge>
  );
}

export function StockBadge({ lowStock, active = true }) {
  if (!active) return <Badge tone="slate">Inactive</Badge>;
  if (lowStock)
    return (
      <Badge tone="amber">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Low stock
      </Badge>
    );
  return (
    <Badge tone="emerald">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      In stock
    </Badge>
  );
}
