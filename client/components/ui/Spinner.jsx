import { Loader2 } from "lucide-react";

export default function Spinner({ className = "h-5 w-5" }) {
  return <Loader2 className={`${className} animate-spin text-brand-600`} />;
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-slate-500">
      <Spinner className="h-6 w-6" />
      <span>{label}</span>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-sm font-medium text-slate-500">
        <Spinner className="h-7 w-7" />
        Loading TakeCare…
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4 sm:px-6">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
