/**
 * Tiện ích cho response GET /api/schedules/work_slots/slots/me (và format tương thích generate).
 * Luồng issue: chỉ hiển thị/chọn slot có status AVAILABLE để đăng ký ticket.
 */
import type {
  GeneratedWorkSlotsDayFromApi,
  GeneratedWorkSlotTimeFromApi,
} from "../types/api";

export type AvailableGeneratedSlotChoice = {
  dateYmd: string;
  startTime: string;
  endTime: string;
  status: string;
  /** Nhãn hiển thị nhanh (VD: "30/03/2026 · 08:30 - 09:30"). */
  labelVi: string;
  /** Gợi ý payload ISO local khi BE nhận start/end (chưa có id slot). */
  startTimeLocalIso: string;
  endTimeLocalIso: string;
};

function trimTimeToHhMm(time: string): string {
  const t = time.trim();
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function formatSlotChoiceLabelVi(
  dateYmd: string,
  startTime: string,
  endTime: string
): string {
  const parts = dateYmd.split("-");
  const dd =
    parts.length === 3
      ? `${parts[2]}/${parts[1]}/${parts[0]}`
      : dateYmd;
  return `${dd} · ${trimTimeToHhMm(startTime)} - ${trimTimeToHhMm(endTime)}`;
}

function localIsoFromYmdAndTime(dateYmd: string, timeHms: string): string {
  const t = timeHms.trim();
  const body = t.length === 5 ? `${t}:00` : t;
  return `${dateYmd}T${body}`;
}

function isAvailableStatus(status: string): boolean {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "AVAILABLE" || normalized === "AVAIABLE";
}

const slotIdentity = (s: Pick<GeneratedWorkSlotTimeFromApi, "startTime" | "endTime">) =>
  `${s.startTime}\0${s.endTime}`;

/**
 * Gộp nhiều response tuần (GET slots/me gọi từng tuần) theo `date`, trùng slot thì chỉ giữ một bản.
 */
export function mergeGeneratedWorkSlotsDays(
  weeks: GeneratedWorkSlotsDayFromApi[][]
): GeneratedWorkSlotsDayFromApi[] {
  const byDate = new Map<string, Map<string, GeneratedWorkSlotTimeFromApi>>();
  for (const week of weeks) {
    for (const day of week) {
      if (!byDate.has(day.date)) byDate.set(day.date, new Map());
      const m = byDate.get(day.date)!;
      for (const slot of day.slots) {
        m.set(slotIdentity(slot), slot);
      }
    }
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => ({
      date,
      slots: Array.from(slots.values()),
    }));
}

/**
 * Gom mọi slot có status AVAILABLE để đổ FlatList / modal (giống logic mock chọn slot trống).
 */
export function listAvailableGeneratedSlotChoices(
  days: GeneratedWorkSlotsDayFromApi[] | null | undefined
): AvailableGeneratedSlotChoice[] {
  if (!days?.length) return [];
  const out: AvailableGeneratedSlotChoice[] = [];
  for (const day of days) {
    const dateYmd = day.date;
    for (const slot of day.slots) {
      if (!isAvailableStatus(slot.status)) continue;
      out.push({
        dateYmd,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        labelVi: formatSlotChoiceLabelVi(dateYmd, slot.startTime, slot.endTime),
        startTimeLocalIso: localIsoFromYmdAndTime(dateYmd, slot.startTime),
        endTimeLocalIso: localIsoFromYmdAndTime(dateYmd, slot.endTime),
      });
    }
  }
  return out;
}
