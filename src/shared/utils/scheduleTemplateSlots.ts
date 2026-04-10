/**
 * Logic thuần từ ScheduleTemplate (GET /api/schedules/templates/current/{date}):
 * parse giờ, ngày làm việc, sinh các khung phút (slot + buffer, trừ giờ nghỉ),
 * và khung đề xuất theo từng ngày (YYYY-MM-DD) để map sang work slot / UI.
 */
import type { ScheduleTemplateData } from "../types/api";
import { formatTimeRangeFromMinutes } from "./dateTimeFormat";

/** Một khung thời gian trong ngày (phút từ 0h), chưa gắn calendar date. */
export type TemplateSlotMinuteRange = {
  startMinutes: number;
  endMinutes: number;
};

/** Khung giờ đề xuất cho một ngày cụ thể (gửi BE hoặc hiển thị). */
export type ProposedTemplateSlotFrame = {
  dateYmd: string;
  startMinutes: number;
  endMinutes: number;
  timeRange: string;
  /** Thứ tự slot trong ngày đó (1-based). */
  slotIndexInDay: number;
  /** ISO local naive "YYYY-MM-DDTHH:mm:ss" — khớp kiểu BE thường dùng cho startTime/endTime. */
  startTimeLocalIso: string;
  endTimeLocalIso: string;
};

const DEFAULT_TIME_FALLBACK_MINUTES = 8 * 60;

/** Parse "HH:mm" hoặc "HH:mm:ss" (BE) → phút từ 0h. */
export function parseScheduleTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return DEFAULT_TIME_FALLBACK_MINUTES;
  const [, h, m] = match.map(Number);
  return h * 60 + m;
}

/** Map JS getDay() (0=CN … 6=T7) → convention template (1=T2 … 7=CN). */
export function templateDayOfWeekFromJsDate(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Khoảng ngày T2 → T7 (cùng tuần lịch với `reference`), timezone local.
 * Khớp API đăng ký slot (BE không trả Chủ nhật).
 */
export function getWorkWeekMonToSatYmd(
  reference: Date = new Date()
): { startYmd: string; endYmd: string } {
  const monday = new Date(reference);
  const dow = monday.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + toMonday);
  monday.setHours(12, 0, 0, 0);
  const saturday = new Date(monday);
  saturday.setDate(saturday.getDate() + 5);
  return { startYmd: formatLocalYmd(monday), endYmd: formatLocalYmd(saturday) };
}

/**
 * Tuần làm việc hiện tại + tuần sau: T2 (tuần này) → T7 (tuần sau), timezone local.
 * Dùng cho GET .../slots/me (khoảng rộng hơn một tuần).
 */
export function getThisAndNextWorkWeekMonToSatYmd(
  reference: Date = new Date()
): { startYmd: string; endYmd: string } {
  const monday = new Date(reference);
  const dow = monday.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + toMonday);
  monday.setHours(12, 0, 0, 0);
  const saturdayNextWeek = new Date(monday);
  saturdayNextWeek.setDate(saturdayNextWeek.getDate() + 12);
  return { startYmd: formatLocalYmd(monday), endYmd: formatLocalYmd(saturdayNextWeek) };
}

/** Cộng/trừ ngày trên chuỗi YYYY-MM-DD (local). */
export function addDaysToYmd(ymd: string, deltaDays: number): string {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalYmd(d);
}

/**
 * Parse workingDays "MON,TUE,..." → Set<number> với 1=T2 … 7=CN.
 */
export function parseScheduleWorkingDaysToSet(workingDays: string): Set<number> {
  const map: Record<string, number> = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 7,
  };
  const set = new Set<number>();
  workingDays.split(",").forEach((d) => {
    const key = d.trim().toUpperCase();
    if (map[key] != null) set.add(map[key]);
  });
  return set;
}

export function isYmdWorkingDay(
  dateYmd: string,
  workingDaysSet: Set<number>
): boolean {
  const [y, mo, day] = dateYmd.split("-").map(Number);
  if (!y || !mo || !day) return false;
  const d = new Date(y, mo - 1, day);
  return workingDaysSet.has(templateDayOfWeekFromJsDate(d));
}

/**
 * Sinh các khung phút trong một ngày làm việc từ template:
 * - openTime → breakStart: lặp slotMinutes + bufferMinutes
 * - breakEnd → closeTime: tương tự
 * Slot sát break/close có thể ngắn hơn slotMinutes (cắt tại breakStart/closeTime).
 */
export function buildScheduleTemplateMinuteRanges(
  template: ScheduleTemplateData
): TemplateSlotMinuteRange[] {
  const open = parseScheduleTimeToMinutes(template.openTime);
  const breakStart = parseScheduleTimeToMinutes(template.breakStart);
  const breakEnd = parseScheduleTimeToMinutes(template.breakEnd);
  const close = parseScheduleTimeToMinutes(template.closeTime);
  const slotM = template.slotMinutes || 60;
  const bufferM = template.bufferMinutes ?? 0;
  const ranges: TemplateSlotMinuteRange[] = [];

  let m = open;
  while (m < breakStart) {
    const end = Math.min(m + slotM, breakStart);
    ranges.push({ startMinutes: m, endMinutes: end });
    m = end + bufferM;
  }

  m = breakEnd;
  while (m < close) {
    const end = Math.min(m + slotM, close);
    ranges.push({ startMinutes: m, endMinutes: end });
    m = end + bufferM;
  }
  return ranges;
}

function minutesToLocalHhMmSs(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const mi = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${mi.toString().padStart(2, "0")}:00`;
}

/**
 * Với danh sách ngày YYYY-MM-DD, trả về mọi khung slot theo template (bỏ ngày không thuộc workingDays).
 */
export function buildProposedSlotFramesForDatesYmd(
  datesYmd: string[],
  template: ScheduleTemplateData
): ProposedTemplateSlotFrame[] {
  const workSet = parseScheduleWorkingDaysToSet(template.workingDays);
  const minuteRanges = buildScheduleTemplateMinuteRanges(template);
  const out: ProposedTemplateSlotFrame[] = [];

  for (const dateYmd of datesYmd) {
    if (!isYmdWorkingDay(dateYmd, workSet)) continue;
    let idx = 0;
    for (const r of minuteRanges) {
      idx += 1;
      out.push({
        dateYmd,
        startMinutes: r.startMinutes,
        endMinutes: r.endMinutes,
        timeRange: formatTimeRangeFromMinutes(r.startMinutes, r.endMinutes),
        slotIndexInDay: idx,
        startTimeLocalIso: `${dateYmd}T${minutesToLocalHhMmSs(r.startMinutes)}`,
        endTimeLocalIso: `${dateYmd}T${minutesToLocalHhMmSs(r.endMinutes)}`,
      });
    }
  }
  return out;
}

/**
 * Tiện ích: mọi ngày YYYY-MM-DD từ startYmd đến endYmd (inclusive), bước 1 ngày.
 */
export function enumerateDatesYmdInclusive(
  startYmd: string,
  endYmd: string
): string[] {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return [];
  if (cur.getTime() > end.getTime()) return [];
  const list: string[] = [];
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = (cur.getMonth() + 1).toString().padStart(2, "0");
    const day = cur.getDate().toString().padStart(2, "0");
    list.push(`${y}-${m}-${day}`);
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}
