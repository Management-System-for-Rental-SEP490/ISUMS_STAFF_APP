/**
 * Chuẩn hóa và nhãn i18n cho status lịch / job / ticket (dùng chung màn chi tiết ca & section con).
 */

/** Chuẩn hóa status từ BE (trim, uppercase, khoảng trắng → _). */
export function normalizeScheduleStatusKey(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Work slot / job status từ API schedules (ISSUE, MAINTENANCE, INSPECTION). */
export const JOB_STATUS_KEYS = new Set([
  "PENDING",
  "WAITING_MANAGER_CONFIRM",
  "WAITING_STAFF_COMPLETION",
  "BOOKED",
  "BLOCKED",
  "NEED_RESCHEDULE",
  "CANCELLED",
  "DONE",
  "CREATED",
  "CONFIRMED",
  "SCHEDULED",
  "IN_PROGRESS",
  "APPROVED",
  "COMPLETED",
  "FAILED",
  "OVERDUE",
  "AVAILABLE",
]);

/**
 * Trạng thái job bảo trì / kiểm định mà staff được bấm «Bắt đầu ca» (API chuyển sang IN_PROGRESS).
 *
 * **Vì sao không chỉ `SCHEDULED`:** lịch và BE có thể trả CREATED, BOOKED, CONFIRMED, AVAILABLE…
 * khi ca đã được xếp nhưng chưa bắt đầu; chỉ so `SCHEDULED` khiến nút bắt đầu ẩn dù chưa hoàn tất.
 */
export const MAINTENANCE_INSPECTION_STARTABLE_JOB_STATUSES = new Set<string>([
  "SCHEDULED",
  "CREATED",
  "CONFIRMED",
  "BOOKED",
  "AVAILABLE",
  "PENDING",
  "APPROVED",
  "OVERDUE",
]);

export function isMaintenanceInspectionStartableJobStatus(status: string | undefined): boolean {
  return MAINTENANCE_INSPECTION_STARTABLE_JOB_STATUSES.has(normalizeScheduleStatusKey(status));
}

export function getJobStatusLabel(status: string | undefined, t: (k: string) => string): string {
  if (!status) return t("staff_calendar.job_status_OTHER");
  const normalized = normalizeScheduleStatusKey(status);
  const key = `staff_calendar.job_status_${normalized}`;
  return JOB_STATUS_KEYS.has(normalized) ? t(key) : t("staff_calendar.job_status_OTHER");
}

/** Trạng thái ticket issue (staff_ticket_list); không khớp thì fallback cùng bộ nhãn work slot. */
export function getIssueStatusLabel(status: string | undefined, t: (k: string) => string): string {
  if (!status) return "";
  const normalized = normalizeScheduleStatusKey(status);
  const i18nKey = `staff_ticket_list.status_${normalized}`;
  const translated = t(i18nKey);
  if (translated !== i18nKey) return translated;
  return getJobStatusLabel(status, t);
}

/** Nhãn hiển thị cho `InspectionFromApi.type` (CHECK_IN / CHECK_OUT). */
export function getInspectionTypeDisplay(type: string | null | undefined, t: (k: string) => string): string {
  const key = normalizeScheduleStatusKey(type ?? undefined);
  if (key === "CHECK_IN") return t("staff_work_slot_detail.inspection_type_CHECK_IN");
  if (key === "CHECK_OUT") return t("staff_work_slot_detail.inspection_type_CHECK_OUT");
  const raw = String(type ?? "").trim();
  return raw || "—";
}
