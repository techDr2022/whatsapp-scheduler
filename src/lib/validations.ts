import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid E.164 phone number"),
  isPrimaryApproval: z.boolean().default(false),
});

export const scheduledPostSchema = z.object({
  postDate: z.coerce.date(),
  assetId: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  approvalSendAt: z.coerce.date().optional().nullable(),
  offsetDays: z.number().int().min(0).default(0),
  status: z.enum([
    "DRAFT",
    "SCHEDULED",
    "PENDING_APPROVAL",
    "CONFIRMED",
    "CHANGES_REQUESTED",
    "SKIPPED",
  ]),
});

// For PATCH - all fields optional except at least one must be provided
export const scheduledPostUpdateSchema = scheduledPostSchema.partial();

export const monthParamSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format YYYY-MM"),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ScheduledPostInput = z.infer<typeof scheduledPostSchema>;
