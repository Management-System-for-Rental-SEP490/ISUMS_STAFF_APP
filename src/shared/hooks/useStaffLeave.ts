import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeaveRequestsByStaffId,
  getStaffIdForSchedule,
  createLeaveRequest,
  updateLeaveRequestStatus,
} from "../services/scheduleApi";
import type {
  LeaveRequestsApiResponse,
  LeaveRequestFromApi,
  CreateLeaveRequestPayload,
  UpdateLeaveRequestResponse,
} from "../types/api";

/**
 * React Query keys cho tất cả API liên quan lịch nghỉ của staff.
 */
export const STAFF_LEAVE_KEYS = {
  all: ["staffLeave"] as const,
  list: () => [...STAFF_LEAVE_KEYS.all, "list"] as const,
};

/**
 * Hook lấy danh sách yêu cầu nghỉ của staff hiện tại.
 * - Dùng GET /api/schedules/leave/staff/{staffId}.
 * - Tự động gắn staffId nội bộ bằng getStaffIdForSchedule().
 */
export const useLeaveRequests = () => {
  const staffId = getStaffIdForSchedule();

  return useQuery<LeaveRequestsApiResponse>({
    queryKey: STAFF_LEAVE_KEYS.list(),
    queryFn: () => getLeaveRequestsByStaffId(staffId),
  });
};

/**
 * Hook tạo yêu cầu nghỉ mới (POST /api/schedules/leave).
 * - Sau khi tạo thành công sẽ invalidate danh sách yêu cầu nghỉ.
 */
export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  const staffId = getStaffIdForSchedule();

  return useMutation({
    mutationFn: (payload: Omit<CreateLeaveRequestPayload, "staffId">) =>
      createLeaveRequest({
        staffId,
        ...payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_LEAVE_KEYS.list() });
    },
  });
};

/**
 * Hook cập nhật trạng thái yêu cầu nghỉ (PUT /api/schedules/leave/{id}/status).
 * - Ví dụ: staff tự hủy yêu cầu PENDING → CANCELLED.
 * - Sau khi cập nhật thành công sẽ invalidate danh sách yêu cầu nghỉ.
 */
export const useUpdateLeaveRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateLeaveRequestResponse,
    unknown,
    { id: string }
  >({
    mutationFn: ({ id }) =>
      updateLeaveRequestStatus(id, {
        status: "CANCELLED",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_LEAVE_KEYS.list() });
    },
  });
};

