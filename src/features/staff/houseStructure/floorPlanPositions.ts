/**
 * Vị trí khu vực trên sơ đồ (Cover_Floor_Plan.png, viewBox 0–100).
 * Ưu tiên `position` từ BE; không có thì map theo areaType; vẫn thiếu thì slot theo index.
 */
import type { FunctionalAreaFromApi, FunctionalAreaPosition } from "../../../shared/types/api";

/** width/height của assets/Cover_Floor_Plan.png (945×831). */
export const FLOOR_PLAN_IMAGE_ASPECT = 945 / 831;

const SLOTS_BY_AREA_TYPE: Record<string, FunctionalAreaPosition> = {
  BEDROOM: { x: 4, y: 20, width: 30, height: 34 },
  KITCHEN: { x: 45, y: 20, width: 30, height: 34 },
  BATHROOM: { x: 70, y: 20, width: 34, height: 34 },
  LIVINGROOM: { x: 2, y: 53, width: 46, height: 34 },
  HALLWAY: { x: 54, y: 53, width: 46, height: 34 },
};

const FALLBACK_SLOTS: FunctionalAreaPosition[] = [
  { x: 2, y: 14, width: 30, height: 34 },
  { x: 27, y: 14, width: 30, height: 34 },
  { x: 58, y: 14, width: 34, height: 34 },
  { x: 2, y: 55, width: 46, height: 34 },
  { x: 52, y: 55, width: 46, height: 34 },
];

export function getPositionForArea(
  area: FunctionalAreaFromApi,
  index: number
): FunctionalAreaPosition {
  if (area.position) {
    return area.position;
  }
  const slot = SLOTS_BY_AREA_TYPE[area.areaType ?? ""];
  if (slot) return slot;
  return FALLBACK_SLOTS[index % FALLBACK_SLOTS.length];
}
