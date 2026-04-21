/**
 * Map thông báo staff → route an toàn (entity khi category/heuristic cần đích điều hướng).
 */
import type { AppNotificationFromApi } from "../types/api";
import {
  categoryRequiresEntityIdForNavigation,
  isSystemOrBroadcastCategory,
} from "./notificationEntityRules";

function logNavGuard(reason: string, meta?: Record<string, unknown>) {
  if (__DEV__) {
    console.warn("[ISUMS][StaffNotificationNav]", reason, meta ?? "");
  }
}

function isNonEmptyEntityId(raw: string | null | undefined): boolean {
  return String(raw ?? "").trim().length > 0;
}

function heuristicRequiresEntityWhenCategoryEmpty(n: AppNotificationFromApi): boolean {
  const hasCat = String(n.category ?? "").trim().length > 0;
  if (hasCat) return false;
  const b = `${n.actionType ?? ""} ${n.type ?? ""}`.toUpperCase();
  return (
    b.includes("TICKET") ||
    b.includes("ISSUE") ||
    b.includes("MAINTENANCE") ||
    b.includes("JOB") ||
    b.includes("WORK_SLOT") ||
    b.includes("SCHEDULE") ||
    b.includes("CALENDAR")
  );
}

function requiresEntityForThisNotification(n: AppNotificationFromApi): boolean {
  if (isSystemOrBroadcastCategory(n.category)) return false;
  if (categoryRequiresEntityIdForNavigation(n.category)) return true;
  return heuristicRequiresEntityWhenCategoryEmpty(n);
}

function parseStaffDeepLink(deepLink: string | null | undefined): { path: string } | null {
  const d = String(deepLink ?? "").trim();
  if (!d) return null;
  try {
    const normalized = d.startsWith("isumsstaff:") && !d.includes("://")
      ? d.replace(/^isumsstaff:/, "isumsstaff://")
      : d;
    const u = new URL(normalized);
    const path = (u.pathname || "").replace(/^\//, "");
    return { path };
  } catch {
    return null;
  }
}

export type StaffNotificationNav =
  | { kind: "stack"; screen: "TicketDetail"; params: { ticketId: string } }
  | {
      kind: "mainTab";
      tab: "Calendar";
      params: { focusWorkSlotId?: string; focusDateYmd?: string };
    }
  | { kind: "none" }
  | { kind: "fallbackMain"; reason: string };

export function resolveStaffNotificationNavigation(n: AppNotificationFromApi): StaffNotificationNav {
  const blob = `${n.actionType ?? ""} ${n.type ?? ""} ${n.category ?? ""}`.toUpperCase();
  const entityId = String(n.entityId ?? "").trim();
  const entityOk = isNonEmptyEntityId(n.entityId);
  const needEntity = requiresEntityForThisNotification(n);

  if (needEntity && !entityOk) {
    logNavGuard("required_entity_missing", { id: n.id, category: n.category });
    return { kind: "fallbackMain", reason: "required_entity_missing" };
  }

  const parsed = parseStaffDeepLink(n.deepLink);
  if (parsed) {
    if (parsed.path.includes("ticket") || parsed.path.includes("issue")) {
      if (!entityOk) {
        logNavGuard("deep_link_ticket_missing_entity", { id: n.id });
        return { kind: "fallbackMain", reason: "deep_link_ticket_missing_entity" };
      }
      return { kind: "stack", screen: "TicketDetail", params: { ticketId: entityId } };
    }
    if (parsed.path.includes("calendar") || parsed.path.includes("slot")) {
      if (!entityOk) {
        logNavGuard("deep_link_slot_missing_entity", { id: n.id });
        return { kind: "fallbackMain", reason: "deep_link_slot_missing_entity" };
      }
      return { kind: "mainTab", tab: "Calendar", params: { focusWorkSlotId: entityId } };
    }
  }

  if (!entityOk) return { kind: "none" };

  if (blob.includes("WORK") && blob.includes("SLOT")) {
    return { kind: "mainTab", tab: "Calendar", params: { focusWorkSlotId: entityId } };
  }
  if (blob.includes("SCHEDULE") || blob.includes("CALENDAR")) {
    return { kind: "mainTab", tab: "Calendar", params: { focusWorkSlotId: entityId } };
  }
  if (
    blob.includes("TICKET") ||
    blob.includes("ISSUE") ||
    blob.includes("MAINTENANCE") ||
    blob.includes("JOB")
  ) {
    return { kind: "stack", screen: "TicketDetail", params: { ticketId: entityId } };
  }

  return { kind: "none" };
}
