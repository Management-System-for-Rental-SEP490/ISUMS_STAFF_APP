// Cấu hình chung cho Backend API (base URL).
// Mục đích: chỉ khai báo 1 lần rồi dùng lại ở các service (houses, asset,...)
// để sau này nếu đổi domain/ngrok chỉ cần sửa ở đây.

/** URL ưu tiên (api-dev) — dùng trước. Một vài dữ liệu có thể chưa có trên api-dev. */
export const PRIMARY_BACKEND_URL = "https://api-dev.isums.pro/api";
/** URL dự phòng (ngrok) — khi primary thất bại (lỗi mạng, 5xx, 404...) thì thử ngrok. */
export const FALLBACK_BACKEND_URL = "https://unrestrictable-lan-syzygial.ngrok-free.dev/api";

/**
 * Base URL của Backend API — luôn dùng PRIMARY trước.
 * AxiosClient sẽ tự động retry với FALLBACK khi request tới PRIMARY thất bại.
 */
export const BACKEND_API_BASE = PRIMARY_BACKEND_URL;

/**
 * Base URL của API User (do dev khác làm, đường dẫn khác).
 * Dùng chung logic primary/fallback với houses.
 */
export const USER_API_BASE = PRIMARY_BACKEND_URL; 


/** true = gửi body PUT /api/asset/items/:id dạng snake_case (house_id, category_id...) để BE map được. */
export const ASSET_PUT_BODY_SNAKE_CASE =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE === "true";

// =========================================================
// AWS IoT API (telemetry WebSocket + usage REST)
// =========================================================

/**
 * URL WebSocket AWS API Gateway – nhận telemetry điện/nước realtime.
 * Ưu tiên biến môi trường EXPO_PUBLIC_IOT_WS_URL; không có thì dùng production.
 */
export const IOT_WS_URL =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_IOT_WS_URL
    ? process.env.EXPO_PUBLIC_IOT_WS_URL
    : "wss://a98erfaotg.execute-api.ap-southeast-1.amazonaws.com/production/";

/**
 * Base URL REST API AWS – endpoint usage (day/week/month) cho điện/nước.
 * Ưu tiên biến môi trường EXPO_PUBLIC_IOT_REST_BASE; không có thì dùng dev.
 */
export const IOT_REST_BASE =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_IOT_REST_BASE
    ? process.env.EXPO_PUBLIC_IOT_REST_BASE
    : "https://m0etrbg5l2.execute-api.ap-southeast-1.amazonaws.com/dev";

