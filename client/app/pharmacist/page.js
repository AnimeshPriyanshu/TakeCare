"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  Clock3,
  PackageCheck,
  Store,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/AuthContext";
import { formatNumber, timeAgo } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";

export default function PharmacistDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useApi("/dashboard/pharmacist");

  if (loading && !data) return <LoadingBlock label="Loading your pharmacy overview…" />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (data.needsPharmacy) {
    return (
      <div>
        <PageHeader
          eyebrow="Pharmacist overview"
          title={`Welcome, ${firstName}`}
          description="Create your pharmacy profile to start receiving replenishment requests from customers."
        />
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-8 text-white sm:px-10 sm:py-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Store className="h-3.5 w-3.5" />
              One step to go
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Set up your pharmacy profile
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-50">
              Your approved, active pharmacy appears in the customer directory. Once it is
              live, customers can browse your catalog and send replenishment requests.
            </p>
            <Link
              href="/pharmacist/pharmacy"
              className={buttonClasses({
                variant: "secondary",
                className: "mt-6",
              })}
            >
              Create pharmacy profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 px-6 py-6 sm:grid-cols-3 sm:px-10">
            {[
              {
                icon: Store,
                title: "1. Profile",
                copy: "Add your address, phone and license number.",
              },
              {
                icon: Boxes,
                title: "2. Catalog",
                copy: "List the medicines and quantities you stock.",
              },
              {
                icon: ClipboardList,
                title: "3. Requests",
                copy: "Accept, reject or propose a different quantity.",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <Icon className="h-5 w-5 text-brand-600" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {step.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const { pharmacy, stats, recentRequests, lowCatalog, recentActivity } = data;

  const needsResponse = recentRequests.filter((request) => request.status === "PENDING");
  const fulfilmentQueue = recentRequests.filter((request) =>
    ["ACCEPTED", "CUSTOMER_ACCEPTED"].includes(request.status),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Pharmacist overview"
        title={`Good to see you, ${firstName}`}
        description={`${pharmacy.name} · ${pharmacy.city}. Respond to customers and keep your catalog accurate.`}
        actions={
          <>
            <Link
              href="/pharmacist/catalog"
              className={buttonClasses({ variant: "secondary" })}
            >
              <Boxes className="h-4 w-4" />
              Catalog
            </Link>
            <Link href="/pharmacist/requests" className={buttonClasses()}>
              <ClipboardList className="h-4 w-4" />
              Requests
            </Link>
          </>
        }
      />

      {!pharmacy.isApproved || !pharmacy.isActive ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {!pharmacy.isApproved
                  ? "Your pharmacy is pending approval"
                  : "Your pharmacy is currently inactive"}
              </p>
              <p className="text-xs text-amber-700">
                {!pharmacy.isApproved
                  ? "Customers cannot find you in the directory yet. You can still prepare your catalog."
                  : "Activate your profile so customers can find you again."}
              </p>
            </div>
          </div>
          <Link
            href="/pharmacist/pharmacy"
            className={buttonClasses({
              size: "sm",
              variant: "secondary",
              className: "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
            })}
          >
            Manage profile
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Awaiting response"
          value={formatNumber(stats.pendingRequests)}
          tone={stats.pendingRequests > 0 ? "amber" : "emerald"}
          hint="Customers waiting for a decision"
        />
        <StatCard
          icon={PackageCheck}
          label="Active requests"
          value={formatNumber(stats.activeRequests)}
          tone="violet"
          hint={`${stats.completedRequests} completed in view`}
        />
        <StatCard
          icon={Boxes}
          label="Catalog items"
          value={formatNumber(stats.catalogItems)}
          tone="sky"
          hint={`${formatNumber(stats.totalUnits)} units available`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Catalog warnings"
          value={formatNumber(stats.lowCatalogCount)}
          tone={stats.lowCatalogCount > 0 ? "amber" : "emerald"}
          hint="Below 10 units or unavailable"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Needs your response"
              description="New requests are first come, first served."
              action={
                <Link
                  href="/pharmacist/requests"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  All requests
                </Link>
              }
            />
            {needsResponse.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No pending requests"
                description="New customer requests will appear here as soon as they arrive."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {needsResponse.map((request) => (
                  <li key={request.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {request.medicineName}
                          {request.strength ? ` ${request.strength}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {request.customer?.name} · {request.quantityRequested}{" "}
                          {request.unitLabel}(s) · {timeAgo(request.createdAt)}
                        </p>
                      </div>
                      <Link
                        href="/pharmacist/requests"
                        className={buttonClasses({ size: "sm" })}
                      >
                        Respond
                      </Link>
                    </div>
                    {request.note ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        “{request.note}”
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Ready to fulfil"
              description="Accepted requests waiting to be handed over."
              action={
                <Link
                  href="/pharmacist/requests"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Open queue
                </Link>
              }
            />
            {fulfilmentQueue.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="Nothing to hand over"
                description="Accepted requests will wait here until you mark them fulfilled."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {fulfilmentQueue.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {request.medicineName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {request.customer?.name} ·{" "}
                        {request.quantityProposed ?? request.quantityRequested}{" "}
                        {request.unitLabel}(s)
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Catalog warnings"
              description="Availability is visible to customers."
              action={
                <Link
                  href="/pharmacist/catalog"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Manage
                </Link>
              }
            />
            {lowCatalog.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="Catalog looks healthy"
                description="Every listed medicine has at least 10 units available."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lowCatalog.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name}
                        {item.strength ? ` ${item.strength}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.isAvailable
                          ? `${item.quantityAvailable} ${item.unitLabel}(s) left`
                          : "Marked unavailable"}
                      </p>
                    </div>
                    <Badge tone={item.isAvailable ? "amber" : "slate"}>
                      {item.isAvailable ? "Low" : "Off"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent activity" />
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Catalog and request actions will show up here."
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

          <Card className="bg-slate-50/60">
            <div className="px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Public listing
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Store className="h-4 w-4 text-slate-400" />
                {pharmacy.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {pharmacy.isApproved && pharmacy.isActive
                  ? "Visible in the customer pharmacy directory."
                  : "Hidden from the customer directory."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={pharmacy.isApproved ? "emerald" : "amber"}>
                  {pharmacy.isApproved ? "Approved" : "Pending approval"}
                </Badge>
                <Badge tone={pharmacy.isActive ? "emerald" : "slate"}>
                  {pharmacy.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Stats reflect the latest requests and catalog availability.
      </p>
    </div>
  );
}
