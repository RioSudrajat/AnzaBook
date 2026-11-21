import { z } from "zod";

export const drmEventTypes = [
  "screenshot_shortcut",
  "clipboard_copy",
  "devtools_attempt",
  "dom_tampering",
  "print_save_attempt",
  "api_scrape_anomaly",
  "context_menu",
  "drag_attempt",
  "window_blur",
  "visibility_hidden",
  "multi_touch",
] as const;

export type DrmEventType = (typeof drmEventTypes)[number];

export const drmRiskLevels = ["high", "medium", "low"] as const;
export type DrmRiskLevel = (typeof drmRiskLevels)[number];

export const drmClientOses = [
  "windows",
  "macos",
  "linux",
  "android",
  "ios",
  "unknown",
] as const;
export type DrmClientOs = (typeof drmClientOses)[number];

export const DRM_EVENT_RISK_MAP: Record<DrmEventType, DrmRiskLevel> = {
  screenshot_shortcut: "high",
  clipboard_copy: "high",
  devtools_attempt: "high",
  dom_tampering: "high",
  print_save_attempt: "high",
  api_scrape_anomaly: "high",
  context_menu: "medium",
  drag_attempt: "medium",
  window_blur: "low",
  visibility_hidden: "low",
  multi_touch: "low",
};

/** Derives authoritative risk priority from a validated DRM event type. */
export function getDrmEventRiskLevel(eventType: DrmEventType): DrmRiskLevel {
  return DRM_EVENT_RISK_MAP[eventType];
}

/** Resolves effective DRM enforcement and toggle visibility across environments and editorial mode. */
export function resolveReaderDrmPolicy(input: {
  toggleAvailable: boolean;
  requestedDrm?: boolean;
  toggleState?: boolean;
  isAuthorEditing?: boolean;
}): { showToggle: boolean; isEnabled: boolean } {
  if (input.isAuthorEditing) {
    return { showToggle: false, isEnabled: false };
  }
  if (!input.toggleAvailable) {
    return { showToggle: false, isEnabled: true };
  }
  return {
    showToggle: true,
    isEnabled: input.toggleState ?? input.requestedDrm ?? true,
  };
}

export const recordDrmEventSchema = z
  .object({
    bookSlug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/),
    chapterNumber: z.number().int().min(1).max(1000).optional(),
    eventType: z.enum(drmEventTypes),
    triggerDetail: z.string().trim().min(1).max(255),
    watermarkCode: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9 _:-]+$/),
    clientOs: z.enum(drmClientOses).optional().default("unknown"),
  })
  .strict();

export const adminDrmEventsQuerySchema = z
  .object({
    riskLevel: z
      .enum(["all", ...drmRiskLevels])
      .optional()
      .default("all"),
    eventType: z
      .enum(["all", ...drmEventTypes])
      .optional()
      .default("all"),
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const DRM_HIGH_RISK_SUSPEND_THRESHOLD = 7;

export const drmSuspensionStatuses = [
  "suspended",
  "appeal_pending",
  "reinstated",
  "rejected",
] as const;
export type DrmSuspensionStatus = (typeof drmSuspensionStatuses)[number];

export const watermarkCodeParamSchema = z
  .object({
    watermarkCode: z
      .string()
      .trim()
      .min(4)
      .max(64)
      .regex(/^[A-Za-z0-9-]+$/),
  })
  .strict();

export const submitDrmAppealSchema = z
  .object({
    appealMessage: z
      .string()
      .trim()
      .min(10, "Alasan peninjauan minimal 10 karakter.")
      .max(1000, "Alasan peninjauan maksimal 1000 karakter."),
  })
  .strict();

export const adminReviewDrmAppealSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reviewNote: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export const adminDrmSuspensionsQuerySchema = z
  .object({
    status: z
      .enum(["all", ...drmSuspensionStatuses])
      .optional()
      .default("all"),
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const drmSuspensionIdParamSchema = z
  .object({
    id: z.string().uuid("ID suspensi DRM tidak valid."),
  })
  .strict();

export type RecordDrmEventInput = z.input<typeof recordDrmEventSchema>;
export type RecordDrmEventOutput = z.infer<typeof recordDrmEventSchema>;
export type SubmitDrmAppealInput = z.input<typeof submitDrmAppealSchema>;
export type SubmitDrmAppealOutput = z.infer<typeof submitDrmAppealSchema>;
export type AdminReviewDrmAppealInput = z.input<
  typeof adminReviewDrmAppealSchema
>;
export type AdminReviewDrmAppealOutput = z.infer<
  typeof adminReviewDrmAppealSchema
>;
export type AdminDrmEventsQueryInput = {
  riskLevel?: "all" | DrmRiskLevel;
  eventType?: "all" | DrmEventType;
  search?: string;
  limit?: number;
  offset?: number;
};
export type AdminDrmEventsQueryOutput = z.infer<
  typeof adminDrmEventsQuerySchema
>;
export type AdminDrmSuspensionsQueryInput = {
  status?: "all" | DrmSuspensionStatus;
  search?: string;
  limit?: number;
  offset?: number;
};
export type AdminDrmSuspensionsQueryOutput = z.infer<
  typeof adminDrmSuspensionsQuerySchema
>;
