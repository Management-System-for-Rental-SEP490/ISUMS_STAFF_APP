/**
 * API maintenance/job từ Backend.
 * - GET /api/maintenances/jobs/{jobId} - chi tiết job (dùng jobId từ work slot).
 * - PUT /api/maintenances/jobs/{jobId}/status?status={status} - cập nhật trạng thái job.
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE, FALLBACK_BACKEND_URL } from "../api/config";
import type { JobApiResponse } from "../types/api";

/**
 * Lấy thông tin job theo jobId.
 * Dùng khi đã có jobId từ work slot (WorkSlotFromApi.jobId) để lấy chi tiết:
 * status, planId, houseId, periodStartDate, dueDate.
 *
 * @param jobId UUID của job (VD từ work slot API)
 * @returns Promise<JobApiResponse>
 */
export const getJobById = async (jobId: string): Promise<JobApiResponse> => {
  const response = await axiosClient.get<JobApiResponse>(
    // `${BACKEND_API_BASE}/maintenances/jobs/${encodeURIComponent(jobId)}`
    `${FALLBACK_BACKEND_URL}/maintenances/jobs/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

/** Trạng thái job có thể cập nhật: SCHEDULED → IN_PROGRESS → COMPLETED */
export type JobStatusUpdate = "IN_PROGRESS" | "COMPLETED";

/**
 * Cập nhật trạng thái job.
 * PUT /api/maintenances/jobs/{jobId}/status?status={status}
 * Chỉ job ở trạng thái SCHEDULED mới được cập nhật lên IN_PROGRESS;
 * IN_PROGRESS mới được cập nhật lên COMPLETED.
 */
export const updateJobStatus = async (
  jobId: string,
  status: JobStatusUpdate
): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.put<{ success: boolean; message?: string }>(
    // `${BACKEND_API_BASE}/maintenances/jobs/${encodeURIComponent(jobId)}/status`,
    `${FALLBACK_BACKEND_URL}/maintenances/jobs/${encodeURIComponent(jobId)}/status`,
    null,
    { params: { status } }
  );
  return response.data ?? { success: true };
};
