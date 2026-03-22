/**
 * Chuyển WorkSlotFromApi (API) sang WorkSlot (hiển thị trên lịch).
 * Lọc theo tuần hiện tại.
 */
import type { WorkSlotFromApi } from "../../../shared/types/api";
import type { WorkSlot, SlotType } from "./mockStaffData";

/**
 * i18n keys cho jobType từ API (enum JobType: PERIODIC, MANUAL, MAINTENANCE, ISSUE).
 * Dùng cho CalendarScreen và bảng tóm tắt lịch ở Staff Home.
 */
const JOB_TYPE_KEYS: Record<string, string> = {
  PERIODIC: "staff_calendar.job_type_PERIODIC",
  MANUAL: "staff_calendar.job_type_MANUAL",
  MAINTENANCE: "staff_calendar.job_type_MAINTENANCE",
  ISSUE: "staff_calendar.job_type_ISSUE",
  INSPECTION: "staff_calendar.job_type_INSPECTION",
  NFC: "staff_calendar.job_type_NFC",
};

function parseIsoToParts(iso: string): { date: Date; year: number; month: number; day: number; hour: number; minute: number } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    date: d,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

/**
 * Chuyển WorkSlotFromApi sang WorkSlot (định dạng dùng cho CalendarScreen).
 */
export function mapWorkSlotFromApiToWorkSlot(api: WorkSlotFromApi): WorkSlot {
  const start = parseIsoToParts(api.startTime);
  const end = parseIsoToParts(api.endTime);
  const sd = start ?? { hour: 8, minute: 0, date: new Date(), year: 2026, month: 3, day: 13 };
  const ed = end ?? { hour: 9, minute: 0, date: new Date(), year: 2026, month: 3, day: 13 };

  const dayOfWeek = sd.date.getDay() === 0 ? 7 : sd.date.getDay();
  const dateStr = `${sd.day.toString().padStart(2, "0")}/${sd.month.toString().padStart(2, "0")}`;
  const startMinutes = sd.hour * 60 + sd.minute;
  const endMinutes = ed.hour * 60 + ed.minute;
  const timeRange = `${sd.hour.toString().padStart(2, "0")}:${sd.minute.toString().padStart(2, "0")} - ${ed.hour.toString().padStart(2, "0")}:${ed.minute.toString().padStart(2, "0")}`;

  const taskKey = JOB_TYPE_KEYS[api.jobType] ?? "staff_calendar.job_type_OTHER";
  const slotType: SlotType =
    api.jobType === "INSPECTION" || api.jobType === "PERIODIC" ? "inspection" : "ticket";

  return {
    id: api.id,
    dayOfWeek,
    date: dateStr,
    timeRange,
    startMinutes,
    endMinutes,
    // Lưu lại houseId (nếu BE trả) để UI có thể map sang tên nhà bằng danh sách houses.
    houseId: api.houseId,
    // buildingName sẽ được thay thế bằng tên hiển thị ở UI; tạm đặt "-" khi chưa map.
    buildingName: "-",
    task: api.jobType,
    taskKey,
    slotType,
    ticketId: api.jobId,
    status: api.status,
  };
}

/**
 * Lọc work slots nằm trong tuần hiện tại (T2–CN).
 */
export function filterWorkSlotsByCurrentWeek(apiSlots: WorkSlotFromApi[]): WorkSlotFromApi[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return apiSlots.filter((s) => {
    const d = new Date(s.startTime);
    return d >= monday && d <= sunday;
  });
}

/**
 * Lọc work slots theo tuần bắt đầu từ Thứ Hai.
 * @param apiSlots Danh sách work slots từ API.
 * @param weekStartDate Ngày Thứ Hai của tuần (YYYY-MM-DD).
 */
export function filterWorkSlotsByWeek(
  apiSlots: WorkSlotFromApi[],
  weekStartDate: string
): WorkSlotFromApi[] {
  const monday = new Date(weekStartDate);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return apiSlots.filter((s) => {
    const d = new Date(s.startTime);
    return d >= monday && d <= sunday;
  });
}

/**
 * Lọc theo tuần rồi map sang WorkSlot.
 */
export function mapWorkSlotsFromApiForWeek(
  apiSlots: WorkSlotFromApi[],
  weekStartDate: string
): WorkSlot[] {
  return filterWorkSlotsByWeek(apiSlots, weekStartDate).map(mapWorkSlotFromApiToWorkSlot);
}

/**
 * Lọc theo tuần hiện tại rồi map sang WorkSlot. Dùng cho StaffScheduleContext.
 */
export function mapWorkSlotsFromApiForCurrentWeek(apiSlots: WorkSlotFromApi[]): WorkSlot[] {
  return filterWorkSlotsByCurrentWeek(apiSlots).map(mapWorkSlotFromApiToWorkSlot);
}
