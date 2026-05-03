import axiosClient from "../api/axiosClient";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../i18n";
import { toAppLocaleCode } from "../utils/resolveLocalizedJsonString";
import { logFetchAbortTimeout } from "../utils/clientNetworkTimeoutLog";
import {
  ASSET_IMAGE_UPLOAD_TIMEOUT_MS,
  BACKEND_API_BASE,
} from "../api/config";
import type { ApiResponse } from "../types/api";

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

export interface EContractSummaryFromApi {
  id: string;
  documentNo?: string | null;
  documentId?: string | null;
  name?: string | null;
  status?: string | null;
  houseId?: string | null;
  userId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
}

export interface RelocationEvidenceImage {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

export interface ReportLandlordFaultPayload {
  contractNumber: string;
  reportReason: string;
  recommendedHouseId?: string | null;
  evidenceFiles: RelocationEvidenceImage[];
}

export interface ReportLandlordFaultByIdPayload {
  contractId: string;
  reportReason: string;
  recommendedHouseId?: string | null;
  evidenceFiles: RelocationEvidenceImage[];
}

export interface ContractRelocationRequestFromApi {
  id: string;
  status: string;
  oldContractId?: string | null;
  oldContractNumber?: string | null;
  newContractId?: string | null;
  newContractNumber?: string | null;
  oldHouseId?: string | null;
  requestedHouseId?: string | null;
  approvedHouseId?: string | null;
  faultParty?: string | null;
  resolutionType?: string | null;
  staffReportReason?: string | null;
  staffEvidence?: string | null;
}

export const getActiveRelocationByContractId = async (
  contractId: string,
): Promise<ContractRelocationRequestFromApi | null> => {
  const id = String(contractId ?? "").trim();
  if (!id) return null;
  const url = `${BACKEND_API_BASE}/econtracts/${encodeURIComponent(id)}/relocation-requests/active`;
  const response = await axiosClient.get<ApiResponse<ContractRelocationRequestFromApi | null>>(url);
  if (response.data?.success && response.data.data) {
    return response.data.data;
  }
  return null;
};

export const getEContractById = async (
  contractId: string,
): Promise<EContractSummaryFromApi> => {
  const id = String(contractId ?? "").trim();
  if (!id) throw new Error("MISSING_CONTRACT_ID");
  const url = `${BACKEND_API_BASE}/econtracts/${encodeURIComponent(id)}`;
  const response = await axiosClient.get<ApiResponse<EContractSummaryFromApi>>(url);
  if (response.data?.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || "CONTRACT_FETCH_FAILED");
};

export const reportLandlordFaultRelocationByContractId = async (
  payload: ReportLandlordFaultByIdPayload,
): Promise<ContractRelocationRequestFromApi> => {
  const contractId = payload.contractId?.trim();
  const reportReason = payload.reportReason?.trim();
  if (!contractId) throw new Error("MISSING_CONTRACT_ID");
  if (!reportReason) throw new Error("MISSING_REPORT_REASON");
  if (!payload.evidenceFiles?.length) throw new Error("MISSING_EVIDENCE");

  const token = useAuthStore.getState().token;
  if (!token) throw new Error("MISSING_AUTH_TOKEN");

  const url = `${BACKEND_API_BASE}/econtracts/${encodeURIComponent(contractId)}/relocation-requests/staff-report`;
  const formData = new FormData();
  formData.append("reportReason", reportReason);
  if (payload.recommendedHouseId) {
    formData.append("recommendedHouseId", payload.recommendedHouseId);
  }
  payload.evidenceFiles.forEach((file, idx) => {
    const name = file.fileName ?? `evidence-${idx}.jpg`;
    const type = file.mimeType ?? "image/jpeg";
    formData.append(
      "evidenceFiles",
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
  let parsed: ApiResponse<ContractRelocationRequestFromApi> | null = null;
  try {
    parsed = rawText
      ? (JSON.parse(rawText) as ApiResponse<ContractRelocationRequestFromApi>)
      : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || parsed?.success === false) {
    throw new Error(parsed?.message || `Report failed (HTTP ${response.status})`);
  }
  if (!parsed?.data) {
    throw new Error(parsed?.message || "Empty response from server");
  }
  return parsed.data;
};

export const reportLandlordFaultRelocation = async (
  payload: ReportLandlordFaultPayload,
): Promise<ContractRelocationRequestFromApi> => {
  const contractNumber = payload.contractNumber?.trim();
  const reportReason = payload.reportReason?.trim();
  if (!contractNumber) throw new Error("MISSING_CONTRACT_NUMBER");
  if (!reportReason) throw new Error("MISSING_REPORT_REASON");
  if (!payload.evidenceFiles?.length) throw new Error("MISSING_EVIDENCE");

  const token = useAuthStore.getState().token;
  if (!token) throw new Error("MISSING_AUTH_TOKEN");

  const url = `${BACKEND_API_BASE}/econtracts/relocation-requests/staff-report`;

  const formData = new FormData();
  formData.append("contractNumber", contractNumber);
  formData.append("reportReason", reportReason);
  if (payload.recommendedHouseId) {
    formData.append("recommendedHouseId", payload.recommendedHouseId);
  }
  payload.evidenceFiles.forEach((file, idx) => {
    const name = file.fileName ?? `evidence-${idx}.jpg`;
    const type = file.mimeType ?? "image/jpeg";
    formData.append(
      "evidenceFiles",
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
  let parsed: ApiResponse<ContractRelocationRequestFromApi> | null = null;
  try {
    parsed = rawText
      ? (JSON.parse(rawText) as ApiResponse<ContractRelocationRequestFromApi>)
      : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || parsed?.success === false) {
    throw new Error(parsed?.message || `Report failed (HTTP ${response.status})`);
  }
  if (!parsed?.data) {
    throw new Error(parsed?.message || "Empty response from server");
  }
  return parsed.data;
};
