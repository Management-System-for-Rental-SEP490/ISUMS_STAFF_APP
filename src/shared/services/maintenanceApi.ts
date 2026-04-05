/**
 * API maintenance/job từ Backend.
 * - GET /api/maintenances/jobs/{jobId} - chi tiết job (dùng jobId từ work slot).
 * - PUT /api/maintenances/jobs/{jobId}/status?status={status} - cập nhật trạng thái job bảo trì.
 * - PUT /api/maintenances/inspections/{id}/status + body { status } - cập nhật trạng thái kiểm định (FALLBACK).
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE, FALLBACK_BACKEND_URL } from "../api/config";
import type { InspectionApiResponse, JobApiResponse } from "../types/api";

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
    `${BACKEND_API_BASE}/maintenances/jobs/${encodeURIComponent(jobId)}`
    //`${FALLBACK_BACKEND_URL}/maintenances/jobs/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

/**
 * Chi tiết kiểm định theo id (GET /api/maintenances/inspections/{id}).
 * Gọi qua FALLBACK_BACKEND_URL theo cấu hình BE dev/ngrok.
 */
export const getInspectionById = async (
  inspectionId: string
): Promise<InspectionApiResponse> => {
  const response = await axiosClient.get<InspectionApiResponse>(
    `${FALLBACK_BACKEND_URL}/maintenances/inspections/${encodeURIComponent(inspectionId)}`
  );
  return response.data;
};

/** Trạng thái job bảo trì: SCHEDULED → IN_PROGRESS → COMPLETED */
export type JobStatusUpdate = "IN_PROGRESS" | "COMPLETED";

/** Trạng thái gửi lên PUT inspections/.../status: bắt đầu → IN_PROGRESS; hoàn tất → DONE */
export type InspectionStatusUpdate = "IN_PROGRESS" | "DONE";

/**
 * Cập nhật trạng thái phiếu kiểm định.
 * PUT /api/maintenances/inspections/{id}/status — body `{ "status": "IN_PROGRESS" | "DONE" }`.
 */
export const updateInspectionStatus = async (
  inspectionId: string,
  status: InspectionStatusUpdate
): Promise<InspectionApiResponse> => {
  const response = await axiosClient.put<InspectionApiResponse>(
    `${FALLBACK_BACKEND_URL}/maintenances/inspections/${encodeURIComponent(inspectionId)}/status`,
    { status }
  );
  return response.data;
};

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
    `${BACKEND_API_BASE}/maintenances/jobs/${encodeURIComponent(jobId)}/status`,
    //`${FALLBACK_BACKEND_URL}/maintenances/jobs/${encodeURIComponent(jobId)}/status`,
    null,
    { params: { status } }
  );
  return response.data ?? { success: true };
};
