"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  Pill,
  Store,
  XCircle,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { formatDateTime, REQUEST_STATUS, unitLabel } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import RequestTimeline from "@/components/RequestTimeline";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function CustomerRequestDetailPage() {
  const params = useParams();
  const id = params.id;
  const { data, loading, error, refresh } = useApi(`/requests/${id}`);
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  if (loading && !data) return <LoadingBlock label="Loading request…" />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!data?.request) return null;

  const request = data.request;
  const meta = REQUEST_STATUS[request.status] ?? {};
  const finalQuantity = request.quantityProposed ?? request.quantityRequested;

  async function runAction(action) {
    setActionLoading(action);
    try {
      const endpoints = {
        accept: "accept-proposal",
        decline: "decline-proposal",
        cancel: "cancel",
        confirm: "confirm-receipt",
      };
      await api.post(`/requests/${request.id}/${endpoints[action]}`);
      const messages = {
        accept: ["Offer accepted", "The pharmacist can now mark your request fulfilled."],
        decline: ["Offer declined", "This request is now closed."],
        cancel: ["Request cancelled", "No inventory was changed."],
        confirm: [
          "Receipt confirmed",
          `${finalQuantity} ${unitLabel(request, finalQuantity)} added to your confirmed stock exactly once.`,
        ],
      };
      toast.success(...messages[action]);
      setConfirmAction(null);
      await refresh({ silent: true });
    } catch (err) {
      toast.error("Could not complete the action", err.message);
    } finally {
      setActionLoading("");
    }
  }

  const canCancel = request.status === "PENDING";
  const canRespondProposal = request.status === "COUNTER_PROPOSED";
  const canConfirm = request.status === "FULFILLED";
  const isWaitingPharmacist = ["ACCEPTED", "CUSTOMER_ACCEPTED"].includes(request.status);

  return (
    <div>
      <Link
        href="/customer/requests"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to requests
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {request.medicineName}
              {request.strength ? ` ${request.strength}` : ""}
            </h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            {meta.description} Created {formatDateTime(request.createdAt)}.
          </p>
        </div>
        {request.medicineId ? (
          <Link
            href={`/customer/medicines/${request.medicineId}`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Pill className="h-4 w-4" />
            View medicine
          </Link>
        ) : null}
      </div>

      <Card className="p-5 sm:p-6">
        <RequestTimeline status={request.status} />
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Request summary" />
            <dl className="divide-y divide-slate-100">
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Pharmacy</dt>
                <dd className="text-right font-medium text-slate-800">
                  {request.pharmacy?.name}
                  <span className="block text-xs font-normal text-slate-400">
                    {request.pharmacy?.city}
                  </span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Requested quantity</dt>
                <dd className="font-medium text-slate-800">
                  {request.quantityRequested} {unitLabel(request, request.quantityRequested)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Pharmacist offer</dt>
                <dd className="font-medium text-slate-800">
                  {request.quantityProposed != null
                    ? `${request.quantityProposed} ${unitLabel(request, request.quantityProposed)}`
                    : "Not provided"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Final quantity</dt>
                <dd className="font-semibold text-brand-700">
                  {finalQuantity} {unitLabel(request, finalQuantity)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Responded</dt>
                <dd className="text-right text-slate-700">
                  {request.respondedAt ? formatDateTime(request.respondedAt) : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Fulfilled</dt>
                <dd className="text-right text-slate-700">
                  {request.fulfilledAt ? formatDateTime(request.fulfilledAt) : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <dt className="text-slate-500">Receipt confirmed</dt>
                <dd className="text-right text-slate-700">
                  {request.completedAt ? formatDateTime(request.completedAt) : "—"}
                </dd>
              </div>
            </dl>
          </Card>

          {request.note || request.pharmacistNote ? (
            <Card>
              <CardHeader title="Notes" />
              <div className="space-y-3 px-5 py-4 text-sm sm:px-6">
                {request.note ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Your note
                    </p>
                    <p className="mt-1 text-slate-700">{request.note}</p>
                  </div>
                ) : null}
                {request.pharmacistNote ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pharmacist note
                    </p>
                    <p className="mt-1 text-slate-700">{request.pharmacistNote}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Pharmacy details" />
            <div className="space-y-2 px-5 py-4 text-sm text-slate-700 sm:px-6">
              <p className="flex items-center gap-2 font-medium">
                <Store className="h-4 w-4 text-slate-400" />
                {request.pharmacy?.name}
              </p>
              <p className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4 text-slate-400" />
                {request.pharmacy?.address}, {request.pharmacy?.city}
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-brand-100 bg-gradient-to-br from-brand-50/80 to-white">
            <CardHeader title="What happens next" />
            <div className="px-5 py-4 sm:px-6">
              {canRespondProposal ? (
                <div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <p className="text-sm font-semibold text-violet-900">
                      The pharmacist proposed a different quantity
                    </p>
                    <p className="mt-1 text-sm text-violet-700">
                      You requested {request.quantityRequested}{" "}
                      {unitLabel(request, request.quantityRequested)}; they can offer{" "}
                      <span className="font-semibold">
                        {request.quantityProposed}{" "}
                        {unitLabel(request, request.quantityProposed)}
                      </span>
                      .
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="success"
                      className="flex-1"
                      loading={actionLoading === "accept"}
                      onClick={() => runAction("accept")}
                      icon={CheckCircle2}
                    >
                      Accept offer
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      loading={actionLoading === "decline"}
                      onClick={() => runAction("decline")}
                      icon={XCircle}
                    >
                      Decline offer
                    </Button>
                  </div>
                </div>
              ) : canConfirm ? (
                <div>
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        The pharmacy marked this fulfilled
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                        When you confirm receipt, {finalQuantity}{" "}
                        {unitLabel(request, finalQuantity)} will be added to{" "}
                        {request.medicineName}&apos;s confirmed stock. This is protected
                        against duplicate updates.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="success"
                    size="lg"
                    className="mt-4 w-full"
                    loading={actionLoading === "confirm"}
                    onClick={() => setConfirmAction("confirm")}
                    icon={PackageCheck}
                  >
                    Confirm receipt
                  </Button>
                </div>
              ) : canCancel ? (
                <div>
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Waiting for the pharmacist
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-700">
                        You can cancel while the request is still pending. No inventory
                        will be affected.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="mt-4 w-full"
                    loading={actionLoading === "cancel"}
                    onClick={() => setConfirmAction("cancel")}
                  >
                    Cancel request
                  </Button>
                </div>
              ) : isWaitingPharmacist ? (
                <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                  <div>
                    <p className="text-sm font-semibold text-sky-900">
                      Waiting for fulfilment
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-sky-700">
                      The pharmacist accepted the quantity. Once they mark the request
                      fulfilled, you can confirm receipt.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      This request is closed
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      No further action is needed. You can start a new request from the
                      pharmacy directory.
                    </p>
                    <Link
                      href="/customer/pharmacies"
                      className={buttonClasses({
                        size: "sm",
                        variant: "secondary",
                        className: "mt-3",
                      })}
                    >
                      Browse pharmacies
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
            TakeCare does not place orders or change prescribed dosages. The pharmacist
            confirms availability; you confirm what you physically received.
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === "confirm"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runAction("confirm")}
        loading={actionLoading === "confirm"}
        title="Confirm you received this medicine?"
        description={`This will add ${finalQuantity} ${unitLabel(request, finalQuantity)} to ${request.medicineName}. The update can only happen once.`}
        confirmLabel="Yes, update my stock"
        variant="success"
      />
      <ConfirmDialog
        open={confirmAction === "cancel"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runAction("cancel")}
        loading={actionLoading === "cancel"}
        title="Cancel this request?"
        description="The pharmacist will no longer see it as pending. No inventory will change."
        confirmLabel="Cancel request"
        variant="danger"
      />
    </div>
  );
}
