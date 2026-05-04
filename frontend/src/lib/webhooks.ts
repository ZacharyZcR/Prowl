import { z } from "zod";
import type { Webhook } from "@/types";

export const ALL_WEBHOOK_EVENTS = [
  "user.create", "user.update", "user.delete",
  "project.create", "project.update", "project.delete",
  "role.create", "role.update", "role.delete",
  "notification.create",
] as const;

export interface WebhookHeaderRow {
  id: string;
  key: string;
  value: string;
}

export const webhookFormSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1).url(),
  secret: z.string(),
  events: z.array(z.string()).min(1),
  headers: z.array(z.object({
    id: z.string(),
    key: z.string(),
    value: z.string(),
  })),
}).superRefine((form, ctx) => {
  const headerKeys = form.headers
    .map((header) => header.key.trim().toLowerCase())
    .filter(Boolean);

  if (new Set(headerKeys).size !== headerKeys.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["headers"],
      message: "Header names must be unique",
    });
  }
});

export type WebhookForm = z.infer<typeof webhookFormSchema>;

export function createHeaderRow(key = "", value = "", createId: () => string = defaultHeaderId): WebhookHeaderRow {
  return { id: createId(), key, value };
}

export function createEmptyWebhookForm(): WebhookForm {
  return {
    name: "",
    url: "",
    secret: "",
    events: [],
    headers: [],
  };
}

export function mapWebhookToForm(webhook: Webhook): WebhookForm {
  return {
    name: webhook.name,
    url: webhook.url,
    secret: "",
    events: [...webhook.events],
    headers: Object.entries(webhook.headers || {}).map(([key, value]) => createHeaderRow(key, value)),
  };
}

export function buildWebhookHeaders(headers: WebhookHeaderRow[]): Record<string, string> | undefined {
  const filtered = headers.filter((header) => header.key.trim() && header.value.trim());
  if (filtered.length === 0) {
    return undefined;
  }

  return filtered.reduce<Record<string, string>>((result, header) => {
    result[header.key.trim()] = header.value.trim();
    return result;
  }, {});
}

function defaultHeaderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `header-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
