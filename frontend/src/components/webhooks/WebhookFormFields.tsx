import type { UseFormRegisterReturn } from "react-hook-form";
import { Button, Input } from "@yza/ui";
import type { Webhook } from "@/types";
import type { WebhookForm } from "@/lib/webhooks";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type FieldProps = Omit<UseFormRegisterReturn, "ref">;

interface WebhookFormFieldsProps {
  editTarget: Webhook | null;
  events: WebhookForm["events"];
  formErrors: {
    events?: string;
    headers?: string;
    name?: string;
    url?: string;
  };
  headers: WebhookForm["headers"];
  nameField: FieldProps;
  onAddHeader: () => void;
  onRemoveHeader: (id: string) => void;
  onToggleEvent: (event: string) => void;
  onUpdateHeader: (id: string, field: "key" | "value", value: string) => void;
  secretField: FieldProps;
  t: Translate;
  urlField: FieldProps;
}

export function WebhookFormFields({
  editTarget,
  events,
  formErrors,
  headers,
  nameField,
  onAddHeader,
  onRemoveHeader,
  onToggleEvent,
  onUpdateHeader,
  secretField,
  t,
  urlField,
}: WebhookFormFieldsProps) {
  return (
    <div className="yza-doc-stack">
      <Input
        id="webhook-name"
        label={t("webhooks.name")}
        {...nameField}
        status={formErrors.name ? "error" : "default"}
        message={formErrors.name}
      />
      <Input
        id="webhook-url"
        label={t("webhooks.url")}
        {...urlField}
        status={formErrors.url ? "error" : "default"}
        message={formErrors.url}
      />
      <Input
        id="webhook-secret"
        label={t("webhooks.secret")}
        type="password"
        {...secretField}
        placeholder={editTarget?.has_secret ? "••••••••" : ""}
      />
      <p className="stc-webhook-hint">
        {t("webhooks.secretHint")}
      </p>
      <div>
        <label className="stc-webhook-label">
          {t("webhooks.events")}
        </label>
        {formErrors.events && (
          <p className="stc-webhook-error">
            {formErrors.events}
          </p>
        )}
        <div className="stc-webhook-event-grid">
          {ALL_WEBHOOK_EVENTS.map((event) => (
            <label key={event} className="stc-webhook-event-option">
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => onToggleEvent(event)}
              />
              {event}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="stc-webhook-label">
          {t("webhooks.headers")}
        </label>
        {formErrors.headers && (
          <p className="stc-webhook-error">
            {formErrors.headers}
          </p>
        )}
        {headers.map((header) => (
          <div key={header.id} className="stc-webhook-header-row">
            <Input
              placeholder={t("webhooks.headerName")}
              value={header.key}
              onChange={(e) => onUpdateHeader(header.id, "key", e.target.value)}
            />
            <Input
              placeholder={t("webhooks.headerValue")}
              value={header.value}
              onChange={(e) => onUpdateHeader(header.id, "value", e.target.value)}
            />
            <Button
              size="sm"
              tone="danger"
              type="button"
              onClick={() => onRemoveHeader(header.id)}
              aria-label={t("webhooks.removeHeader")}
              title={t("webhooks.removeHeader")}
            >
              {t("webhooks.removeHeader")}
            </Button>
          </div>
        ))}
        <Button size="sm" tone="outline" type="button" onClick={onAddHeader}>
          {t("webhooks.addHeader")}
        </Button>
      </div>
    </div>
  );
}
