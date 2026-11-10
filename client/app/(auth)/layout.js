import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import Logo from "@/components/ui/Logo";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr,1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col">
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="glow absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-500/30" />
        <div className="glow absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-teal-400/20" />

        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Logo href="/" light />

          <div className="my-auto max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-200">
              <Sparkles className="h-3.5 w-3.5" />
              One account. Honest stock. Confirmed refills.
            </div>
            <h2 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
              Care for the medicines your family relies on.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              TakeCare keeps estimated and confirmed stock separate, connects you with
              registered pharmacies and asks before anything changes.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                "Estimated stock recalculated from your latest confirmed baseline",
                "A complete, guarded replenishment workflow",
                "A grounded assistant that never invents availability",
                "No calls, no auto-orders and no dosage recommendations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-brand-400" />
            Demo build · seeded accounts are available on the sign-in screen
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col bg-white">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="lg:hidden">
            <Logo href="/" />
          </div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="px-5 pb-8 text-center text-xs text-slate-400 sm:px-8">
          TakeCare is a hackathon MVP. Inventory estimates are not medical advice.
        </div>
      </div>
    </div>
  );
}
