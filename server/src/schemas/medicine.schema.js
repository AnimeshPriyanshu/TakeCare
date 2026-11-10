import { z } from "zod";

const strength = z.string().trim().max(40).default("");
const form = z.string().trim().min(1).max(40).default("Tablet");
const unitLabel = z.string().trim().min(1).max(24).default("tablet");

export const medicineCreateSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required").max(120),
  strength,
  form,
  unitLabel,
  confirmedStock: z.coerce.number().int().min(0).max(100000).default(0),
  dailyUnits: z.coerce.number().int().min(0).max(1000).default(0),
  dosageSchedule: z.string().trim().max(500).optional().or(z.literal("")),
  reorderThreshold: z.coerce.number().int().min(0).max(10000).default(5),
  familyMemberId: z.string().trim().min(1).optional().nullable(),
});

export const medicineUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    strength: z.string().trim().max(40).optional(),
    form: z.string().trim().min(1).max(40).optional(),
    unitLabel: z.string().trim().min(1).max(24).optional(),
    dailyUnits: z.coerce.number().int().min(0).max(1000).optional(),
    dosageSchedule: z.string().trim().max(500).optional().or(z.literal("")),
    reorderThreshold: z.coerce.number().int().min(0).max(10000).optional(),
    familyMemberId: z.string().trim().min(1).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const transactionSchema = z
  .object({
    type: z.enum(["PURCHASE", "CORRECTION"]),
    quantity: z.coerce.number().int().min(-100000).max(100000),
    note: z.string().trim().max(240).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PURCHASE" && data.quantity <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Purchase quantity must be greater than zero",
      });
    }
    if (data.type === "CORRECTION" && data.quantity === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Correction amount cannot be zero",
      });
    }
  });

export const familyMemberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  relation: z.string().trim().min(2, "Relation is required").max(40),
});
