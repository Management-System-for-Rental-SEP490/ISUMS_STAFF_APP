import type { FunctionalAreaFromApi, HouseFromApi } from "../types/api";

/**
 * Gộp khu vực chức năng theo đúng `houseId`:
 * - từ object nhà (GET /api/houses thường nhúng `functionalAreas`)
 * - từ GET /api/houses/functionalAreas/{houseId}
 *
 * Trùng `id` → ưu tiên bản từ endpoint (thường đầy đủ hơn).
 */
export function mergeFunctionalAreasForHouse(
  house: HouseFromApi | undefined,
  fromEndpoint: FunctionalAreaFromApi[] | null | undefined
): FunctionalAreaFromApi[] {
  const embedded = house?.functionalAreas ?? [];
  const fromApi = fromEndpoint ?? [];
  const map = new Map<string, FunctionalAreaFromApi>();
  for (const a of embedded) {
    if (a?.id) map.set(a.id, a);
  }
  for (const a of fromApi) {
    if (a?.id) map.set(a.id, a);
  }
  return Array.from(map.values());
}

/** Sắp xếp khu vực để hiển thị dropdown: tầng (floorNo) rồi tên. */
export function sortFunctionalAreasForDisplay(
  areas: FunctionalAreaFromApi[]
): FunctionalAreaFromApi[] {
  return [...areas].sort((a, b) => {
    const fa = String(a.floorNo ?? "").trim();
    const fb = String(b.floorNo ?? "").trim();
    const byFloor = fa.localeCompare(fb, undefined, { numeric: true, sensitivity: "base" });
    if (byFloor !== 0) return byFloor;
    return (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
  });
}
