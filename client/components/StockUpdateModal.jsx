"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/ToastContext";

export default function StockUpdateModal({ open, onClose, medicine, onSaved }) {
  const toast = useToast();
  const [type, setType] = useState("PURCHASE");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setType("PURCHASE");
    setQuantity("");
    setNote("");
    setError("");
  }, [open]);

  const preview = useMemo(() => {
    if (!medicine) return null;
    const value = Number(quantity);
    if (!Number.isFinite(value) || value === 0) return null;
    const delta = type === "PURCHASE" ? Math.abs(value) : value;
    return Math.max(0, medicine.confirmedStock + delta);
  }, [medicine, quantity, type]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!medicine) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await api.post(`/medicines/${medicine.id}/transactions`, {
        type,
        quantity: Number(quantity),
        note,
      });
      toast.success(
        type === "PURCHASE" ? "Purchase recorded" : "Stock corrected",
        `${data.medicine.name} confirmed stock is now ${data.medicine.confirmedStock} ${data.medicine.unitLabel}(s).`,
      );
      onSaved?.(data.medicine);
      onClose();
    } catch (err) {
      setError(err.message || "Could not update stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update confirmed stock"
      description={
        medicine
          ? `${medicine.name}${medicine.strength ? ` ${medicine.strength}` : ""} · ${medicine.confirmedStock} ${medicine.unitLabel}(s) confirmed`
          : ""
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="stock-form" loading={submitting}>
            Save transaction
          </Button>
        </>
      }
    >
      <form id="stock-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {[
            {
              value: "PURCHASE",
              title: "Record purchase",
              copy: "Add units you physically received",
            },
            {
              value: "CORRECTION",
              title: "Correct stock",
              copy: "Adjust for a physical count",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`rounded-xl border p-3.5 text-left transition ${
                type === option.value
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{option.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{option.copy}</p>
            </button>
          ))}
        </div>

        <Field
          label={type === "PURCHASE" ? "Units purchased" : "Correction (+/- units)"}
          hint={
            type === "PURCHASE"
              ? "This will be recorded as a purchase and reset the estimation baseline."
              : "Enter a positive or negative difference from the current confirmed stock."
          }
          required
        >
          <Input
            type="number"
            required
            autoFocus
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={type === "PURCHASE" ? "e.g. 30" : "e.g. -2"}
          />
        </Field>

        {preview != null ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            New confirmed stock will be{" "}
            <span className="font-semibold text-slate-900">
              {preview} {medicine?.unitLabel}(s)
            </span>
            . Estimated stock restarts from this baseline.
          </div>
        ) : null}

        <Field label="Note" hint="Optional, stored in the stock history.">
          <Textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Bought from CarePlus on the way home"
          />
        </Field>
      </form>
    </Modal>
  );
}
