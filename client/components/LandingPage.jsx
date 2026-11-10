"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Pill,
  ShieldCheck,
  Sparkles,
  Store,
  Stethoscope,
  TrendingDown,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { buttonClasses } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/hooks/AuthContext";

const FEATURES = [
  {
    icon: TrendingDown,
    title: "Estimated stock, explained",
    description:
      "Confirmed stock plus your daily usage gives a live estimate — never negative, and never confused with a physical count.",
  },
  {
    icon: BellRing,
    title: "Low-stock alerts",
    description:
      "Set a reorder threshold per medicine and get notified when the estimate reaches it.",
  },
  {
    icon: MapPin,
    title: "Registered pharmacies",
    description:
      "Browse active, approved pharmacies, inspect their catalog and availability, then start a request.",
  },
  {
    icon: ClipboardCheck,
    title: "Controlled replenishment",
    description:
      "Requests move through clear statuses. You confirm receipt before inventory is updated — exactly once.",
  },
  {
    icon: BrainCircuit,
    title: "Grounded AI assistant",
    description:
      "Ask about stock, low medicines, requests or pharmacy availability. It reads live data and asks before changing anything.",
  },
  {
    icon: ShieldCheck,
    title: "No dosage decisions",
    description:
      "TakeCare tracks the schedule you enter. It never recommends, changes or interprets a prescribed dosage.",
  },
];

const STEPS = [
  {
    title: "Add your medicines",
    description: "Enter confirmed stock, daily usage, the schedule supplied by your doctor and a reorder threshold.",
  },
  {
    title: "See the estimate",
    description: "TakeCare estimates remaining units from the last confirmed baseline. Confirm purchases or corrections when they happen.",
  },
  {
    title: "Choose a pharmacy",
    description: "Search registered pharmacies, view their listed availability and pick the medicine you need.",
  },
  {
    title: "Request and respond",
    description: "The pharmacist accepts, rejects or proposes a different quantity. You accept or decline.",
  },
  {
    title: "Confirm receipt",
    description: "Only when you confirm receipt does your confirmed inventory update — protected against duplicate writes.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const dashboardHref =
    user?.role === "PHARMACIST" ? "/pharmacist" : "/customer";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              How it works
            </a>
            <a href="#pharmacies" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              For pharmacies
            </a>
            <a href="#demo" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Demo access
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <Link href={dashboardHref} className={buttonClasses({ size: "md" })}>
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${buttonClasses({ variant: "ghost", size: "md" })} hidden sm:inline-flex`}
                >
                  Sign in
                </Link>
                <Link href="/register" className={buttonClasses({ size: "md" })}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950">
          <div className="hero-grid absolute inset-0 opacity-40" />
          <div className="glow absolute -left-24 top-0 h-80 w-80 rounded-full bg-brand-500/30" />
          <div className="glow absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-teal-400/20" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-200">
                <Sparkles className="h-3.5 w-3.5" />
                AI-assisted medicine care, grounded in your data
              </div>
              <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Never run out of the medicines that matter.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                TakeCare keeps an honest estimate of your family&apos;s medicine stock and
                connects you with registered pharmacies for a confirmed, traceable refill
                — without a single phone call.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={user ? dashboardHref : "/register"}
                  className={buttonClasses({
                    size: "lg",
                    className: "bg-white text-slate-900 hover:bg-slate-100",
                  })}
                >
                  {user ? "Open my workspace" : "Create a free account"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className={buttonClasses({
                    variant: "ghost",
                    size: "lg",
                    className: "border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
                  })}
                >
                  Explore the demo
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                {[
                  "No phone calls",
                  "No automatic orders",
                  "No dosage advice",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-brand-500/20 to-teal-300/10 blur-xl" />
              <div className="relative rounded-3xl border border-white/10 bg-white p-5 shadow-2xl shadow-black/30 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Today&apos;s overview
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      Aarav&apos;s medicines
                    </p>
                  </div>
                  <Badge tone="brand">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    Live estimate
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-xs font-medium text-slate-500">Active medicines</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">6</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3.5">
                    <p className="text-xs font-medium text-amber-700">Running low</p>
                    <p className="mt-1 text-2xl font-bold text-amber-800">1</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {[
                    { name: "Metformin 500 mg", units: "20 left", low: false },
                    { name: "Amlodipine 5 mg", units: "3 left · reorder", low: true },
                    { name: "Atorvastatin 10 mg", units: "38 left", low: false },
                  ].map((medicine) => (
                    <div
                      key={medicine.name}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${medicine.low ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"}`}
                      >
                        <Pill className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {medicine.name}
                        </p>
                        <p className="text-xs text-slate-500">{medicine.units}</p>
                      </div>
                      {medicine.low ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          Low
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/70 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    TakeCare assistant
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    &ldquo;Amlodipine is at 3 tablets, below your threshold of 5.
                    CarePlus Pharmacy lists 80 tablets available. Want to review a
                    request?&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { value: "2", label: "Role-based workspaces" },
              { value: "9", label: "Request statuses guarded" },
              { value: "0", label: "Calls or auto-orders" },
              { value: "1x", label: "Inventory write per receipt" },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              Built for the whole loop
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              A clearer way to stay stocked
            </h2>
            <p className="mt-3 text-base text-slate-500">
              Inventory estimation, pharmacy discovery and a controlled replenishment
              workflow in one place.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-950 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.9fr,1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
                  The workflow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  From estimate to confirmed stock
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-400">
                  Every step has an explicit owner and a clear status. Estimated
                  consumption never touches your confirmed inventory, and only you can
                  confirm a purchase.
                </p>
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-brand-400" />
                    Safety by design
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                      Backend-enforced ownership and role checks
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                      Database transactions for every inventory change
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                      Assistant never fabricates or changes stock on its own
                    </li>
                  </ul>
                </div>
              </div>

              <ol className="relative space-y-3">
                {STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-300 ring-1 ring-inset ring-brand-400/20">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="pharmacies" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
                <Stethoscope className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                For customers & families
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Keep one honest view of household medicines, see what is running low and
                replenish from registered pharmacies without phone calls.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                {[
                  "Estimated vs confirmed stock, side by side",
                  "Per-medicine reorder thresholds and history",
                  "Family member profiles for shared inventories",
                  "AI assistant that asks before saving changes",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={user?.role === "CUSTOMER" ? "/customer" : "/register?role=customer"}
                className={`${buttonClasses({ className: "mt-6" })}`}
              >
                {user?.role === "CUSTOMER" ? "Open customer dashboard" : "Start as a customer"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
                <Store className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">
                For registered pharmacists
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Publish your catalog, keep availability current and manage incoming
                replenishment requests from a focused workspace.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                {[
                  "Pharmacy profile shown only when active and approved",
                  "Catalog quantities and availability you control",
                  "Accept, reject or propose a different quantity",
                  "Fulfilment and customer-confirmation status tracking",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={user?.role === "PHARMACIST" ? "/pharmacist" : "/register?role=pharmacist"}
                className={`${buttonClasses({ variant: "secondary", className: "mt-6" })}`}
              >
                {user?.role === "PHARMACIST" ? "Open pharmacist dashboard" : "Register a pharmacy"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="demo" className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              <div className="grid gap-8 p-8 lg:grid-cols-[1fr,1.1fr] lg:p-10">
                <div>
                  <Badge tone="brand">
                    <Sparkles className="h-3.5 w-3.5" />
                    Hackathon demo
                  </Badge>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                    Walk straight into a populated workspace
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Seeded accounts include medicines, low-stock alerts, catalog items
                    and requests at different stages — including one ready for the
                    final receipt confirmation.
                  </p>
                  <div className="mt-5 flex flex-col gap-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      Demo password: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">Password123!</code>
                    </p>
                  </div>
                  <Link href="/login" className={buttonClasses({ className: "mt-6" })}>
                    Sign in to the demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Customer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Aarav Sharma
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      aarav@takecare.demo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pharmacist
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Raghav · CarePlus
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      raghav@takecare.demo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Second customer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Meera Sharma
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      meera@takecare.demo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Second pharmacist
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Sana · GreenLeaf
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      sana@takecare.demo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-brand-600 py-14">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 text-center sm:px-6 lg:flex-row lg:text-left">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Ready to see TakeCare in action?
              </h2>
              <p className="mt-1 text-sm text-brand-100">
                Open the seeded demo and follow the guided workflow.
              </p>
            </div>
            <Link
              href={user ? dashboardHref : "/login"}
              className={buttonClasses({
                size: "lg",
                className: "bg-white text-brand-700 hover:bg-brand-50",
              })}
            >
              {user ? "Open dashboard" : "Sign in to demo"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <p className="text-xs text-slate-500">
            A hackathon MVP. Inventory estimates are not medical advice. TakeCare never
            recommends dosages or places orders automatically.
          </p>
        </div>
      </footer>
    </div>
  );
}
