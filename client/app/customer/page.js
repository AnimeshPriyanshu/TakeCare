"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  MapPin,
  Package,
  Pill,
  Plus,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/AuthContext";
import { formatNumber, medicineLabel, timeAgo } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";

const ACTIVITY_TONES = {
  PURCHASE: "emerald",
  CORRECTION: "amber",
  MEDICINE_ADDED: "brand",
  MEDICINE_UPDATED: "sky",
  MEDICINE_DEACTIVATED: "slate",
  REQUEST_CREATED: "violet",
  REQUEST_RESPONDED: "sky",
  REQUEST_FULFILLED: "emerald",
  REQUEST_COMPLETED: "teal",
  PROPOSAL_ACCEPTED: "indigo",
  PROPOSAL_DECLINED: "slate",
  REQUEST_CANCELLED: "slate",
};

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useApi("/dashboard/customer");

  if (loading && !data) return <LoadingBlock label="Loading your care overview…" />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const { stats, lowStock, activeRequests, recentActivity } = data;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        eyebrow="Customer overview"
        title={`Good to see you, ${firstName}`}
        description="A live view of your family's medicine estimate, low-stock signals and replenishment activity."
        actions={
          <>
            <Link
              href="/customer/medicines"
              className={buttonClasses({ variant: "secondary" })}
            >
              <Pill className="h-4 w-4" />
              Medicines
            </Link>
            <Link href="/customer/assistant" className={buttonClasses()}>
              <Sparkles className="h-4 w-4" />
              Ask the assistant
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Pill}
          label="Active medicines"
          value={formatNumber(stats.activeMedicines)}
          hint="In your household inventory"
        />
        <StatCard
          icon={AlertTriangle}
          label="Medicines running low"
          value={formatNumber(stats.lowStockCount)}
          tone={stats.lowStockCount > 0 ? "amber" : "emerald"}
          hint="Estimated at or below threshold"
        />
        <StatCard
          icon={Package}
          label="Estimated units"
          value={formatNumber(stats.totalEstimatedUnits)}
          tone="sky"
          hint={`Confirmed baseline: ${formatNumber(stats.totalConfirmedUnits)} units`}
        />
        <StatCard
          icon={ClipboardList}
          label="Active requests"
          value={formatNumber(stats.activeRequests)}
          tone="violet"
          hint={`${stats.pendingRequests} awaiting pharmacist response`}
        />
      </div>

      {lowStock.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {lowStock.length} medicine{lowStock.length === 1 ? "" : "s"} need attention
              </p>
              <p className="text-xs text-amber-700">
                {lowStock
                  .slice(0, 3)
                  .map((medicine) => medicineLabel(medicine))
                  .join(" · ")}
              </p>
            </div>
          </div>
          <Link
            href="/customer/requests"
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className: "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
            })}
          >
            Review requests
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader
            title="Low-stock watchlist"
            description="Estimates update from your latest confirmed stock."
            action={
              <Link
                href="/customer/medicines"
                className="text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Manage
              </Link>
            }
          />
          {lowStock.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="Nothing is running low"
              description="Your estimated stock is above every reorder threshold. We'll notify you when that changes."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((medicine) => {
                const ratio = Math.min(
                  100,
                  Math.round(
                    (medicine.estimatedStock /
                      Math.max(1, medicine.reorderThreshold * 2)) *
                      100,
                  ),
                );
                return (
                  <li key={medicine.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {medicineLabel(medicine)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {medicine.form} · {medicine.dailyUnits} {medicine.unitLabel}
                          /day · {medicine.familyMember?.name || "You"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-700">
                          {medicine.estimatedStock}
                          <span className="ml-1 text-xs font-medium text-slate-400">
                            est. {medicine.unitLabel}s
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          threshold {medicine.reorderThreshold}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${Math.max(6, ratio)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/customer/medicines/${medicine.id}`}
                        className={buttonClasses({
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        View details
                      </Link>
                      <Link
                        href="/customer/pharmacies"
                        className={buttonClasses({ variant: "subtle", size: "sm" })}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Find pharmacy
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Active replenishment requests"
              description="Requests that still need action or delivery."
              action={
                <Link
                  href="/customer/requests"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  All
                </Link>
              }
            />
            {activeRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No active requests"
                description="Browse registered pharmacies and start a request when you need a refill."
                action={
                  <Link href="/customer/pharmacies" className={buttonClasses({ size: "sm" })}>
                    Browse pharmacies
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {activeRequests.map((request) => (
                  <li key={request.id}>
                    <Link
                      href={`/customer/requests/${request.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50 sm:px-6"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <ClipboardList className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {request.medicineName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {request.finalQuantity} {request.unitLabel}(s) ·{" "}
                          {request.pharmacy?.name}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent activity" description="Your latest inventory and request events." />
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Add a medicine to start building your history."
              />
            ) : (
              <ul className="space-y-0 px-5 py-3 sm:px-6">
                {recentActivity.map((activity, index) => (
                  <li key={activity.id} className="relative flex gap-3 pb-4">
                    {index < recentActivity.length - 1 ? (
                      <span className="absolute left-[13px] top-6 h-full w-px bg-slate-200" />
                    ) : null}
                    <span className="relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500 ring-4 ring-brand-50" />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-slate-700">
                        {activity.message}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {timeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/customer/medicines",
            icon: Plus,
            title: "Add medicine",
            copy: "Track a new prescription",
          },
          {
            href: "/customer/pharmacies",
            icon: MapPin,
            title: "Find pharmacy",
            copy: "Search registered pharmacies",
          },
          {
            href: "/customer/requests",
            icon: ClipboardList,
            title: "Track requests",
            copy: "Respond and confirm receipt",
          },
          {
            href: "/customer/assistant",
            icon: Sparkles,
            title: "Ask assistant",
            copy: "Ground your next decision",
          },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                <p className="truncate text-xs text-slate-500">{action.copy}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-600" />
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Badge tone="brand">How estimates work</Badge>
            <p className="text-xs leading-relaxed text-slate-500">
              Estimated stock = confirmed stock − (daily units × days since last
              confirmation), never below zero. Only confirmed purchases, corrections or
              receipt confirmations change the baseline.
            </p>
          </div>
          <Link
            href="/customer/assistant"
            className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            Ask about your stock →
          </Link>
        </div>
      </div>
    </div>
  );
}
