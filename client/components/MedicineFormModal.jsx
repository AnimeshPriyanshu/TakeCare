"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/ToastContext";

const FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Sachet",
  "Inhaler",
  "Injection",
  "Drops",
  "Ointment",
  "Other",
];

const EMPTY = {
  name: "",
  strength: "",
  form: "Tablet",
  unitLabel: "tablet",
  confirmedStock: "0",
  dailyUnits: "0",
  reorderThreshold: "5",
  dosageSchedule: "",
  familyMemberId: "",
};

export default function MedicineFormModal({
  open,
  onClose,
  onSaved,
  medicine = null,
  familyMembers = [],
}) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (medicine) {
      setForm({
        name: medicine.name ?? "",
        strength: medicine.strength ?? "",
        form: medicine.form ?? "Tablet",
        unitLabel: medicine.unitLabel ?? "tablet",
        confirmedStock: String(medicine.confirmedStock ?? 0),
        dailyUnits: String(medicine.dailyUnits ?? 0),
        reorderThreshold: String(medicine.reorderThreshold ?? 5),
        dosageSchedule: medicine.dosageSchedule ?? "",
        familyMemberId: medicine.familyMemberId ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, medicine]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        strength: form.strength,
        form: form.form,
        unitLabel: form.unitLabel,
        dailyUnits: Number(form.dailyUnits),
        reorderThreshold: Number(form.reorderThreshold),
        dosageSchedule: form.dosageSchedule,
        familyMemberId: form.familyMemberId || null,
        ...(medicine ? {} : { confirmedStock: Number(form.confirmedStock) }),
      };
      const data = medicine
        ? await api.patch(`/medicines/${medicine.id}`, payload)
        : await api.post("/medicines", payload);
      toast.success(
        medicine ? "Medicine updated" : "Medicine added",
        `${data.medicine.name} is now in your inventory.`,
      );
      onSaved?.(data.medicine);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save the medicine");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={medicine ? "Edit medicine" : "Add a medicine"}
      description={
        medicine
          ? "Update usage, threshold and schedule. Confirmed stock changes through transactions only."
          : "Enter the details supplied by your doctor. TakeCare will not suggest a dosage."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="medicine-form" loading={submitting}>
            {medicine ? "Save changes" : "Add medicine"}
          </Button>
        </>
      }
    >
      <form id="medicine-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[1.5fr,1fr]">
          <Field label="Medicine name" required>
            <Input
              required
              minLength={2}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="e.g. Metformin"
            />
          </Field>
          <Field label="Strength">
            <Input
              value={form.strength}
              onChange={(event) => update("strength", event.target.value)}
              placeholder="e.g. 500 mg"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Form">
            <Select value={form.form} onChange={(event) => update("form", event.target.value)}>
              {FORMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unit label">
            <Input
              value={form.unitLabel}
              onChange={(event) => update("unitLabel", event.target.value)}
              placeholder="tablet"
            />
          </Field>
          <Field label="Family member" hint="Optional">
            <Select
              value={form.familyMemberId}
              onChange={(event) => update("familyMemberId", event.target.value)}
            >
              <option value="">Myself</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.relation})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {!medicine ? (
            <Field label="Initial confirmed stock" required>
              <Input
                type="number"
                min="0"
                required
                value={form.confirmedStock}
                onChange={(event) => update("confirmedStock", event.target.value)}
              />
            </Field>
          ) : (
            <Field label="Confirmed stock" hint="Use “Update stock” to change this.">
              <Input value={form.confirmedStock} disabled />
            </Field>
          )}
          <Field label="Units per day" hint="Estimated consumption">
            <Input
              type="number"
              min="0"
              value={form.dailyUnits}
              onChange={(event) => update("dailyUnits", event.target.value)}
            />
          </Field>
          <Field label="Reorder threshold">
            <Input
              type="number"
              min="0"
              value={form.reorderThreshold}
              onChange={(event) => update("reorderThreshold", event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Dosage schedule (as supplied by your doctor)"
          hint="Free text. TakeCare stores it but never recommends or changes a dosage."
        >
          <Textarea
            rows={3}
            value={form.dosageSchedule}
            onChange={(event) => update("dosageSchedule", event.target.value)}
            placeholder="e.g. 1 tablet after breakfast and 1 after dinner"
          />
        </Field>
      </form>
    </Modal>
  );
}
