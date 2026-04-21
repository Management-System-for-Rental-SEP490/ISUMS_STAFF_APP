import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";

const PREFIX = "[ISUMS Staff][ClientTimeout]";

export type ClientTimeoutLogPayload = {
  /** Nguồn gọi (axios instance app hay fetch + AbortController). */
  source: "axios" | "fetch";
  /** Trần thời gian (ms) áp dụng cho request này. */
  timeoutMs: number;
  method?: string;
  url?: string;
  /** Mã axios (vd. ECONNABORTED) hoặc tên lỗi fetch. */
  code?: string;
  message?: string;
};

/**
 * Log khi **hết thời gian chờ phía client** (không nhận được phản hồi HTTP kịp thời).
 * Không phải lỗi nghiệp vụ từ BE (4xx/5xx); thường gặp khi mạng yếu, DNS, hoặc server quá chậm.
 *
 * `console.warn` hiển thị trên Metro (terminal) và log native (Android Logcat / Xcode).
 */
export function logClientSideRequestTimeout(payload: ClientTimeoutLogPayload): void {
  const summary = `${PREFIX} Hết thời gian chờ sau ${payload.timeoutMs}ms — không phải phản hồi HTTP từ BE; có thể do mạng yếu hoặc không kết nối được server kịp.`;
  // eslint-disable-next-line no-console
  console.warn(summary, payload);
}

function resolveAxiosRequestUrl(config: InternalAxiosRequestConfig | undefined): string | undefined {
  if (!config) return undefined;
  try {
    return axios.getUri(config);
  } catch {
    const base = config.baseURL ?? "";
    const u = config.url ?? "";
    return u ? (base ? `${base.replace(/\/$/, "")}/${u.replace(/^\//, "")}` : u) : base || undefined;
  }
}

/**
 * Gọi khi `axios` báo timeout (`ECONNABORTED` / message chứa "timeout").
 */
export function logAxiosClientTimeout(error: unknown, fallbackTimeoutMs: number): void {
  if (!isAxiosError(error)) {
    logClientSideRequestTimeout({
      source: "axios",
      timeoutMs: fallbackTimeoutMs,
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  const cfg = error.config;
  const timeoutMs =
    typeof cfg?.timeout === "number" && cfg.timeout > 0 ? cfg.timeout : fallbackTimeoutMs;
  logClientSideRequestTimeout({
    source: "axios",
    timeoutMs,
    method: cfg?.method?.toUpperCase(),
    url: resolveAxiosRequestUrl(cfg),
    code: error.code,
    message: error.message,
  });
}

/**
 * Gọi khi `fetch` + `AbortController` hết hạn (cùng UX với `common.server_not_responding`).
 */
export function logFetchAbortTimeout(url: string, timeoutMs: number): void {
  logClientSideRequestTimeout({
    source: "fetch",
    timeoutMs,
    url,
    code: "AbortError",
    message: "Request aborted after timeout",
  });
}
