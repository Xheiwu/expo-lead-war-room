import { z } from "zod";

export const roleValues = ["ADMIN", "SALES", "FOLLOWER"] as const;
export const leadStatusValues = ["UNFOLLOWED", "CALLED", "INTERESTED", "INVALID", "QUOTED", "WON"] as const;
export const purchaseIntentValues = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const eventSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().nullable(),
  targetLeads: z.coerce.number().int().nonnegative().default(0),
  startsAt: z.string(),
  endsAt: z.string(),
  broadcastStartTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  broadcastEndTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
  dailySummaryTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
  privacyText: z.string().min(1).optional()
});

export const eventUpdateSchema = eventSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const salespersonSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  team: z.string().optional().nullable(),
  targetLeads: z.coerce.number().int().nonnegative().default(0),
  email: z.string().email().optional(),
  password: z.string().min(8).optional()
});

export const salespersonUpdateSchema = salespersonSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const leadPublicSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().min(11).max(20),
  company: z.string().max(100).optional(),
  title: z.string().max(50).optional(),
  wechat: z.string().max(80).optional(),
  interestedProduct: z.string().max(120).optional(),
  purchaseIntent: z.enum(purchaseIntentValues).default("UNKNOWN"),
  note: z.string().max(500).optional(),
  consentToContact: z.boolean(),
  website: z.string().optional().default("")
});

export const leadUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  phone: z.string().min(11).max(20).optional(),
  company: z.string().max(100).optional().nullable(),
  title: z.string().max(50).optional().nullable(),
  wechat: z.string().max(80).optional().nullable(),
  interestedProduct: z.string().max(120).optional().nullable(),
  purchaseIntent: z.enum(purchaseIntentValues).optional(),
  note: z.string().max(500).optional().nullable(),
  status: z.enum(leadStatusValues).optional(),
  suspicious: z.boolean().optional()
});

export const followUpSchema = z.object({
  result: z.string().min(1),
  status: z.enum(leadStatusValues).optional(),
  nextFollowUpAt: z.string().optional()
});

export const reminderSchema = z.object({
  content: z.string().min(1),
  sendAt: z.string()
});

export const webhookSchema = z.object({
  webhookUrl: z.string().url()
});
