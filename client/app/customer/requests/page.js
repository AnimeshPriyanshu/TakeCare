"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  Store,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import {
  ACTIVE_REQUEST_STATUSES,
  formatDate,
  isActiveRequest,
  REQUEST_STATUS,
} from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/ui/Spinner";

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

export default function RequestsPage() {
  const { data, loading, error, refresh } = useApi("/requests");
  const [tab, setTab] = useState("all");

  const requests = data?.requests ?? [];

  const counts = useMemo(
    () => ({
      all: requests.length,
      active: requests.filter((request) => isActiveRequest(request.status)).length,
      completed: requests.filter((request) => request.status === "COMPLETED").length,
      closed: requests.filter((request) =>
        ["REJECTED", "CUSTOMER_DECLINED", "CANCELLED"].includes(request.status),
      ).length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    if (tab === "active")
      return requests.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.status));
    if (tab === "completed")
      return requests.filter((request) => request.status === "COMPLETED");
    if (tab === "closed")
      return requests.filter((request) =>
        ["REJECTED", "CUSTOMER_DECLINED", "CANCELLED"].includes(request.status),
      );
    return requests;
  }, [requests, tab]);

  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const awaitingReceipt = requests.filter((request) => request.status === "FULFILLED");

  return (
    <div>
      <PageHeader
        eyebrow="Replenishment"
        title="Requests"
        description="Track every request from submission through pharmacist response, fulfilment and your final receipt confirmation."
        actions={
          <Link href="/customer/pharmacies" className={buttonClasses()}>
            <MapPin className="h-4 w-4" />
            New request
          </Link>
        }
      />

      {awaitingReceipt.length > 0 ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                {awaitingReceipt.length} request{awaitingReceipt.length === 1 ? "" : "s"} ready
                to confirm
              </p>
              <p className="text-xs text-emerald-700">
                Confirm receipt to add the received quantity to your confirmed stock.
              </p>
            </div>
          </div>
          <Link
            href={`/customer/requests/${awaitingReceipt[0].id}`}
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className: "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
            })}
          >
            Review
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-3 sm:px-6">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === item.key
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {item.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === item.key ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"}`}
              >
                {counts[item.key]}
              </span>
            </button>
          ))}
        </div>

        {loading && !data ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={tab === "all" ? "No requests yet" : `No ${tab} requests`}
            description={
              tab === "all"
                ? "Browse registered pharmacies and start a request when you need a refill."
                : "Requests will appear here as their status changes."
            }
            action={
              tab === "all" ? (
                <Link href="/customer/pharmacies" className={buttonClasses({ size: "sm" })}>
                  Browse pharmacies
                </Link>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((request) => {
              const meta = REQUEST_STATUS[request.status] ?? {};
              const quantity = request.quantityProposed ?? request.quantityRequested;
              return (
                <li key={request.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {request.medicineName}
                            {request.strength ? ` ${request.strength}` : ""}
                          </p>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Store className="h-3.5 w-3.5" />
                            {request.pharmacy?.name}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(request.createdAt)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Requested {request.quantityRequested} {request.unitLabel}(s)
                          {request.quantityProposed != null &&
                          request.quantityProposed !== request.quantityRequested
                            ? ` · pharmacist proposed ${request.quantityProposed}`
                            : ""}
                          {" · "}
                          final {quantity}
                        </p>
                        {meta.description ? (
                          <p className="mt-1 text-[11px] text-slate-400">{meta.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Link
                        href={`/customer/requests/${request.id}`}
                        className={buttonClasses({
                          size: "sm",
                          variant:
                            request.status === "FULFILLED" ? "success" : "secondary",
                        })}
                      >
                        {request.status === "FULFILLED" ? "Confirm receipt" : "View"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
