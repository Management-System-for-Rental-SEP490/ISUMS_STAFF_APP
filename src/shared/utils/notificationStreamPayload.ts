/**
 * Parse SSE payload — đồng bộ Mobile.
 */
import type { AppNotificationFromApi } from "../types/api";
import { categoryRequiresEntityIdForNavigation } from "./notificationEntityRules";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export function normalizeStreamEventToAppNotification(input: unknown): AppNotificationFromApi | null {
  let root = asRecord(input);
  if (!root) return null;

  const version = root.version;
  if (version !== undefined) {
    const inner = asRecord(root.event) ?? asRecord(root.data) ?? asRecord(root.payload);
    if (inner) root = inner;
  }

  const eventId = String(root.eventId ?? root.event_id ?? "").trim();
  if (!eventId) return null;

  const type = String(root.type ?? "").trim();
  if (!type) return null;

  const categoryRaw = String(root.category ?? "SYSTEM").trim();
  const categoryUpper = categoryRaw.toUpperCase();

  let entityType = root.entityType != null ? String(root.entityType).trim() : "";
  let entityId = root.entityId != null ? String(root.entityId).trim() : "";

  if (categoryRequiresEntityIdForNavigation(categoryUpper)) {
    if (!entityType || !entityId) return null;
  } else {
    if (!entityType) entityType = "SYSTEM";
  }

  const createdAt = String(root.createdAt ?? root.timestamp ?? root.created_at ?? "").trim();
  if (!createdAt) return null;

  const titleKeyRaw = root.titleKey != null ? String(root.titleKey).trim() : "";
  const titleI18n =
    root.titleI18n && typeof root.titleI18n === "object"
      ? (root.titleI18n as AppNotificationFromApi["titleI18n"])
      : null;
  if (!titleKeyRaw && !titleI18n) return null;

  const id = String(root.id ?? root.notificationId ?? eventId).trim();
  const read = Boolean(root.read);

  return {
    id,
    eventId,
    dedupeKey: root.dedupeKey != null ? String(root.dedupeKey).trim() : null,
    type,
    category: categoryRaw as AppNotificationFromApi["category"],
    entityType,
    entityId: entityId.length > 0 ? entityId : null,
    houseId: root.houseId != null ? String(root.houseId) : null,
    actorRole: root.actorRole != null ? String(root.actorRole) : null,
    actorId: root.actorId != null ? String(root.actorId) : null,
    titleKey: titleKeyRaw || null,
    titleI18n,
    bodyParams:
      root.bodyParams && typeof root.bodyParams === "object"
        ? (root.bodyParams as Record<string, unknown>)
        : null,
    data: root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null,
    timestamp: root.timestamp != null ? String(root.timestamp) : null,
    createdAt,
    urgent: Boolean(root.urgent),
    actionType: root.actionType != null ? String(root.actionType) : null,
    deepLink: root.deepLink != null ? String(root.deepLink) : null,
    read,
    readAt: root.readAt != null ? String(root.readAt) : null,
  };
}
