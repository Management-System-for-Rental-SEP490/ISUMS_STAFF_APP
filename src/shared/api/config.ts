// PRIMARY = API chung (users, houses, schedules, assets…). FALLBACK/ngrok = bản dev cục bộ (axios interceptor).

/**
 * Thời gian chờ tối đa (ms) cho mọi luồng tải dữ liệu (axios, pull-to-refresh/refetch, IoT REST usage…).
 * Đây là **trần**, không phải thời lượng tối thiểu: BE trả về sớm thì hiển thị ngay.
 * Quá hạn mà chưa có phản hồi → axios hủy request; UI dùng `common.server_not_responding`.
 */
export const DATA_LOAD_TIMEOUT_MS = 6000 as const;

/** Cùng giá trị với {@link DATA_LOAD_TIMEOUT_MS} — `axios` dùng làm `timeout` (hủy request nếu quá lâu). */
export const API_REQUEST_TIMEOUT_MS = DATA_LOAD_TIMEOUT_MS;

/**
 * Upload ảnh (multipart `fetch`) — tách khỏi trần JSON 4s vì file lớn có thể cần lâu hơn.
 */
export const ASSET_IMAGE_UPLOAD_TIMEOUT_MS = 120_000 as const;

/**
 * POST/PUT thiết bị — BE đôi khi phản hồi chậm hơn {@link DATA_LOAD_TIMEOUT_MS}; tránh cắt request sớm (RN hay báo `Network Error`).
 */
export const ASSET_ITEM_MUTATION_TIMEOUT_MS = 30_000 as const;

/**
 * HTTP tới Keycloak (token / userinfo) — tách khỏi {@link DATA_LOAD_TIMEOUT_MS} vì SSO thường chậm hơn API app;
 * nếu không đặt timeout, axios có thể treo lâu và timer màn Login báo nhầm "quá thời gian".
 */
export const KEYCLOAK_HTTP_TIMEOUT_MS = 30000 as const;

/**
 * GET /api/users/me khi đổi code / refresh token — cùng trần với mọi request BE ({@link DATA_LOAD_TIMEOUT_MS}).
 */
export const AUTH_PROFILE_FETCH_TIMEOUT_MS = DATA_LOAD_TIMEOUT_MS;

/**
 * Trần chờ toàn bộ `exchangeCodeForToken` trên màn Login trước khi báo timeout (phải ≥ tổng các bước tuần tự + dự phòng).
 */
export const LOGIN_OAUTH_EXCHANGE_DEADLINE_MS = 90000 as const;

/** Mặc định trùng môi trường Swagger/QA (api-dev). Production: đặt EXPO_PUBLIC_BACKEND_API_PRIMARY. */
const DEFAULT_PRIMARY = "https://api-dev.isums.pro/api";
const DEFAULT_FALLBACK = "https://unrestrictable-lan-syzygial.ngrok-free.dev/api";

function readEnvTrimmed(envKey: string, fallback: string): string {
  const v =
    typeof process !== "undefined" && process.env?.[envKey]
      ? String(process.env[envKey]).trim()
      : "";
  return v || fallback;
}

export const PRIMARY_BACKEND_URL = readEnvTrimmed(
  "EXPO_PUBLIC_BACKEND_API_PRIMARY",
  DEFAULT_PRIMARY
);

export const FALLBACK_BACKEND_URL = readEnvTrimmed(
  "EXPO_PUBLIC_BACKEND_API_FALLBACK",
  DEFAULT_FALLBACK
);

export const BACKEND_URL_PRIMARY = PRIMARY_BACKEND_URL;
export const BACKEND_URL_FALLBACK = FALLBACK_BACKEND_URL;

export const BACKEND_API_BASE = PRIMARY_BACKEND_URL;

const DEFAULT_IOT_WS =
  "wss://a98erfaotg.execute-api.ap-southeast-1.amazonaws.com/production/";
const DEFAULT_IOT_REST =
  "https://m0etrbg5l2.execute-api.ap-southeast-1.amazonaws.com/dev";

export const IOT_WS_URL = readEnvTrimmed("EXPO_PUBLIC_IOT_WS_URL", DEFAULT_IOT_WS);

export const IOT_REST_BASE = readEnvTrimmed(
  "EXPO_PUBLIC_IOT_REST_BASE",
  DEFAULT_IOT_REST
);

export const ASSET_PUT_BODY_SNAKE_CASE =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE === "true";

// --- Notification domain (đồng bộ tenant app) ---

function readEnvBool(envKey: string, fallback: boolean): boolean {
  const v =
    typeof process !== "undefined" && process.env?.[envKey] !== undefined
      ? String(process.env[envKey]).trim().toLowerCase()
      : "";
  if (v === "") return fallback;
  return v === "1" || v === "true" || v === "yes";
}

export const NOTIFICATION_REALTIME_ENABLED = readEnvBool(
  "EXPO_PUBLIC_NOTIFICATION_REALTIME_ENABLED",
  false
);

export const NOTIFICATION_DEVICE_TOKEN_ENABLED = readEnvBool(
  "EXPO_PUBLIC_NOTIFICATION_DEVICE_TOKEN_ENABLED",
  false
);

export const NOTIFICATION_POLL_FALLBACK_ENABLED = readEnvBool(
  "EXPO_PUBLIC_NOTIFICATION_POLL_FALLBACK_ENABLED",
  true
);

const staffPollMs = (() => {
  const v =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_NOTIFICATION_POLL_INTERVAL_MS
      ? Number(process.env.EXPO_PUBLIC_NOTIFICATION_POLL_INTERVAL_MS)
      : NaN;
  const n = Number.isFinite(v) ? v : 20000;
  return Math.min(30_000, Math.max(10_000, n));
})();

export const NOTIFICATION_POLL_INTERVAL_MS = staffPollMs;

export const NOTIFICATION_READ_ALL_AVAILABLE = readEnvBool(
  "EXPO_PUBLIC_NOTIFICATION_READ_ALL_AVAILABLE",
  false
);

export const NOTIFICATION_STREAM_URL = readEnvTrimmed(
  "EXPO_PUBLIC_NOTIFICATION_STREAM_URL",
  ""
);

const staffIdleMs = (() => {
  const v =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_NOTIFICATION_STREAM_IDLE_MS
      ? Number(process.env.EXPO_PUBLIC_NOTIFICATION_STREAM_IDLE_MS)
      : NaN;
  const n = Number.isFinite(v) ? v : 180_000;
  return Math.min(600_000, Math.max(60_000, n));
})();

export const NOTIFICATION_STREAM_IDLE_MS = staffIdleMs;

const staffStreamMaxRetries = (() => {
  const v =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_NOTIFICATION_STREAM_MAX_RETRIES
      ? Number(process.env.EXPO_PUBLIC_NOTIFICATION_STREAM_MAX_RETRIES)
      : NaN;
  const n = Number.isFinite(v) ? v : 12;
  return Math.min(50, Math.max(1, Math.floor(n)));
})();

export const NOTIFICATION_STREAM_MAX_RETRIES = staffStreamMaxRetries;

const rawMalformed = (() => {
  const v =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_NOTIFICATION_STREAM_MAX_MALFORMED_STREAK
      ? Number(process.env.EXPO_PUBLIC_NOTIFICATION_STREAM_MAX_MALFORMED_STREAK)
      : NaN;
  const n = Number.isFinite(v) ? v : 20;
  return Math.min(100, Math.max(5, Math.floor(n)));
})();

export const NOTIFICATION_STREAM_MAX_MALFORMED_STREAK = rawMalformed;
