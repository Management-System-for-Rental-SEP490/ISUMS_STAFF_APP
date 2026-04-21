/**
 * Quy tắc entityId theo BE: bắt buộc cho category có đích điều hướng;
 * optional cho SYSTEM / broadcast.
 */
const ENTITY_OPTIONAL_CATEGORIES = new Set([
  "SYSTEM",
  "BROADCAST",
  "NOTICE",
  "ANNOUNCEMENT",
]);

const ENTITY_REQUIRED_CATEGORIES = new Set([
  "ISSUE",
  "WORK_SLOT",
  "JOB",
  "INVOICE",
  "CONTRACT",
  "MAINTENANCE",
  "TICKET",
  "BILLING",
  "SCHEDULE",
  "CALENDAR",
]);

export function categoryRequiresEntityIdForNavigation(category: string | null | undefined): boolean {
  const c = String(category ?? "").trim().toUpperCase();
  if (ENTITY_OPTIONAL_CATEGORIES.has(c)) return false;
  if (!c) return false;
  return ENTITY_REQUIRED_CATEGORIES.has(c);
}

export function isSystemOrBroadcastCategory(category: string | null | undefined): boolean {
  const c = String(category ?? "").trim().toUpperCase();
  return ENTITY_OPTIONAL_CATEGORIES.has(c);
}
