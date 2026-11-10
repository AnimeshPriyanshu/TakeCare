import Link from "next/link";
import { Plus } from "lucide-react";

export default function Logo({ href = "/", compact = false, light = false }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm shadow-brand-600/30 transition group-hover:bg-brand-700">
        <Plus className="h-6 w-6" strokeWidth={2.8} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span
            className={`text-lg font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}
          >
            TakeCare
          </span>
          <span
            className={`mt-1 text-[11px] font-medium uppercase tracking-[0.18em] ${light ? "text-white/60" : "text-slate-400"}`}
          >
            Care, connected
          </span>
        </span>
      ) : null}
    </Link>
  );
}
