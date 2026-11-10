"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  PackageCheck,
  Search,
  Store,
  UserRound,
  XCircle,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { formatDateTime, unitLabel } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import RequestTimeline from "@/components/RequestTimeline";
import { Field, Input, Textarea } from "@/components/ui/Field";

const TABS = [
  { key: "pending", label: "Needs response" },
  { key: "progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

const IN_PROGRESS = [
  "COUNTER_PROPOSED",
  "ACCEPTED",
  "CUSTOMER_ACCEPTED",
  "FULFILLED",
];

export default function PharmacistRequestsPage() {
  const { data, loading, error, refresh } = useApi("/pharmacist/requests");
  const toast = useToast();
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [respondTarget, setRespondTarget] = useState(null);
  const [respondMode, setRespondMode] = useState("ACCEPT");
  const [proposedQuantity, setProposedQuantity] = useState("");
  const [respondNote, setRespondNote] = useState("");
  const [respondError, setRespondError] = useState("");
  const [responding, setResponding] = useState(false);
  const [fulfillTarget, setFulfillTarget] = useState(null);
  const [fulfillNote, setFulfillNote] = useState("");
  const [fulfillError, setFulfillError] = useState("");
  const [fulfilling, setFulfilling] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);

  const requests = data?.requests ?? [];

  const counts = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === "PENDING").length,
      progress: requests.filter((request) => IN_PROGRESS.includes(request.status)).length,
      completed: requests.filter((request) => request.status === "COMPLETED").length,
      all: requests.length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesTab =
        tab === "all"
          ? true
          : tab === "pending"
            ? request.status === "PENDING"
            : tab === "progress"
              ? IN_PROGRESS.includes(request.status)
              : request.status === "COMPLETED";
      if (!matchesTab) return false;
      if (!needle) return true;
      return `${request.medicineName} ${request.strength} ${request.customer?.name} ${request.customer?.email}`
        .toLowerCase()
        .includes(needle);
    });
  }, [requests, tab, query]);

  function openRespond(request, mode) {
    setRespondTarget(request);
    setRespondMode(mode);
    setProposedQuantity(String(request.quantityRequested));
    setRespondNote("");
    setRespondError("");
  }

  function closeRespond() {
    setRespondTarget(null);
    setResponding(false);
  }

  async function submitRespond(event) {
    event.preventDefault();
    if (!respondTarget) return;
    setResponding(true);
    setRespondError("");
    try {
      const payload = { action: respondMode, note: respondNote || "" };
      if (respondMode === "PROPOSE") payload.quantity = Number(proposedQuantity);
      await api.post(`/pharmacist/requests/${respondTarget.id}/respond`, payload);
      const labels = {
        ACCEPT: "Request accepted",
        REJECT: "Request rejected",
        PROPOSE: "Quantity proposed",
      };
      toast.success(labels[respondMode], `${respondTarget.medicineName} was updated.`);
      setRespondTarget(null);
      await refresh({ silent: true });
    } catch (err) {
      setRespondError(err.message || "Could not respond to this request");
    } finally {
      setResponding(false);
    }
  }

  function openFulfill(request) {
    setFulfillTarget(request);
    setFulfillNote("");
    setFulfillError("");
  }

  async function submitFulfill(event) {
    event.preventDefault();
    if (!fulfillTarget) return;
    setFulfilling(true);
    setFulfillError("");
    try {
      await api.post(`/pharmacist/requests/${fulfillTarget.id}/fulfill`, {
        note: fulfillNote || "",
      });
      toast.success(
        "Marked fulfilled",
        `${fulfillTarget.medicineName} is ready for the customer to confirm.`,
      );
      setFulfillTarget(null);
      await refresh({ silent: true });
    } catch (err) {
      setFulfillError(err.message || "Could not mark this request fulfilled");
    } finally {
      setFulfilling(false);
    }
  }

  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const modeCopy = {
    ACCEPT: {
      title: "Accept this request",
      description: "The customer will be told you can supply the requested quantity.",
      confirm: "Accept request",
      variant: "success",
    },
    REJECT: {
      title: "Reject this request",
      description: "The customer will be notified that you cannot fulfil it.",
      confirm: "Reject request",
      variant: "danger",
    },
    PROPOSE: {
      title: "Propose a different quantity",
      description: "The customer must accept your offer before it becomes fulfilable.",
      confirm: "Send proposal",
      variant: "primary",
    },
  }[respondMode];

  return (
    <div>
      <PageHeader
        eyebrow="Pharmacy queue"
        title="Requests"
        description="Respond quickly, propose a realistic quantity, then mark accepted requests fulfilled."
        actions={
          <Link
            href="/pharmacist/catalog"
            className={buttonClasses({ variant: "secondary" })}
          >
            <Store className="h-4 w-4" />
            Catalog
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Needs response"
          value={counts.pending}
          tone={counts.pending > 0 ? "amber" : "emerald"}
          hint="Pending customer requests"
        />
        <StatCard
          icon={PackageCheck}
          label="In progress"
          value={counts.progress}
          tone="violet"
          hint="Accepted or fulfilled"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={counts.completed}
          tone="teal"
          hint="Customer confirmed receipt"
        />
        <StatCard
          icon={ClipboardList}
          label="All requests"
          value={counts.all}
          tone="sky"
          hint="Every request in this pharmacy"
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Request queue"
          description="Oldest requests are shown first once filtered."
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer or medicine…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:w-64"
              />
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5 sm:px-6">
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
            title={tab === "pending" ? "No requests need a response" : "Nothing here yet"}
            description={
              tab === "pending"
                ? "New customer requests will appear here as soon as they arrive."
                : "Try another filter or check back after customers start requesting."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((request) => {
              const finalQty = request.quantityProposed ?? request.quantityRequested;
              const canRespond = request.status === "PENDING";
              const canFulfill = ["ACCEPTED", "CUSTOMER_ACCEPTED"].includes(
                request.status,
              );
              return (
                <li key={request.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {request.customer?.name}
                          </span>
                          <span>{formatDateTime(request.createdAt)}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Requested{" "}
                          <span className="font-medium text-slate-700">
                            {request.quantityRequested} {unitLabel(request, request.quantityRequested)}
                          </span>
                          {request.quantityProposed != null ? (
                            <>
                              {" · "}Proposed{" "}
                              <span className="font-medium text-slate-700">
                                {request.quantityProposed} {unitLabel(request, request.quantityProposed)}
                              </span>
                            </>
                          ) : null}
                          {" · "}Final{" "}
                          <span className="font-semibold text-brand-700">
                            {finalQty} {unitLabel(request, finalQty)}
                          </span>
                        </p>
                        {request.note ? (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            Customer note: “{request.note}”
                          </p>
                        ) : null}
                        {request.pharmacistNote ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Your note: {request.pharmacistNote}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {canRespond ? (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            icon={CheckCircle2}
                            onClick={() => openRespond(request, "ACCEPT")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openRespond(request, "PROPOSE")}
                          >
                            Propose qty
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={XCircle}
                            onClick={() => openRespond(request, "REJECT")}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {canFulfill ? (
                        <Button
                          size="sm"
                          icon={PackageCheck}
                          onClick={() => openFulfill(request)}
                        >
                          Mark fulfilled
                        </Button>
                      ) : null}
                      {request.status === "FULFILLED" ? (
                        <Badge tone="emerald">Waiting for customer</Badge>
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Eye}
                        onClick={() => setDetailTarget(request)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(respondTarget)}
        onClose={closeRespond}
        title={modeCopy.title}
        description={modeCopy.description}
        footer={
          <>
            <Button variant="secondary" onClick={closeRespond} disabled={responding}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="respond-form"
              variant={modeCopy.variant}
              loading={responding}
            >
              {modeCopy.confirm}
            </Button>
          </>
        }
      >
        {respondTarget ? (
          <form id="respond-form" onSubmit={submitRespond} className="space-y-4">
            {respondError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {respondError}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">
                {respondTarget.medicineName}
                {respondTarget.strength ? ` ${respondTarget.strength}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {respondTarget.customer?.name} requested {respondTarget.quantityRequested}{" "}
                {respondTarget.unitLabel}(s).
              </p>
            </div>

            {respondMode === "PROPOSE" ? (
              <Field
                label="Quantity you can offer"
                hint={`Requested quantity: ${respondTarget.quantityRequested}. The customer must accept this before fulfilment.`}
                required
              >
                <Input
                  required
                  type="number"
                  min={1}
                  max={10000}
                  autoFocus
                  value={proposedQuantity}
                  onChange={(event) => setProposedQuantity(event.target.value)}
                />
              </Field>
            ) : null}

            {respondMode === "REJECT" ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700">
                This permanently closes the request. No inventory is changed.
              </div>
            ) : null}

            <Field
              label="Note to customer"
              hint="Optional. Shared in the request timeline."
            >
              <Textarea
                rows={2}
                maxLength={300}
                value={respondNote}
                onChange={(event) => setRespondNote(event.target.value)}
                placeholder={
                  respondMode === "REJECT"
                    ? "e.g. Out of stock until Monday"
                    : respondMode === "PROPOSE"
                      ? "e.g. We can supply a partial strip today"
                      : "e.g. Ready for pickup after 5 pm"
                }
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(fulfillTarget)}
        onClose={() => setFulfillTarget(null)}
        title="Mark request fulfilled"
        description="The customer confirms receipt before any inventory changes."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFulfillTarget(null)}
              disabled={fulfilling}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="fulfill-form"
              variant="success"
              loading={fulfilling}
              icon={PackageCheck}
            >
              Mark fulfilled
            </Button>
          </>
        }
      >
        {fulfillTarget ? (
          <form id="fulfill-form" onSubmit={submitFulfill} className="space-y-4">
            {fulfillError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {fulfillError}
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">
                {fulfillTarget.medicineName}
                {fulfillTarget.strength ? ` ${fulfillTarget.strength}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {fulfillTarget.customer?.name} ·{" "}
                {fulfillTarget.quantityProposed ?? fulfillTarget.quantityRequested}{" "}
                {unitLabel(
                  fulfillTarget,
                  fulfillTarget.quantityProposed ?? fulfillTarget.quantityRequested,
                )}{" "}
                handed over.
              </p>
            </div>
            <Field label="Handover note" hint="Optional, such as pickup instructions.">
              <Textarea
                rows={2}
                maxLength={300}
                value={fulfillNote}
                onChange={(event) => setFulfillNote(event.target.value)}
                placeholder="e.g. Collected at the counter by the customer"
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="Request details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetailTarget(null)}>
            Close
          </Button>
        }
      >
        {detailTarget ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-900">
                {detailTarget.medicineName}
                {detailTarget.strength ? ` ${detailTarget.strength}` : ""}
              </p>
              <StatusBadge status={detailTarget.status} />
            </div>
            <RequestTimeline status={detailTarget.status} />
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Customer</dt>
                <dd className="text-right font-medium text-slate-800">
                  {detailTarget.customer?.name}
                  <span className="block text-xs font-normal text-slate-400">
                    {detailTarget.customer?.email}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Requested</dt>
                <dd className="font-medium text-slate-800">
                  {detailTarget.quantityRequested}{" "}
                  {unitLabel(detailTarget, detailTarget.quantityRequested)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Proposed</dt>
                <dd className="font-medium text-slate-800">
                  {detailTarget.quantityProposed != null
                    ? `${detailTarget.quantityProposed} ${unitLabel(detailTarget, detailTarget.quantityProposed)}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-right text-slate-700">
                  {formatDateTime(detailTarget.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Responded</dt>
                <dd className="text-right text-slate-700">
                  {detailTarget.respondedAt
                    ? formatDateTime(detailTarget.respondedAt)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Fulfilled</dt>
                <dd className="text-right text-slate-700">
                  {detailTarget.fulfilledAt
                    ? formatDateTime(detailTarget.fulfilledAt)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Receipt confirmed</dt>
                <dd className="text-right text-slate-700">
                  {detailTarget.completedAt
                    ? formatDateTime(detailTarget.completedAt)
                    : "—"}
                </dd>
              </div>
              {detailTarget.inventoryAppliedAt ? (
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500">Inventory applied</dt>
                  <dd className="text-right font-medium text-emerald-700">
                    {formatDateTime(detailTarget.inventoryAppliedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
            {detailTarget.note ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Customer note
                </p>
                <p className="mt-1 text-sm text-slate-700">{detailTarget.note}</p>
              </div>
            ) : null}
            {detailTarget.pharmacistNote ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pharmacist note
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {detailTarget.pharmacistNote}
                </p>
              </div>
            ) : null}
            {detailTarget.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => {
                    setDetailTarget(null);
                    openRespond(detailTarget, "ACCEPT");
                  }}
                >
                  Accept request
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDetailTarget(null);
                    openRespond(detailTarget, "PROPOSE");
                  }}
                >
                  Propose quantity
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
