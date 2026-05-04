import i18n from "@/i18n";

function resolveLocale() {
  return i18n.resolvedLanguage || i18n.language || undefined;
}

function toDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = toDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat(resolveLocale(), {
    dateStyle: "medium",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = toDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat(resolveLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatClockTime(value?: string | null, withMilliseconds = false) {
  if (!value) return "-";

  const date = toDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat(resolveLocale(), {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...(withMilliseconds ? { fractionalSecondDigits: 3 as const } : {}),
  }).format(date);
}
