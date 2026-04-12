/**
 * Log debug cho luồng kiểm định / batch asset — dễ theo dõi trên Metro khi chưa có BE ổn định.
 * Bật mặc định trong __DEV__; có thể tắt bằng EXPO_PUBLIC_INSPECTION_DEBUG_LOG=false.
 *
 * Log API maintenance (getJobById / getInspectionById, …) chỉ in khi đang trong phiên luồng kiểm định
 * (màn chi tiết slot INSPECTION, InspectionConfirm, hoặc đồng bộ sau hoàn tất) — tránh spam khi enrich lịch Home.
 */
const ENABLED =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  (process.env.EXPO_PUBLIC_INSPECTION_DEBUG_LOG === undefined ||
    process.env.EXPO_PUBLIC_INSPECTION_DEBUG_LOG === "true" ||
    process.env.EXPO_PUBLIC_INSPECTION_DEBUG_LOG === "1");

let inspectionFlowDebugDepth = 0;

/** Bật log API kiểm định cho một phạm vi (dùng cặp với pop; có thể lồng nhau). */
export function pushInspectionFlowDebugSession(): void {
  inspectionFlowDebugDepth += 1;
}

export function popInspectionFlowDebugSession(): void {
  inspectionFlowDebugDepth = Math.max(0, inspectionFlowDebugDepth - 1);
}

function isInspectionFlowDebugEnabled(): boolean {
  return ENABLED && inspectionFlowDebugDepth > 0;
}

export type InspectionLogPrefix =
  | "[Inspection]"
  | "[AssetBatch]"
  | "[InspectionConfirm]"
  | "[InspectionUpload]"
  | "[AssetEvents]"
  | "[TenantAccess]";

function safeJson(x: unknown): string {
  try {
    if (x === undefined) return "undefined";
    const s = JSON.stringify(x);
    return s.length > 2000 ? `${s.slice(0, 2000)}…` : s;
  } catch {
    return String(x);
  }
}

export function logInspectionDebug(
  prefix: InspectionLogPrefix,
  message: string,
  details?: Record<string, unknown>
): void {
  if (!ENABLED) return;
  if (details && Object.keys(details).length > 0) {
    // eslint-disable-next-line no-console
    console.log(prefix, message, safeJson(details));
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, message);
  }
}

/** Giống logInspectionDebug nhưng chỉ khi đang trong phiên luồng kiểm định (xem pushInspectionFlowDebugSession). */
export function logInspectionFlowDebug(
  prefix: InspectionLogPrefix,
  message: string,
  details?: Record<string, unknown>
): void {
  if (!isInspectionFlowDebugEnabled()) return;
  if (details && Object.keys(details).length > 0) {
    // eslint-disable-next-line no-console
    console.log(prefix, message, safeJson(details));
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, message);
  }
}

export function logInspectionError(
  prefix: InspectionLogPrefix,
  message: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  if (!ENABLED) return;
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn(prefix, message, msg, extra ? safeJson(extra) : "");
}
