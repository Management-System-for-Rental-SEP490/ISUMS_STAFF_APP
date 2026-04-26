/**
 * API maintenance/job từ Backend.
 * - GET /api/maintenances/jobs/{jobId} - chi tiết job (dùng jobId từ work slot).
 * - PUT /api/maintenances/jobs/{jobId}/status?status={status} - cập nhật trạng thái job bảo trì.
 * - PUT /api/maintenances/inspections/{id}/status - cập nhật trạng thái kiểm định.
 * - GET /api/maintenances/inspections — danh sách (query tùy chọn).
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type {
  AssetEventsApiResponse,
  InspectionApiResponse,
  InspectionListApiResponse,
  JobApiResponse,
} from "../types/api";

/**
 * Lấy thông tin job theo jobId.
 */
export const getJobById = async (jobId: string): Promise<JobApiResponse> => {
  const path = `${BACKEND_API_BASE}/maintenances/jobs/${encodeURIComponent(jobId)}`;
  const response = await axiosClient.get<JobApiResponse>(path);
  return response.data;
};

/**
 * Chi tiết kiểm định theo id (GET /api/maintenances/inspections/{id}).
 */
export const getInspectionById = async (
  inspectionId: string
): Promise<InspectionApiResponse> => {
  const path = `${BACKEND_API_BASE}/maintenances/inspections/${encodeURIComponent(inspectionId)}`;
  const response = await axiosClient.get<InspectionApiResponse>(path);
  return response.data;
};

export type ListInspectionsQuery = {
  status?: string;
  contractId?: string;
  type?: string;
};

/**
 * Danh sách phiếu kiểm định (GET /api/maintenances/inspections).
 */
export const listInspections = async (
  query?: ListInspectionsQuery
): Promise<InspectionListApiResponse> => {
  const path = `${BACKEND_API_BASE}/maintenances/inspections`;
  const response = await axiosClient.get<InspectionListApiResponse>(path, {
    params: query,
  });
  return response.data;
};

/**
 * Sự kiện tài sản theo jobId (= inspection id CHECK_IN) — baseline CHECK_OUT.
 * GET /api/assets/events?jobId=
 */
export const getAssetEventsByJobId = async (
  jobId: string
): Promise<AssetEventsApiResponse> => {
  const path = `${BACKEND_API_BASE}/assets/events`;
  const response = await axiosClient.get<AssetEventsApiResponse>(path, {
    params: { jobId },
  });
  return response.data;
};

/** Trạng thái job bảo trì: SCHEDULED → IN_PROGRESS → COMPLETED */
export type JobStatusUpdate = "IN_PROGRESS" | "COMPLETED";

/** Trạng thái gửi lên PUT inspections/.../status: bắt đầu → IN_PROGRESS; hoàn tất → DONE */
export type InspectionStatusUpdate = "IN_PROGRESS" | "DONE";

/** Body bổ sung khi hoàn tất kiểm định (status DONE). */
export interface InspectionDonePayload {
  inspectionNotes?: string;
  deductionAmount?: number;
  photoUrls?: string[];
}

/**
 * Cập nhật trạng thái phiếu kiểm định.
 * PUT /api/maintenances/inspections/{id}/status
 */
export const updateInspectionStatus = async (
  inspectionId: string,
  status: InspectionStatusUpdate,
  done?: InspectionDonePayload
): Promise<InspectionApiResponse> => {
  const path = `${BACKEND_API_BASE}/maintenances/inspections/${encodeURIComponent(inspectionId)}/status`;
  const body: Record<string, unknown> = { status };
  if (status === "DONE" && done) {
    if (done.inspectionNotes !== undefined) body.inspectionNotes = done.inspectionNotes;
    if (done.deductionAmount !== undefined) body.deductionAmount = done.deductionAmount;
    if (done.photoUrls !== undefined) body.photoUrls = done.photoUrls;
  }
  const response = await axiosClient.put<InspectionApiResponse>(path, body);
  return response.data;
};

/**
 * Cập nhật trạng thái job.
 * PUT /api/maintenances/jobs/{jobId}/status?status={status}
 */
export const updateJobStatus = async (
  jobId: string,
  status: JobStatusUpdate
): Promise<{ success: boolean; message?: string }> => {
  const path = `${BACKEND_API_BASE}/maintenances/jobs/${encodeURIComponent(jobId)}/status`;
  const response = await axiosClient.put<{ success: boolean; message?: string }>(
    path,
    null,
    { params: { status } }
  );
  return response.data ?? { success: true };
};
