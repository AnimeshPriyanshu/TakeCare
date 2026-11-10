import { z } from "zod";

export const pharmacyProfileSchema = z.object({
  name: z.string().trim().min(2, "Pharmacy name is required").max(120),
  address: z.string().trim().min(5, "Address is required").max(240),
  city: z.string().trim().min(2, "City is required").max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,10}$/, "Pincode must be 4-10 digits"),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  licenseNumber: z.string().trim().min(3, "License number is required").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    role: z.enum(["CUSTOMER", "PHARMACIST"]),
    pharmacy: pharmacyProfileSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "PHARMACIST" && !data.pharmacy) {
      ctx.addIssue({
        code: "custom",
        path: ["pharmacy"],
        message: "Pharmacy details are required for pharmacist accounts",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const pharmacyUpdateSchema = pharmacyProfileSchema.partial().extend({
  isActive: z.boolean().optional(),
});
