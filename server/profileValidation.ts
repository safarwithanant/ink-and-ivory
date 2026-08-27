import { z } from "zod";

export const addressInputSchema = z.object({
  label: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(2).max(160),
  line1: z.string().trim().min(3).max(255),
  line2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(4).max(24),
  country: z.literal("IN"),
  phone: z.string().trim().min(8).max(32).optional().nullable(),
  isDefault: z.boolean().optional(),
}).strict();

export type AddressInput = z.infer<typeof addressInputSchema>;
