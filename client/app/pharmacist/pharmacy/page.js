"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  MapPin,
  Phone,
  Save,
  Store,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";

const EMPTY = {
  name: "",
  address: "",
  city: "",
  pincode: "",
  phone: "",
  licenseNumber: "",
  description: "",
  isActive: true,
};

export default function PharmacyProfilePage() {
  const { data, loading, error, refresh } = useApi("/pharmacist/me");
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const pharmacy = data?.pharmacy ?? null;
  const isNew = !pharmacy;

  useEffect(() => {
    if (!data) return;
    if (data.pharmacy) {
      setForm({
        name: data.pharmacy.name ?? "",
        address: data.pharmacy.address ?? "",
        city: data.pharmacy.city ?? "",
        pincode: data.pharmacy.pincode ?? "",
        phone: data.pharmacy.phone ?? "",
        licenseNumber: data.pharmacy.licenseNumber ?? "",
        description: data.pharmacy.description ?? "",
        isActive: data.pharmacy.isActive ?? true,
      });
    }
  }, [data]);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const result = await api.put("/pharmacist/me", {
        ...form,
        description: form.description || "",
      });
      toast.success(
        isNew ? "Pharmacy created" : "Pharmacy updated",
        isNew
          ? `${result.pharmacy.name} is now in the customer directory.`
          : `${result.pharmacy.name} details were saved.`,
      );
      await refresh({ silent: true });
    } catch (err) {
      setFormError(err.message || "Could not save the pharmacy profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading pharmacy profile…" />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <div>
      <PageHeader
        eyebrow="Pharmacy"
        title={isNew ? "Create your pharmacy profile" : "Pharmacy profile"}
        description={
          isNew
            ? "Customers can only find approved, active pharmacies in the directory."
            : "Keep your contact details accurate so customers can reach the right counter."
        }
        actions={
          pharmacy ? (
            <div className="flex flex-wrap gap-2">
              <Badge tone={pharmacy.isApproved ? "emerald" : "amber"}>
                <BadgeCheck className="h-3.5 w-3.5" />
                {pharmacy.isApproved ? "Approved" : "Pending approval"}
              </Badge>
              <Badge tone={pharmacy.isActive ? "brand" : "slate"}>
                {pharmacy.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader
            title={isNew ? "Pharmacy details" : `Editing ${pharmacy.name}`}
            description="Required fields follow the pharmacy registration requirements."
          />
          <form onSubmit={save} className="space-y-5 px-5 py-5 sm:px-6">
            {formError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            ) : null}

            <Field label="Pharmacy name" required>
              <Input
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="e.g. CarePlus Pharmacy"
              />
            </Field>

            <Field label="Address" required>
              <Textarea
                required
                minLength={5}
                maxLength={240}
                rows={2}
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                placeholder="Street, building, area"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" required>
                <Input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.city}
                  onChange={(event) => set("city", event.target.value)}
                  placeholder="e.g. Pune"
                />
              </Field>
              <Field label="Pincode" required>
                <Input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{4,10}"
                  value={form.pincode}
                  onChange={(event) => set("pincode", event.target.value)}
                  placeholder="e.g. 411001"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" required>
                <Input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="License number" required>
                <Input
                  required
                  minLength={3}
                  maxLength={60}
                  value={form.licenseNumber}
                  onChange={(event) => set("licenseNumber", event.target.value)}
                  placeholder="e.g. MH-PN-2026-001"
                />
              </Field>
            </div>

            <Field
              label="Description"
              hint="Optional. Shown on your public pharmacy page."
            >
              <Textarea
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder="Opening hours, services, delivery notes…"
              />
            </Field>

            {!isNew ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
                <Switch
                  checked={form.isActive}
                  onChange={(value) => set("isActive", value)}
                  label="Listed in the customer directory"
                  description="Turn this off to temporarily hide your pharmacy. Existing requests are not affected."
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" loading={saving} icon={Save}>
                {isNew ? "Create pharmacy" : "Save changes"}
              </Button>
              {!isNew ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setForm({
                      name: pharmacy.name ?? "",
                      address: pharmacy.address ?? "",
                      city: pharmacy.city ?? "",
                      pincode: pharmacy.pincode ?? "",
                      phone: pharmacy.phone ?? "",
                      licenseNumber: pharmacy.licenseNumber ?? "",
                      description: pharmacy.description ?? "",
                      isActive: pharmacy.isActive ?? true,
                    });
                    setFormError("");
                  }}
                  disabled={saving}
                >
                  Reset
                </Button>
              ) : null}
              <p className="text-xs text-slate-400">
                License numbers must be unique across TakeCare.
              </p>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          {pharmacy ? (
            <Card>
              <CardHeader title="At a glance" />
              <ul className="divide-y divide-slate-100 text-sm">
                <li className="flex items-center justify-between px-5 py-3 sm:px-6">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Boxes className="h-4 w-4 text-slate-400" />
                    Catalog items
                  </span>
                  <span className="font-semibold text-slate-800">
                    {pharmacy._count?.catalog ?? 0}
                  </span>
                </li>
                <li className="flex items-center justify-between px-5 py-3 sm:px-6">
                  <span className="flex items-center gap-2 text-slate-500">
                    <ClipboardList className="h-4 w-4 text-slate-400" />
                    Total requests
                  </span>
                  <span className="font-semibold text-slate-800">
                    {pharmacy._count?.requests ?? 0}
                  </span>
                </li>
                <li className="flex items-center justify-between px-5 py-3 sm:px-6">
                  <span className="flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Location
                  </span>
                  <span className="text-right font-medium text-slate-800">
                    {pharmacy.city}
                  </span>
                </li>
                <li className="flex items-center justify-between px-5 py-3 sm:px-6">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4 text-slate-400" />
                    Phone
                  </span>
                  <span className="text-right font-medium text-slate-800">
                    {pharmacy.phone}
                  </span>
                </li>
                <li className="flex items-center justify-between px-5 py-3 sm:px-6">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-800">{formatDate(pharmacy.createdAt)}</span>
                </li>
              </ul>
              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/pharmacist/catalog"
                    className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Manage catalog →
                  </Link>
                  <span className="text-slate-300">·</span>
                  <Link
                    href="/pharmacist/requests"
                    className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    View requests →
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-brand-50/80 to-white">
              <div className="px-5 py-5 sm:px-6">
                <Store className="h-6 w-6 text-brand-600" />
                <h2 className="mt-3 text-base font-semibold text-slate-900">
                  Why this matters
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Only approved, active pharmacies appear in the customer directory.
                  Customers can then browse your catalog and send a request with the
                  quantity they need.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  You can accept a request, reject it, or propose a different quantity.
                  Inventory changes only after the customer confirms receipt.
                </p>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Demo tips" />
            <ul className="space-y-2.5 px-5 py-4 text-sm text-slate-600 sm:px-6">
              <li>Sign in as <strong>raghav@takecare.demo</strong> to see a seeded approved pharmacy.</li>
              <li>Seeded password is <strong>Password123!</strong> for every demo account.</li>
              <li>New profiles are auto-approved for the hackathon demo.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
