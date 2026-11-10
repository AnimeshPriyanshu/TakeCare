"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { LoadingBlock, SkeletonRows } from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input, Select, Switch } from "@/components/ui/Field";

const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Other"];

const EMPTY_FORM = {
  name: "",
  strength: "",
  form: "Tablet",
  unitLabel: "tablet",
  quantityAvailable: "",
  price: "",
  isAvailable: true,
};

export default function CatalogPage() {
  const profileApi = useApi("/pharmacist/me");
  const catalogApi = useApi("/pharmacist/catalog");
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const pharmacy = profileApi.data?.pharmacy ?? null;
  const catalog = catalogApi.data?.catalog ?? [];

  useEffect(() => {
    catalogApi.refresh({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacy?.id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesQuery =
        !needle ||
        `${item.name} ${item.strength} ${item.form}`.toLowerCase().includes(needle);
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "low"
            ? item.isAvailable && item.quantityAvailable < 10
            : filter === "unavailable"
              ? !item.isAvailable
              : item.isAvailable;
      return matchesQuery && matchesFilter;
    });
  }, [catalog, query, filter]);

  const counts = useMemo(
    () => ({
      items: catalog.length,
      units: catalog.reduce((sum, item) => sum + item.quantityAvailable, 0),
      low: catalog.filter((item) => item.isAvailable && item.quantityAvailable < 10).length,
      unavailable: catalog.filter((item) => !item.isAvailable).length,
    }),
    [catalog],
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      strength: item.strength ?? "",
      form: item.form ?? "Tablet",
      unitLabel: item.unitLabel ?? "tablet",
      quantityAvailable: String(item.quantityAvailable ?? 0),
      price: item.price == null ? "" : String(item.price),
      isAvailable: item.isAvailable,
    });
    setFormError("");
    setModalOpen(true);
  }

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name,
        strength: form.strength,
        form: form.form,
        unitLabel: form.unitLabel,
        quantityAvailable: Number(form.quantityAvailable || 0),
        price: form.price === "" ? null : Number(form.price),
        isAvailable: form.isAvailable,
      };
      if (editing) {
        await api.patch(`/pharmacist/catalog/${editing.id}`, payload);
        toast.success("Catalog updated", `${form.name} was saved.`);
      } else {
        await api.post("/pharmacist/catalog", payload);
        toast.success("Item added", `${form.name} is now in your catalog.`);
      }
      setModalOpen(false);
      await catalogApi.refresh({ silent: true });
    } catch (err) {
      setFormError(err.message || "Could not save this catalog item");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    setTogglingId(item.id);
    try {
      await api.patch(`/pharmacist/catalog/${item.id}`, {
        isAvailable: !item.isAvailable,
      });
      toast.success(
        item.isAvailable ? "Marked unavailable" : "Marked available",
        `${item.name} is now ${item.isAvailable ? "hidden from" : "visible to"} customers.`,
      );
      await catalogApi.refresh({ silent: true });
    } catch (err) {
      toast.error("Could not update availability", err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/pharmacist/catalog/${deleteTarget.id}`);
      toast.success("Item removed", `${deleteTarget.name} was removed from the catalog.`);
      setDeleteTarget(null);
      await catalogApi.refresh({ silent: true });
    } catch (err) {
      toast.error("Could not remove item", err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (profileApi.loading && !profileApi.data) {
    return <LoadingBlock label="Loading catalog…" />;
  }
  if (profileApi.error) {
    return <ErrorState error={profileApi.error} onRetry={profileApi.refresh} />;
  }

  if (!pharmacy) {
    return (
      <div>
        <PageHeader
          eyebrow="Pharmacist"
          title="Catalog"
          description="Your medicine availability list is shown to customers in the directory."
        />
        <Card>
          <EmptyState
            icon={Store}
            title="Create your pharmacy profile first"
            description="A catalog belongs to a pharmacy. Create the profile, then start listing the medicines you stock."
            action={
              <Link href="/pharmacist/pharmacy" className={buttonClasses()}>
                Create pharmacy profile
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={pharmacy.name}
        title="Catalog"
        description="Customers use your catalog to decide which pharmacy to ask. Keep quantities honest."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Add medicine
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Catalog items" value={formatNumber(counts.items)} hint="Listed by this pharmacy" />
        <StatCard icon={Boxes} label="Total units" value={formatNumber(counts.units)} tone="sky" hint="Available across the catalog" />
        <StatCard
          icon={Boxes}
          label="Low availability"
          value={formatNumber(counts.low)}
          tone={counts.low > 0 ? "amber" : "emerald"}
          hint="Below 10 units"
        />
        <StatCard
          icon={Boxes}
          label="Marked off"
          value={formatNumber(counts.unavailable)}
          tone={counts.unavailable > 0 ? "violet" : "emerald"}
          hint="Hidden from customers"
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Your availability"
          description="Toggle availability without deleting the item."
          action={
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search catalog…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:w-56"
                />
              </div>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5 sm:px-6">
          {[
            { key: "all", label: "All" },
            { key: "available", label: "Available" },
            { key: "low", label: "Low" },
            { key: "unavailable", label: "Off" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === tab.key
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {catalogApi.loading && !catalogApi.data ? (
          <SkeletonRows rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={catalog.length === 0 ? "Your catalog is empty" : "No matching items"}
            description={
              catalog.length === 0
                ? "Add the medicines you stock so customers know what they can request."
                : "Try a different search or filter."
            }
            action={
              catalog.length === 0 ? (
                <Button icon={Plus} onClick={openCreate}>
                  Add your first medicine
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 sm:px-6">Medicine</th>
                  <th className="px-3 py-3">Availability</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 sm:px-6">
                      <p className="font-semibold text-slate-900">
                        {item.name}
                        {item.strength ? ` ${item.strength}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.form} · per {item.unitLabel}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`font-semibold ${item.quantityAvailable < 10 ? "text-amber-700" : "text-slate-800"}`}
                      >
                        {formatNumber(item.quantityAvailable)}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">{item.unitLabel}(s)</span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-700">
                      {item.price == null ? "—" : formatCurrency(item.price)}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge
                        tone={
                          !item.isAvailable
                            ? "slate"
                            : item.quantityAvailable < 10
                              ? "amber"
                              : "emerald"
                        }
                      >
                        {!item.isAvailable
                          ? "Off"
                          : item.quantityAvailable < 10
                            ? "Low"
                            : "Available"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(item)}
                          disabled={togglingId === item.id}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                          title={item.isAvailable ? "Mark unavailable" : "Mark available"}
                        >
                          {item.isAvailable ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit catalog item" : "Add catalog item"}
        description="This is what customers see in your public pharmacy page."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="catalog-form" loading={saving}>
              {editing ? "Save changes" : "Add item"}
            </Button>
          </>
        }
      >
        <form id="catalog-form" onSubmit={save} className="space-y-4">
          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {formError}
            </div>
          ) : null}

          <Field label="Medicine name" required>
            <Input
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="e.g. Amoxicillin"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Strength" hint="Optional, e.g. 500 mg">
              <Input
                maxLength={40}
                value={form.strength}
                onChange={(event) => set("strength", event.target.value)}
                placeholder="500 mg"
              />
            </Field>
            <Field label="Form" required>
              <Select value={form.form} onChange={(event) => set("form", event.target.value)}>
                {FORMS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit label" required>
              <Input
                required
                maxLength={24}
                value={form.unitLabel}
                onChange={(event) => set("unitLabel", event.target.value)}
                placeholder="tablet"
              />
            </Field>
            <Field label="Quantity available" required>
              <Input
                required
                type="number"
                min={0}
                max={1000000}
                value={form.quantityAvailable}
                onChange={(event) => set("quantityAvailable", event.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Price per unit" hint="Optional. Shown to customers in ₹.">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(event) => set("price", event.target.value)}
              placeholder="e.g. 8.50"
            />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
            <Switch
              checked={form.isAvailable}
              onChange={(value) => set("isAvailable", value)}
              label="Available to customers"
              description="Unavailable items stay in your catalog but are hidden from the directory."
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        loading={deleting}
        title="Remove this catalog item?"
        description={
          deleteTarget
            ? `${deleteTarget.name}${deleteTarget.strength ? ` ${deleteTarget.strength}` : ""} will be removed. Past requests keep their recorded name.`
            : ""
        }
        confirmLabel="Remove item"
      />
    </div>
  );
}
