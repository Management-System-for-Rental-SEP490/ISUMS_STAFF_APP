/**
 * SSE notification stream — đồng bộ Mobile (401 logout, 403 toast, malformed streak).
 */
import { Platform } from "react-native";
import i18n from "../i18n";
import { useAuthStore } from "../../store/useAuthStore";
import { useAlertStore } from "../../store/useAlertStore";
import {
  NOTIFICATION_REALTIME_ENABLED,
  NOTIFICATION_STREAM_IDLE_MS,
  NOTIFICATION_STREAM_MAX_MALFORMED_STREAK,
  NOTIFICATION_STREAM_MAX_RETRIES,
  NOTIFICATION_STREAM_URL,
} from "../api/config";
import { refreshAccessToken, logoutKeycloak } from "./keycloakAuth";
import { normalizeStreamEventToAppNotification } from "../utils/notificationStreamPayload";
import { toAppLocaleCode } from "../utils/resolveLocalizedJsonString";

export type NotificationStreamHandlers = {
  onQueryRefresh?: () => void;
  onSessionDisabled?: (reason: string) => void;
};

let sessionDisabled = false;
let fatalPermanent = false;
let abortCurrent: AbortController | null = null;
let runId = 0;
let stream403ToastShown = false;

export function isNotificationRealtimeSessionDisabled(): boolean {
  return sessionDisabled;
}

export function resetNotificationRealtimeSessionForTests(): void {
  sessionDisabled = false;
  fatalPermanent = false;
  stream403ToastShown = false;
}

export function resetNotificationRealtimeTransportState(): void {
  fatalPermanent = false;
  sessionDisabled = false;
  stream403ToastShown = false;
  abortCurrent?.abort();
  abortCurrent = null;
}

function showStreamForbiddenToastOnce(): void {
  if (stream403ToastShown) return;
  stream403ToastShown = true;
  useAlertStore.getState().show(
    i18n.t("common.error"),
    i18n.t("notification.stream_forbidden"),
    [{ text: i18n.t("common.close") }],
    "warning"
  );
}

function performSessionLogoutFromStream(): void {
  const idToken = useAuthStore.getState().idToken;
  useAuthStore.getState().logout();
  void logoutKeycloak(idToken).catch(() => {});
}

function fatalCodesNo403(status: number): boolean {
  return status === 400 || status === 404 || status === 501;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function backoffMs(attempt: number): number {
  const base = Math.min(60_000, 2000 * Math.pow(1.6, attempt));
  const jitter = Math.random() * 800;
  return Math.floor(base + jitter);
}

async function fetchStreamOnce(
  url: string,
  signal: AbortSignal
): Promise<{ fatal: true; reason: string } | { fatal: false; response: Response }> {
  const lang = toAppLocaleCode(i18n.language);
  let token = useAuthStore.getState().token;

  const doFetch = (t: string | null) =>
    fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Accept-Language": lang,
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      signal,
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const rt = useAuthStore.getState().refreshToken;
    if (rt) {
      try {
        await refreshAccessToken(rt);
        token = useAuthStore.getState().token;
        res = await doFetch(token);
      } catch {
        performSessionLogoutFromStream();
        return { fatal: true, reason: "stream_401_refresh_failed" };
      }
    }
    if (res.status === 401) {
      performSessionLogoutFromStream();
      return { fatal: true, reason: "stream_401" };
    }
  }

  if (res.status === 403) {
    showStreamForbiddenToastOnce();
    return { fatal: true, reason: "stream_http_403" };
  }

  if (!res.ok) {
    if (fatalCodesNo403(res.status)) {
      return { fatal: true, reason: `stream_http_${res.status}` };
    }
    if (retryableStatus(res.status)) {
      return { fatal: false, response: res };
    }
    return { fatal: true, reason: `stream_http_${res.status}` };
  }

  return { fatal: false, response: res };
}

function extractDataLines(buffer: string): { events: string[]; rest: string } {
  const events: string[] = [];
  const blocks = buffer.split(/\r?\n\r?\n/);
  if (blocks.length === 0) return { events, rest: buffer };
  const complete = blocks.slice(0, -1);
  const rest = blocks[blocks.length - 1] ?? "";
  for (const block of complete) {
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("data:")) {
        events.push(t.slice(5).trim());
      }
    }
  }
  return { events, rest };
}

async function readSseBody(
  response: Response,
  signal: AbortSignal,
  handlers: NotificationStreamHandlers
): Promise<{ retry: boolean; reason: string }> {
  const body = response.body;
  if (!body || typeof (body as any).getReader !== "function") {
    return { retry: false, reason: "stream_no_readable_body" };
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let lastByteAt = Date.now();
  let malformedStreak = 0;

  const idleWatch = setInterval(() => {
    if (signal.aborted) return;
    if (Date.now() - lastByteAt > NOTIFICATION_STREAM_IDLE_MS) {
      abortCurrent?.abort();
    }
  }, 4000);

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        return { retry: true, reason: "stream_eof" };
      }
      lastByteAt = Date.now();
      buf += decoder.decode(value, { stream: true });
      const { events, rest } = extractDataLines(buf);
      buf = rest;
      for (const line of events) {
        if (!line || line === "[DONE]") continue;
        let ok = false;
        try {
          const raw = JSON.parse(line) as unknown;
          const parsed = normalizeStreamEventToAppNotification(raw);
          ok = parsed !== null;
        } catch {
          ok = false;
        }
        if (ok) {
          malformedStreak = 0;
          handlers.onQueryRefresh?.();
        } else {
          malformedStreak++;
          if (malformedStreak >= NOTIFICATION_STREAM_MAX_MALFORMED_STREAK) {
            return { retry: false, reason: "stream_malformed_flood" };
          }
        }
      }
    }
    return { retry: true, reason: "stream_aborted" };
  } catch (e) {
    if (signal.aborted) {
      return { retry: true, reason: "stream_aborted" };
    }
    return { retry: true, reason: "stream_read_error" };
  } finally {
    clearInterval(idleWatch);
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}

export function stopNotificationStream(): void {
  abortCurrent?.abort();
  abortCurrent = null;
}

export function startNotificationStream(handlers: NotificationStreamHandlers): boolean {
  if (!NOTIFICATION_REALTIME_ENABLED || Platform.OS === "web") {
    sessionDisabled = false;
    return false;
  }
  if (fatalPermanent) {
    return false;
  }
  const url = NOTIFICATION_STREAM_URL.trim();
  if (!url) {
    sessionDisabled = true;
    handlers.onSessionDisabled?.("realtime_disabled_or_missing_url");
    return false;
  }

  stopNotificationStream();
  const myRun = ++runId;
  abortCurrent = new AbortController();
  const signal = abortCurrent.signal;

  void (async () => {
    let attempt = 0;

    while (myRun === runId && !signal.aborted) {
      const result = await fetchStreamOnce(url, signal);
      if (result.fatal) {
        fatalPermanent = true;
        sessionDisabled = true;
        handlers.onSessionDisabled?.(result.reason);
        return;
      }

      const fr = result.response;
      if (!fr.ok) {
        attempt++;
        if (attempt > NOTIFICATION_STREAM_MAX_RETRIES) {
          fatalPermanent = true;
          sessionDisabled = true;
          handlers.onSessionDisabled?.("stream_max_retries_http");
          return;
        }
        await new Promise((r) => setTimeout(r, backoffMs(attempt)));
        continue;
      }

      attempt = 0;

      const read = await readSseBody(fr, signal, handlers);

      if (!read.retry) {
        fatalPermanent = true;
        sessionDisabled = true;
        handlers.onSessionDisabled?.(read.reason);
        return;
      }

      attempt++;
      if (attempt > NOTIFICATION_STREAM_MAX_RETRIES) {
        fatalPermanent = true;
        sessionDisabled = true;
        handlers.onSessionDisabled?.("stream_max_retries_eof");
        return;
      }
      await new Promise((r) => setTimeout(r, backoffMs(attempt)));
    }
  })();

  return true;
}
