/**
 * API lịch làm việc (schedule) từ Backend.
 * - GET /api/schedules/templates/current/{date} - mẫu lịch (giờ làm, ngày làm việc).
 * - GET /api/schedules/work_slots/staff - danh sách work slots đã gán (staff từ token).
 * - GET /api/schedules/work_slots/generate?start=&end= - slot theo ngày (AVAILABLE, …) cho đăng ký issue.
 * - POST /api/schedules/work_slots/staff/confirm — staff đăng ký giờ xử lý ticket (`jobId` = ticket id).
 */
import axiosClient from "../api/axiosClient";
import { FALLBACK_BACKEND_URL } from "../api/config";
import { useAuthStore } from "../../store/useAuthStore";
import type {
  ScheduleTemplateApiResponse,
  WorkSlotsApiResponse,
  GenerateWorkSlotsApiResponse,
  LeaveRequestsApiResponse,
  CreateLeaveRequestPayload,
  CreateLeaveRequestResponse,
  UpdateLeaveRequestPayload,
  UpdateLeaveRequestResponse,
  ConfirmStaffWorkSlotPayload,
  ConfirmStaffWorkSlotResponse,
} from "../types/api";

/**
 * Lấy staffId cho các API lịch làm việc.
 * Backend đang trả `staff id` (userId/sub) trong token -> client decode JWT để lấy.
 */
export function getStaffIdForSchedule(): string {
  const { token, idToken } = useAuthStore.getState();
  const jwt = idToken || token;
  if (!jwt) return "";

  const decoded = decodeJWT(jwt);
  // BE hiện trả staff id ở claim `userId`.
  // Vẫn giữ fallback để tương thích môi trường cũ.
  const staffId =
    typeof decoded?.userId === "string"
      ? decoded.userId
      : typeof decoded?.sub === "string"
        ? decoded.sub
        : typeof decoded?.userid === "string"
          ? decoded.userid
          : "";

  return staffId;
}

// Decode JWT token (không verify chữ ký) để lấy claims.
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // React Native: dùng atob nếu có, hoặc Buffer nếu môi trường có polyfill.
    const decodedBase64 =
      typeof atob === "function"
        ? atob(base64)
        : typeof Buffer !== "undefined"
          ? Buffer.from(base64, "base64").toString("utf8")
          : null;

    if (!decodedBase64) return null;

    const jsonPayload = decodeURIComponent(
      decodedBase64
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
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
    `${FALLBACK_BACKEND_URL}/schedules/templates/current/${encodeURIComponent(date)}`
  );
  return response.data;
};

/**
 * Lấy danh sách work slots (các ca làm việc đã đặt) của staff.
 * Dùng để hiển thị lịch tuần: staff phải làm việc gì, khung giờ nào.
 *
 * @param _staffId UUID của staff (lấy từ userId/sub trong token).
 * @returns Promise<WorkSlotsApiResponse>
 */
export const getWorkSlotsByStaffId = async (
  _staffId: string
): Promise<WorkSlotsApiResponse> => {
  // API mới: backend lấy staff từ token nên URL không còn cần staffId trong path.
  // (BE: GET /api/schedules/work_slots/staff)
  const response = await axiosClient.get<WorkSlotsApiResponse>(
    `${FALLBACK_BACKEND_URL}/schedules/work_slots/staff`
  );
  return response.data;
};

/**
 * Sinh danh sách khung giờ làm việc trong khoảng ngày (theo template + trạng thái slot).
 * Dùng cho luồng issue: staff chọn slot AVAILABLE để đăng ký xử lý ticket (sau này POST/PUT do BE).
 *
 * @param startYmd endYmd Định dạng YYYY-MM-DD, inclusive.
 */
export const getGeneratedWorkSlots = async (
  startYmd: string,
  endYmd: string
): Promise<GenerateWorkSlotsApiResponse> => {
  const response = await axiosClient.get<GenerateWorkSlotsApiResponse>(
    `${FALLBACK_BACKEND_URL}/schedules/work_slots/generate`,
    { params: { start: startYmd, end: endYmd } }
  );
  return response.data;
};

/**
 * Staff xác nhận khung giờ xử lý ticket (issue). `jobId` = id ticket.
 */
export const confirmStaffWorkSlotForJob = async (
  payload: ConfirmStaffWorkSlotPayload
): Promise<ConfirmStaffWorkSlotResponse> => {
  const response = await axiosClient.post<ConfirmStaffWorkSlotResponse>(
    `${FALLBACK_BACKEND_URL}/schedules/work_slots/staff/confirm`,
    payload
  );
  return response.data;
};

/**
 * Lấy danh sách yêu cầu nghỉ của staff.
 * Dùng để hiển thị "Xem yêu cầu nghỉ" và lấy ngày nghỉ đã duyệt cho lịch.
 *
 * @param staffId UUID của staff.
 * @returns Promise<LeaveRequestsApiResponse>
 */
export const getLeaveRequestsByStaffId = async (
  staffId: string,
  /** Tham số cache-bust để tránh lấy dữ liệu cũ khi refresh sau khi manager duyệt */
  cacheBust?: number
): Promise<LeaveRequestsApiResponse> => {
  const url = `${FALLBACK_BACKEND_URL}/schedules/leave/staff/${encodeURIComponent(staffId)}`;
  const response = await axiosClient.get<LeaveRequestsApiResponse>(url, {
    params: cacheBust != null ? { _: cacheBust } : undefined,
  });
  return response.data;
};

/**
 * Tạo yêu cầu nghỉ mới. POST /api/schedules/leave
 * Body: staffId, leaveDate (YYYY-MM-DD), note
 */
export const createLeaveRequest = async (
  payload: CreateLeaveRequestPayload
): Promise<CreateLeaveRequestResponse> => {
  const response = await axiosClient.post<CreateLeaveRequestResponse>(
    `${FALLBACK_BACKEND_URL}/schedules/leave`,
    payload
  );
  return response.data;
};

/**
 * Cập nhật trạng thái yêu cầu nghỉ. PUT /api/schedules/leave/{id}
 * Chỉ request PENDING mới có thể chuyển sang CANCELLED (staff tự hủy).
 */
export const updateLeaveRequestStatus = async (
  leaveRequestId: string,
  payload: UpdateLeaveRequestPayload
): Promise<UpdateLeaveRequestResponse> => {
  const response = await axiosClient.put<UpdateLeaveRequestResponse>(
    `${FALLBACK_BACKEND_URL}/schedules/leave/${encodeURIComponent(leaveRequestId)}/status`,
    payload
  );
  return response.data;
};
