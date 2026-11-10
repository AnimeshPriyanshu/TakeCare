"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  History,
  Pencil,
  Pill,
  Plus,
  TrendingDown,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import {
  formatDateTime,
  medicineLabel,
  TRANSACTION_META,
  unitLabel,
} from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge, { StockBadge } from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import MedicineFormModal from "@/components/MedicineFormModal";
import StockUpdateModal from "@/components/StockUpdateModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function MedicineDetailPage() {
  const params = useParams();
  const id = params.id;
  const { data, loading, error, refresh } = useApi(`/medicines/${id}`);
  const family = useApi("/family-members");
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (loading && !data) return <LoadingBlock label="Loading medicine…" />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!data?.medicine) return null;

  const { medicine, history = [] } = data;

  async function toggleActive() {
    setToggling(true);
    try {
      if (medicine.isActive) {
        await api.post(`/medicines/${medicine.id}/deactivate`);
        toast.success("Medicine deactivated", `${medicine.name} is no longer active.`);
      } else {
        await api.post(`/medicines/${medicine.id}/reactivate`);
        toast.success("Medicine reactivated", `${medicine.name} is active again.`);
      }
      setToggleOpen(false);
      await refresh({ silent: true });
    } catch (err) {
      toast.error("Could not update medicine", err.message);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <Link
        href="/customer/medicines"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to medicines
      </Link>

      <PageHeader
        eyebrow="Medicine details"
        title={medicineLabel(medicine)}
        description={`${medicine.form} · ${medicine.dailyUnits} ${unitLabel(medicine, medicine.dailyUnits)} per day · last confirmed ${formatDateTime(medicine.lastConfirmedAt)}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => setFormOpen(true)}
            >
              Edit
            </Button>
            {medicine.isActive ? (
              <Button icon={Plus} onClick={() => setStockOpen(true)}>
                Update stock
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setToggleOpen(true)}>
              {medicine.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StockBadge lowStock={medicine.lowStock} active={medicine.isActive} />
        {medicine.familyMember ? (
          <Badge tone="slate">For {medicine.familyMember.name}</Badge>
        ) : (
          <Badge tone="slate">For you</Badge>
        )}
        <Badge tone="brand">{medicine.form}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Estimated stock</p>
            <TrendingDown className="h-4 w-4 text-brand-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {medicine.estimatedStock}
            <span className="ml-1 text-sm font-medium text-slate-400">
              {unitLabel(medicine, medicine.estimatedStock)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {medicine.elapsedDays} day(s) since confirmation
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Confirmed stock</p>
            <Pill className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {medicine.confirmedStock}
            <span className="ml-1 text-sm font-medium text-slate-400">
              {unitLabel(medicine, medicine.confirmedStock)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Physical baseline you confirmed</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Daily usage</p>
            <CalendarClock className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {medicine.dailyUnits}
            <span className="ml-1 text-sm font-medium text-slate-400">
              {unitLabel(medicine, medicine.dailyUnits)}/day
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {medicine.daysRemaining != null
              ? `About ${medicine.daysRemaining} day(s) remaining`
              : "No daily consumption entered"}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-700">Reorder threshold</p>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-800">
            {medicine.reorderThreshold}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Low-stock alert when the estimate reaches this number
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card>
          <CardHeader
            title="Details"
            description="The schedule and settings you supplied."
          />
          <dl className="divide-y divide-slate-100">
            {[
              ["Medicine", medicineLabel(medicine)],
              ["Form", medicine.form],
              ["Unit", medicine.unitLabel],
              ["Reorder threshold", `${medicine.reorderThreshold} ${unitLabel(medicine, medicine.reorderThreshold)}`],
              ["Last confirmed", formatDateTime(medicine.lastConfirmedAt)],
              ["Added", formatDateTime(medicine.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6"
              >
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-800">{value}</dd>
              </div>
            ))}
            <div className="px-5 py-4 sm:px-6">
              <dt className="text-sm text-slate-500">Dosage schedule (your note)</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-800">
                {medicine.dosageSchedule || "No schedule entered."}
              </dd>
              <p className="mt-2 text-xs text-slate-400">
                TakeCare stores this note only. It does not recommend or change dosages.
              </p>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Stock history"
            description="Every confirmed change, newest first."
            action={
              medicine.isActive ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setStockOpen(true)}
                >
                  Add transaction
                </Button>
              ) : null
            }
          />
          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="No transactions yet"
              description="Purchases and corrections will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((transaction) => {
                const meta = TRANSACTION_META[transaction.type] ?? {
                  label: transaction.type,
                  tone: "slate",
                };
                const positive = transaction.quantityChange >= 0;
                return (
                  <li key={transaction.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span
                          className={`text-sm font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {positive ? "+" : ""}
                          {transaction.quantityChange}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(transaction.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {transaction.previousStock} → {transaction.newStock}{" "}
                      {unitLabel(medicine, transaction.newStock)} confirmed
                    </p>
                    {transaction.note ? (
                      <p className="mt-1 text-xs text-slate-500">{transaction.note}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Need to replenish {medicine.name}?
          </p>
          <p className="text-xs text-slate-500">
            Find a registered pharmacy that lists this medicine and send a request.
          </p>
        </div>
        <Link href="/customer/pharmacies" className={buttonClasses({ size: "sm" })}>
          Browse pharmacies
        </Link>
      </div>

      <MedicineFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh({ silent: true })}
        medicine={medicine}
        familyMembers={family.data?.familyMembers ?? []}
      />
      <StockUpdateModal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        medicine={medicine}
        onSaved={() => refresh({ silent: true })}
      />
      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={toggleActive}
        loading={toggling}
        title={medicine.isActive ? "Deactivate medicine?" : "Reactivate medicine?"}
        description={
          medicine.isActive
            ? "The medicine will be hidden from active stock estimates. Existing history and requests are kept."
            : "The medicine will return to your active inventory and estimates."
        }
        confirmLabel={medicine.isActive ? "Deactivate" : "Reactivate"}
        variant={medicine.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
