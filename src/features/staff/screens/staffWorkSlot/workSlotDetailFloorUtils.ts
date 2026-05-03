/**
 * Tiện ích sort / map tầng & id cho luồng bảo trì / kiểm định trong màn chi tiết ca.
 */

export function normalizeFloorForSort(v: string | null | undefined): string {
  return String(v ?? "").trim();
}

export function normalizeId(v: string | null | undefined): string {
  return String(v ?? "").trim();
}

export function compareFloor(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
