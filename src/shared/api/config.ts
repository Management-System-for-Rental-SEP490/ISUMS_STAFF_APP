// PRIMARY = API chung (users, houses, schedules…). FALLBACK/ngrok = bản dev cục bộ.
// Module asset (/assets/*) mặc định gọi ASSETS_API_BASE (= fallback) khi asset chưa merge lên primary.

/**
 * Thời gian chờ tối đa (ms) cho mọi luồng tải dữ liệu (axios, pull-to-refresh/refetch, IoT REST usage…).
 * Đây là **trần**, không phải thời lượng tối thiểu: BE trả về sớm thì hiển thị ngay, không ép chờ 4 giây.
 * Quá hạn mà chưa có phản hồi hợp lệ → coi như không có dữ liệu; người dùng tải lại (vào lại trang / kéo refresh).
 */
export const DATA_LOAD_TIMEOUT_MS = 4000 as const;

/** Cùng giá trị với {@link DATA_LOAD_TIMEOUT_MS} — `axios` dùng làm `timeout` (hủy request nếu quá lâu). */
export const API_REQUEST_TIMEOUT_MS = DATA_LOAD_TIMEOUT_MS;

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

/**
 * Base cho mọi route `/assets/*` (items, tags, categories, iot trong asset module).
 * Mặc định = FALLBACK (ngrok) vì asset thường chưa deploy cùng primary.
 * Khi đã merge: đặt `EXPO_PUBLIC_ASSETS_API_BASE` = URL primary hoặc để trống và đổi default bên dưới.
 */
export const ASSETS_API_BASE = readEnvTrimmed(
  "EXPO_PUBLIC_ASSETS_API_BASE",
  FALLBACK_BACKEND_URL
);

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
