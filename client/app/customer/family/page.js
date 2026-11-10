"use client";

import { useState } from "react";
import { Plus, Trash2, UserRound, Users } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Field";

export default function FamilyPage() {
  const { data, loading, error, refresh } = useApi("/family-members");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const members = data?.familyMembers ?? [];

  async function create(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await api.post("/family-members", { name, relation });
      toast.success("Family member added", `${name} can now be linked to medicines.`);
      setOpen(false);
      setName("");
      setRelation("");
      await refresh({ silent: true });
    } catch (err) {
      setFormError(err.message || "Could not add family member");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/family-members/${deleteTarget.id}`);
      toast.success("Family member removed", `${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      await refresh({ silent: true });
    } catch (err) {
      toast.error("Could not remove family member", err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (error) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <div>
      <PageHeader
        eyebrow="Household"
        title="Family members"
        description="Link medicines to the person who uses them. This is an optional convenience for shared inventories."
        actions={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            Add family member
          </Button>
        }
      />

      <Card>
        {loading && !data ? (
          <SkeletonRows rows={3} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Add a family member, then choose them when adding a medicine."
            action={
              <Button icon={Plus} onClick={() => setOpen(true)}>
                Add family member
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">
                      {member.relation} · added {formatDate(member.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="slate">
                    {member._count?.medicines ?? 0} medicine
                    {(member._count?.medicines ?? 0) === 1 ? "" : "s"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => setDeleteTarget(member)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
        Deletion is blocked while a family member still has medicines linked. Move or
        remove those medicines first so no inventory history is lost.
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a family member"
        description="This profile can be linked to medicines in your inventory."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="family-form" loading={submitting}>
              Add member
            </Button>
          </>
        }
      >
        <form id="family-form" onSubmit={create} className="space-y-4">
          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {formError}
            </div>
          ) : null}
          <Field label="Name" required>
            <Input
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Ananya Sharma"
            />
          </Field>
          <Field label="Relation" required>
            <Input
              required
              minLength={2}
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              placeholder="e.g. Mother"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        loading={deleting}
        title="Remove family member?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed from your household list. Medicines must be unlinked first.`
            : ""
        }
        confirmLabel="Remove"
      />
    </div>
  );
}
