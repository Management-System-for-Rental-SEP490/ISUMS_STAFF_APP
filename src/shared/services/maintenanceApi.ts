/**
 * API maintenance/job từ Backend.
 * - GET /api/maintenances/jobs/{jobId} - chi tiết job (dùng jobId từ work slot).
 * - PUT /api/maintenances/jobs/{jobId}/status?status={status} - cập nhật trạng thái job bảo trì.
 * - PUT /api/maintenances/inspections/{id}/status - cập nhật trạng thái kiểm định.
 * - GET /api/maintenances/inspections — danh sách (query tùy chọn).
 */
import axiosClient from "../api/axiosClient";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../i18n";
import { toAppLocaleCode } from "../utils/resolveLocalizedJsonString";
import { logFetchAbortTimeout } from "../utils/clientNetworkTimeoutLog";
import {
  ASSET_IMAGE_UPLOAD_TIMEOUT_MS,
  BACKEND_API_BASE,
} from "../api/config";
import type {
  AssetEventsApiResponse,
  InspectionApiResponse,
  InspectionListApiResponse,
  JobApiResponse,
} from "../types/api";

export interface InspectionHousePhotoFile {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
    if (name === "AbortError") {
      logFetchAbortTimeout(url, timeoutMs);
      throw new Error(i18n.t("common.server_not_responding"));
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

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

export const uploadInspectionHousePhotos = async (
  inspectionId: string,
  files: InspectionHousePhotoFile[],
): Promise<InspectionApiResponse> => {
  const id = String(inspectionId ?? "").trim();
  if (!id) throw new Error("MISSING_INSPECTION_ID");
  if (!files?.length) throw new Error("MISSING_FILES");

  const token = useAuthStore.getState().token;
  if (!token) throw new Error("MISSING_AUTH_TOKEN");

  const url = `${BACKEND_API_BASE}/maintenances/inspections/${encodeURIComponent(id)}/house-photos`;
  const formData = new FormData();
  files.forEach((file, idx) => {
    const name = file.fileName ?? `house-${id}-${idx}.jpg`;
    const type = file.mimeType ?? "image/jpeg";
    formData.append(
      "files",
      {
        uri: file.uri,
        name,
        type,
      } as unknown as Blob,
    );
  });

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": toAppLocaleCode(i18n.language),
      },
      body: formData,
    },
    ASSET_IMAGE_UPLOAD_TIMEOUT_MS,
  );

  const rawText = await response.text();
  let parsed: InspectionApiResponse | null = null;
  try {
    parsed = rawText ? (JSON.parse(rawText) as InspectionApiResponse) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || parsed?.success === false) {
    throw new Error(parsed?.message || `Upload failed (HTTP ${response.status})`);
  }
  if (!parsed?.data) {
    throw new Error(parsed?.message || "Empty response");
  }
  return parsed;
};
