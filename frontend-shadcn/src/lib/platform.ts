function getPlatformString() {
  if (typeof navigator === "undefined") {
    return "";
  }

  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? "";
}

export function isApplePlatform() {
  return /Mac|iPhone|iPad|iPod/i.test(getPlatformString());
}

export function hasPrimaryModifier(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey">) {
  return isApplePlatform() ? event.metaKey : event.ctrlKey;
}

export function getPrimaryModifierLabel() {
  return isApplePlatform() ? "\u2318" : "Ctrl";
}
