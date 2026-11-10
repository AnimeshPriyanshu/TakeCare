"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { formatCurrency, medicineLabel } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";

function AvailabilityBadge({ item }) {
  if (!item.isAvailable || item.quantityAvailable <= 0) {
    return <Badge tone="rose">Out of stock</Badge>;
  }
  return (
    <Badge tone="emerald">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {item.quantityAvailable} {item.unitLabel}(s) available
    </Badge>
  );
}

export default function PharmacyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const toast = useToast();
  const { data, loading, error, refresh } = useApi(`/pharmacies/${id}`);
  const medicinesApi = useApi("/medicines");

  const [selectedItem, setSelectedItem] = useState(null);
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const pharmacy = data?.pharmacy;
  const activeMedicines = useMemo(
    () => (medicinesApi.data?.medicines ?? []).filter((medicine) => medicine.isActive),
    [medicinesApi.data],
  );

  useEffect(() => {
    if (!selectedItem) return;
    const exact = activeMedicines.find(
      (medicine) =>
        medicine.name.toLowerCase() === selectedItem.name.toLowerCase() &&
        (medicine.strength || "").toLowerCase() ===
          (selectedItem.strength || "").toLowerCase(),
    );
    const byName = activeMedicines.find(
      (medicine) => medicine.name.toLowerCase() === selectedItem.name.toLowerCase(),
    );
    setMedicineId((exact || byName)?.id ?? "");
    setQuantity("1");
    setNote("");
    setFormError("");
  }, [selectedItem, activeMedicines]);

  async function submitRequest(event) {
    event.preventDefault();
    if (!medicineId) {
      setFormError("Choose which of your medicines this request is for.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const result = await api.post("/requests", {
        pharmacyId: pharmacy.id,
        medicineId,
        pharmacyMedicineId: selectedItem?.id ?? null,
        quantityRequested: Number(quantity),
        note,
      });
      toast.success(
        "Request sent",
        `${pharmacy.name} will review your request for ${result.request.medicineName}.`,
      );
      setSelectedItem(null);
      router.push(`/customer/requests/${result.request.id}`);
    } catch (err) {
      setFormError(err.message || "Could not submit the request");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading pharmacy…" />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;
  if (!pharmacy) return null;

  const catalog = pharmacy.catalog ?? [];

  return (
    <div>
      <Link
        href="/customer/pharmacies"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pharmacies
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-slate-950 p-6 sm:p-8">
          <div className="hero-grid absolute inset-0 opacity-30" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
                <Store className="h-7 w-7" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    {pharmacy.name}
                  </h1>
                  <Badge tone="emerald">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Approved
                  </Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                  <MapPin className="h-4 w-4" />
                  {pharmacy.address}, {pharmacy.city} {pharmacy.pincode}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                  <Phone className="h-4 w-4" />
                  {pharmacy.phone}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <p className="font-semibold text-white">Availability is pharmacist-reported</p>
              <p className="mt-0.5">A request does not reserve stock.</p>
            </div>
          </div>
          {pharmacy.description ? (
            <p className="relative mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
              {pharmacy.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Listed medicines"
            description={`${catalog.length} item(s) in this pharmacy's catalog.`}
            action={
              <Badge tone="brand">
                <ShoppingBag className="h-3.5 w-3.5" />
                Availability supplied by pharmacist
              </Badge>
            }
          />
          {catalog.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No medicines listed"
              description="This pharmacy has not published any catalog items yet."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {catalog.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.strength ? `${item.name} ${item.strength}` : item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.form} · {item.unitLabel}
                        {item.price != null ? ` · ${formatCurrency(item.price)} per unit` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <AvailabilityBadge item={item} />
                    <Button
                      size="sm"
                      variant={item.isAvailable && item.quantityAvailable > 0 ? "primary" : "secondary"}
                      onClick={() => setSelectedItem(item)}
                    >
                      Request
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p className="text-xs leading-relaxed text-sky-800">
          TakeCare never places an order automatically. You submit a request, the pharmacist
          responds, and your confirmed inventory updates only after you confirm receipt.
        </p>
      </div>

      <Modal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Start a replenishment request"
        description={
          selectedItem
            ? `${selectedItem.name}${selectedItem.strength ? ` ${selectedItem.strength}` : ""} · ${pharmacy.name}`
            : ""
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedItem(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="request-form" loading={submitting}>
              Send request
            </Button>
          </>
        }
      >
        {activeMedicines.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Add the medicine to your inventory first</p>
            <p className="mt-1 text-xs">
              Requests must reference one of your active medicines so we can update the
              right stock after you confirm receipt.
            </p>
            <Link
              href="/customer/medicines"
              className={buttonClasses({ size: "sm", className: "mt-3" })}
            >
              Go to medicines
            </Link>
          </div>
        ) : (
          <form id="request-form" onSubmit={submitRequest} className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            ) : null}

            <Field
              label="Which of your medicines is this for?"
              hint="The confirmed stock will update after you confirm receipt."
              required
            >
              <Select
                value={medicineId}
                onChange={(event) => setMedicineId(event.target.value)}
                required
              >
                <option value="">Select a medicine</option>
                {activeMedicines.map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {medicineLabel(medicine)} · {medicine.estimatedStock} est.
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Quantity requested" required>
              <Input
                type="number"
                min="1"
                max="10000"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>

            <Field label="Note for the pharmacist" hint="Optional.">
              <Textarea
                rows={3}
                maxLength={300}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Monthly refill, please confirm availability."
              />
            </Field>

            {selectedItem ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Pharmacist lists{" "}
                <span className="font-semibold text-slate-900">
                  {selectedItem.quantityAvailable} {selectedItem.unitLabel}(s)
                </span>{" "}
                available. The request is not an order or a reservation.
              </div>
            ) : null}
          </form>
        )}
      </Modal>
    </div>
  );
}
