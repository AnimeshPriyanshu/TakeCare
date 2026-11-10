import { z } from "zod";

export const requestCreateSchema = z.object({
  pharmacyId: z.string().min(1, "Choose a pharmacy"),
  medicineId: z.string().min(1, "Choose one of your medicines"),
  pharmacyMedicineId: z.string().min(1).optional().nullable(),
  quantityRequested: z.coerce.number().int().min(1).max(10000),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const requestRespondSchema = z
  .object({
    action: z.enum(["ACCEPT", "REJECT", "PROPOSE"]),
    quantity: z.coerce.number().int().min(1).max(10000).optional(),
    note: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.action === "PROPOSE" && !data.quantity) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Enter the quantity you can offer",
      });
    }
  });
