import { z } from "zod";

export const catalogItemCreateSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required").max(120),
  strength: z.string().trim().max(40).default(""),
  form: z.string().trim().min(1).max(40).default("Tablet"),
  unitLabel: z.string().trim().min(1).max(24).default("tablet"),
  quantityAvailable: z.coerce.number().int().min(0).max(1000000).default(0),
  price: z.coerce.number().min(0).max(1000000).optional().nullable(),
  isAvailable: z.boolean().default(true),
});

export const catalogItemUpdateSchema = catalogItemCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
