"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { medicineLabel, unitLabel } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge, { StockBadge } from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/ui/Spinner";
import MedicineFormModal from "@/components/MedicineFormModal";
import StockUpdateModal from "@/components/StockUpdateModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function MedicinesPage() {
  const { data, loading, error, refresh } = useApi("/medicines");
  const family = useApi("/family-members");
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockMedicine, setStockMedicine] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const medicines = data?.medicines ?? [];
  const active = medicines.filter((medicine) => medicine.isActive);
  const lowCount = active.filter((medicine) => medicine.lowStock).length;
  const totalEstimated = active.reduce(
    (sum, medicine) => sum + medicine.estimatedStock,
    0,
  );
  const totalConfirmed = active.reduce(
    (sum, medicine) => sum + medicine.confirmedStock,
    0,
  );

  const filtered = useMemo(() => {
    return medicines
      .filter((medicine) => (showInactive ? true : medicine.isActive))
      .filter((medicine) => {
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          medicine.name.toLowerCase().includes(term) ||
          (medicine.strength || "").toLowerCase().includes(term) ||
          (medicine.form || "").toLowerCase().includes(term)
        );
      });
  }, [medicines, search, showInactive]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(medicine) {
    setEditing(medicine);
    setFormOpen(true);
  }

  async function toggleActive() {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      if (toggleTarget.isActive) {
        await api.post(`/medicines/${toggleTarget.id}/deactivate`);
        toast.success("Medicine deactivated", `${toggleTarget.name} is hidden from active stock.`);
      } else {
        await api.post(`/medicines/${toggleTarget.id}/reactivate`);
        toast.success("Medicine reactivated", `${toggleTarget.name} is active again.`);
      }
      setToggleTarget(null);
      await refresh({ silent: true });
    } catch (err) {
      toast.error("Could not update medicine", err.message);
    } finally {
      setToggling(false);
    }
  }

  if (error) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Medicines"
        description="Manage the medicines your household uses. Confirmed stock changes only through recorded transactions."
        actions={
          <Button onClick={openCreate} icon={Plus}>
            Add medicine
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Active medicines</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{active.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-medium text-amber-700">Running low</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{lowCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Estimated units</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalEstimated}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Confirmed units</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalConfirmed}</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search medicines…"
              className="pl-10"
              aria-label="Search medicines"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInactive((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                showInactive
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showInactive ? "Showing inactive" : "Active only"}
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refresh({ silent: true })}
              aria-label="Refresh medicines"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && !data ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Pill}
            title={medicines.length === 0 ? "No medicines yet" : "No matches"}
            description={
              medicines.length === 0
                ? "Add your first medicine with the stock and schedule supplied by your doctor."
                : "Try a different search or include inactive medicines."
            }
            action={
              medicines.length === 0 ? (
                <Button onClick={openCreate} icon={Plus}>
                  Add your first medicine
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((medicine) => (
              <li
                key={medicine.id}
                className={`px-5 py-4 sm:px-6 ${medicine.isActive ? "" : "bg-slate-50/60"}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${
                        medicine.lowStock && medicine.isActive
                          ? "bg-amber-50 text-amber-600 ring-amber-600/10"
                          : "bg-brand-50 text-brand-600 ring-brand-600/10"
                      }`}
                    >
                      <Pill className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {medicineLabel(medicine)}
                        </p>
                        <StockBadge lowStock={medicine.lowStock} active={medicine.isActive} />
                        {medicine.familyMember ? (
                          <Badge tone="slate">{medicine.familyMember.name}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {medicine.form} · {medicine.dailyUnits} {unitLabel(medicine, medicine.dailyUnits)}/day
                        {medicine.dosageSchedule ? ` · ${medicine.dosageSchedule}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center lg:w-72">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Estimated
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">
                        {medicine.estimatedStock}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Confirmed
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">
                        {medicine.confirmedStock}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Threshold
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">
                        {medicine.reorderThreshold}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Link
                      href={`/customer/medicines/${medicine.id}`}
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={() => openEdit(medicine)}
                    >
                      Edit
                    </Button>
                    {medicine.isActive ? (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => setStockMedicine(medicine)}
                      >
                        Update stock
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleTarget(medicine)}
                    >
                      {medicine.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Badge tone="slate">Note</Badge>
        Estimated stock never becomes negative. It resets whenever you record a purchase,
        correction or confirmed receipt.
        <Link href="/customer/assistant" className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700">
          Ask assistant <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <MedicineFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh({ silent: true })}
        medicine={editing}
        familyMembers={family.data?.familyMembers ?? []}
      />

      <StockUpdateModal
        open={Boolean(stockMedicine)}
        onClose={() => setStockMedicine(null)}
        medicine={stockMedicine}
        onSaved={() => refresh({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={toggleActive}
        loading={toggling}
        title={toggleTarget?.isActive ? "Deactivate medicine?" : "Reactivate medicine?"}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget ? medicineLabel(toggleTarget) : "This medicine"} will be hidden from active stock and estimates, but its history is kept.`
            : `${toggleTarget ? medicineLabel(toggleTarget) : "This medicine"} will return to your active inventory.`
        }
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Reactivate"}
        variant={toggleTarget?.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
