/**
 * REST notification domain — defensive: không throw lên UI khi BE chưa deploy (404/501/mạng).
 * HTTP chỉ ở đây (010).
 */
import { isAxiosError } from "axios";
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type { AppNotificationFromApi, AppNotificationsListResult } from "../types/api";

const BASE = () => `${BACKEND_API_BASE}/notifications`;

function isUnavailableStatus(status: number | undefined): boolean {
  return status === 404 || status === 501;
}

function coerceNotificationRow(raw: Record<string, unknown>): AppNotificationFromApi | null {
  const id = String(raw.id ?? raw.notificationId ?? "").trim();
  const eventId = String(raw.eventId ?? raw.event_id ?? "").trim();
  if (!id || !eventId) return null;
  return {
    id,
    eventId,
    dedupeKey: raw.dedupeKey != null ? String(raw.dedupeKey) : (raw.dedupe_key != null ? String(raw.dedupe_key) : null),
    type: String(raw.type ?? "UNKNOWN"),
    category: String(raw.category ?? "SYSTEM") as AppNotificationFromApi["category"],
    entityType: raw.entityType != null ? String(raw.entityType) : null,
    entityId: raw.entityId != null ? String(raw.entityId) : null,
    houseId: raw.houseId != null ? String(raw.houseId) : null,
    actorRole: raw.actorRole != null ? String(raw.actorRole) : null,
    actorId: raw.actorId != null ? String(raw.actorId) : null,
    titleKey: raw.titleKey != null ? String(raw.titleKey) : null,
    titleI18n:
      raw.titleI18n && typeof raw.titleI18n === "object"
        ? (raw.titleI18n as AppNotificationFromApi["titleI18n"])
        : null,
    bodyParams:
      raw.bodyParams && typeof raw.bodyParams === "object"
        ? (raw.bodyParams as Record<string, unknown>)
        : null,
    data: raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : null,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : null,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : raw.created_at != null ? String(raw.created_at) : null,
    urgent: Boolean(raw.urgent),
    actionType: raw.actionType != null ? String(raw.actionType) : null,
    deepLink: raw.deepLink != null ? String(raw.deepLink) : null,
    read: Boolean(raw.read),
    readAt: raw.readAt != null ? String(raw.readAt) : null,
  };
}

function parseListBody(body: unknown): AppNotificationsListResult {
  if (body == null) {
    return { items: [], nextCursor: null };
  }
  const o = body as Record<string, unknown>;
  const data = (o.data ?? o) as Record<string, unknown>;
  const rawList =
    data.items ??
    data.content ??
    data.notifications ??
    o.items ??
    (Array.isArray(o) ? o : null);
  const arr = Array.isArray(rawList) ? rawList : [];
  const items: AppNotificationFromApi[] = [];
  for (const row of arr) {
    if (row && typeof row === "object") {
      const n = coerceNotificationRow(row as Record<string, unknown>);
      if (n) items.push(n);
    }
  }
  const next =
    (data.nextCursor as string | undefined) ??
    (data.cursor as string | undefined) ??
    (o.nextCursor as string | undefined) ??
    null;
  return {
    items,
    nextCursor: typeof next === "string" && next.length > 0 ? next : null,
  };
}

export type GetNotificationsParams = {
  cursor?: string | null;
  limit?: number;
  unreadOnly?: boolean;
};

/**
 * GET /api/notifications — cursor phân trang; 404/501 → list rỗng, không throw.
 */
export async function getNotifications(
  params: GetNotificationsParams = {}
): Promise<AppNotificationsListResult> {
  const limit = params.limit ?? 20;
  const sp = new URLSearchParams();
  sp.set("limit", String(limit));
  if (params.unreadOnly) sp.set("unreadOnly", "true");
  if (params.cursor) sp.set("cursor", params.cursor);
  try {
    const url = `${BASE()}?${sp.toString()}`;
    const res = await axiosClient.get(url);
    return parseListBody(res.data);
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s && isUnavailableStatus(s)) {
        return { items: [], nextCursor: null, fetchUnavailable: true };
      }
      if (s === 401 || s === 403) throw e;
    }
    return { items: [], nextCursor: null, fetchUnavailable: true };
  }
}

/**
 * GET /api/notifications/unread-count — null nếu 404/501/lỗi (FE fallback đếm từ list).
 */
export async function getNotificationsUnreadCount(): Promise<number | null> {
  try {
    const res = await axiosClient.get(`${BASE()}/unread-count`);
    const body = res.data as Record<string, unknown>;
    const data = (body?.data ?? body) as Record<string, unknown>;
    const n =
      data?.unreadCount ??
      data?.count ??
      data?.unread ??
      body?.unreadCount;
    if (typeof n === "number" && Number.isFinite(n)) return Math.max(0, n);
    if (typeof n === "string" && /^\d+$/.test(n)) return Math.max(0, parseInt(n, 10));
    return 0;
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s && isUnavailableStatus(s)) return null;
      if (s === 401 || s === 403) throw e;
    }
    return null;
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const id = String(notificationId ?? "").trim();
  if (!id) return false;
  try {
    await axiosClient.patch(`${BASE()}/${encodeURIComponent(id)}/read`);
    return true;
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s === 401 || s === 403) throw e;
    }
    return false;
  }
}

/**
 * PATCH /api/notifications/read-all — chỉ gọi khi BE confirm endpoint (flag READ_ALL_AVAILABLE).
 */
export async function markAllNotificationsRead(beforeIso?: string): Promise<boolean> {
  try {
    const q = beforeIso ? `?before=${encodeURIComponent(beforeIso)}` : "";
    await axiosClient.patch(`${BASE()}/read-all${q}`);
    return true;
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s === 401 || s === 403) throw e;
    }
    return false;
  }
}

export type DeviceTokenPayload = {
  token: string;
  platform: "ios" | "android" | "web";
};

/**
 * POST /api/notifications/device-tokens
 */
export async function registerNotificationDeviceToken(
  payload: DeviceTokenPayload
): Promise<boolean> {
  try {
    await axiosClient.post(`${BASE()}/device-tokens`, payload);
    return true;
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s && isUnavailableStatus(s)) return false;
      if (s === 401 || s === 403) throw e;
    }
    return false;
  }
}

/**
 * DELETE /api/notifications/device-tokens/:token
 */
export async function unregisterNotificationDeviceToken(token: string): Promise<boolean> {
  try {
    await axiosClient.delete(`${BASE()}/device-tokens/${encodeURIComponent(token)}`);
    return true;
  } catch (e) {
    if (isAxiosError(e)) {
      const s = e.response?.status;
      if (s && isUnavailableStatus(s)) return false;
      if (s === 401 || s === 403) throw e;
    }
    return false;
  }
}
