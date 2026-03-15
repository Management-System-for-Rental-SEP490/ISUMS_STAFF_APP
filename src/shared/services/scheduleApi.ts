/**
 * API lịch làm việc (schedule) từ Backend.
 * - GET /api/schedules/templates/current/{date} - mẫu lịch (giờ làm, ngày làm việc).
 * - GET /api/schedules/work_slots/staff/{staffId} - danh sách work slots của staff.
 */
import axiosClient from "../api/axiosClient";
import { USER_API_BASE } from "../api/config";
import type { ScheduleTemplateApiResponse, WorkSlotsApiResponse } from "../types/api";

/**
 * StaffId dùng để test. Sau này lấy từ userId trong JWT token.
 * @see useAuthStore - khi BE trả userId/sub trong token, decode và dùng thay thế.
 */
export const STAFF_ID_FOR_TEST = "11111111-1111-1111-1111-111111111111";

/**
 * Lấy staffId cho các API lịch làm việc.
 * Hiện tại: dùng giá trị cố định để test.
 * Sau này: lấy từ userId/sub trong JWT token (cần decode token từ useAuthStore).
 */
export function getStaffIdForSchedule(): string {
  // TODO: Khi BE hỗ trợ, lấy từ useAuthStore.getState() và decode JWT để lấy userId/sub
  return STAFF_ID_FOR_TEST;
}

/**
 * Lấy mẫu lịch làm việc hiện tại cho một ngày cụ thể.
 * Dùng để hiển thị lịch tuần của staff: giờ làm, ngày làm việc, slot, nghỉ giữa giờ.
 *
 * @param date Định dạng YYYY-MM-DD (ví dụ: "2026-03-18")
 * @returns Promise<ScheduleTemplateApiResponse>
 */
export const getCurrentScheduleTemplate = async (
  date: string
): Promise<ScheduleTemplateApiResponse> => {
  const response = await axiosClient.get<ScheduleTemplateApiResponse>(
    `${USER_API_BASE}/schedules/templates/current/${encodeURIComponent(date)}`
  );
  return response.data;
};

/**
 * Lấy danh sách work slots (các ca làm việc đã đặt) của staff.
 * Dùng để hiển thị lịch tuần: staff phải làm việc gì, khung giờ nào.
 *
 * @param staffId UUID của staff. Test: dùng STAFF_ID_FOR_TEST. Sau: lấy từ userId trong JWT.
 * @returns Promise<WorkSlotsApiResponse>
 */
export const getWorkSlotsByStaffId = async (
  staffId: string
): Promise<WorkSlotsApiResponse> => {
  const response = await axiosClient.get<WorkSlotsApiResponse>(
    `${USER_API_BASE}/schedules/work_slots/staff/${encodeURIComponent(staffId)}`
  );
  return response.data;
};
