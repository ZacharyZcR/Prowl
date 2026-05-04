import { describe, expect, it } from "vitest";
import {
  buildWebhookHeaders,
  createEmptyWebhookForm,
  createHeaderRow,
  mapWebhookToForm,
  webhookFormSchema,
} from "./webhooks";

describe("webhooks helpers", () => {
  it("creates a fresh empty form", () => {
    const first = createEmptyWebhookForm();
    const second = createEmptyWebhookForm();

    expect(first).toEqual({
      name: "",
      url: "",
      secret: "",
      events: [],
      headers: [],
    });
    expect(first).not.toBe(second);
    expect(first.events).not.toBe(second.events);
    expect(first.headers).not.toBe(second.headers);
  });

  it("maps webhook data into form state", () => {
    const form = mapWebhookToForm({
      id: 1,
      name: "build-hook",
      url: "https://example.com/hook",
      has_secret: true,
      events: ["project.create"],
      headers: { Authorization: "Bearer token" },
      enabled: true,
      last_status_code: 200,
      failure_count: 0,
      created_at: "",
    });

    expect(form.name).toBe("build-hook");
    expect(form.url).toBe("https://example.com/hook");
    expect(form.secret).toBe("");
    expect(form.events).toEqual(["project.create"]);
    expect(form.headers).toHaveLength(1);
    expect(form.headers[0]?.key).toBe("Authorization");
    expect(form.headers[0]?.value).toBe("Bearer token");
  });

  it("validates required fields and url format", () => {
    const missingFieldsResult = webhookFormSchema.safeParse(createEmptyWebhookForm());
    expect(missingFieldsResult.success).toBe(false);
    if (!missingFieldsResult.success) {
      expect(missingFieldsResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["name"] }),
          expect.objectContaining({ path: ["url"] }),
          expect.objectContaining({ path: ["events"] }),
        ]),
      );
    }

    const invalidUrlResult = webhookFormSchema.safeParse({
      ...createEmptyWebhookForm(),
      name: "hook",
      url: "not-a-url",
      events: ["project.create"],
      headers: [],
    });

    expect(invalidUrlResult.success).toBe(false);
    if (!invalidUrlResult.success) {
      expect(invalidUrlResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["url"] }),
        ]),
      );
    }
  });

  it("detects duplicate header names case-insensitively", () => {
    const result = webhookFormSchema.safeParse({
      ...createEmptyWebhookForm(),
      name: "hook",
      url: "https://example.com/hook",
      events: ["project.create"],
      headers: [
        createHeaderRow("Authorization", "a", () => "1"),
        createHeaderRow("authorization", "b", () => "2"),
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Header names must be unique",
            path: ["headers"],
          }),
        ]),
      );
    }
  });

  it("builds trimmed headers and skips empty rows", () => {
    const headers = buildWebhookHeaders([
      createHeaderRow(" Authorization ", " Bearer token ", () => "1"),
      createHeaderRow("", "ignored", () => "2"),
      createHeaderRow("X-App", "", () => "3"),
    ]);

    expect(headers).toEqual({
      Authorization: "Bearer token",
    });
  });
});
