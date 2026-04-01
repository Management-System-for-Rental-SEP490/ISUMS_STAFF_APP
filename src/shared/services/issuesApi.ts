/**
 * API Issue/Ticket từ Backend.
 * - GET /api/issues/tickets/{ticketId} - chi tiết ticket/issue
 * - PUT /api/issues/tickets/{ticketId}/status?status={status} - cập nhật trạng thái (nếu BE hỗ trợ)
 */
import axiosClient from "../api/axiosClient";
import { ASSETS_API_BASE, BACKEND_API_BASE, FALLBACK_BACKEND_URL } from "../api/config";
import type {
  ApiResponse,
  CreateIssueQuoteApiResponse,
  CreateIssueQuotePayload,
  IssueBannerFromApi,
  IssueTicketApiResponse,
  IssueTicketFromApi,
  IssueTicketListApiResponse,
  IssueTicketListItemFromApi,
  IssueTicketStatusUpdate,
} from "../types/api";

export type IssueTicketImageFromApi = {
  id: string;
  url: string;
  createdAt?: string | null;
};

/**
 * Lấy danh sách ảnh đính kèm theo ticket/issue.
 * Endpoint: GET /issues/tickets/:id/images
 */
export const getIssueTicketImages = async (
  ticketId: string,
): Promise<IssueTicketImageFromApi[]> => {
  if (!ticketId?.trim()) return [];

  const url = `${FALLBACK_BACKEND_URL}/issues/tickets/${encodeURIComponent(ticketId)}/images`;
  const response = await axiosClient.get<ApiResponse<IssueTicketImageFromApi[]>>(url);

  if (response.data?.success && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
};

/**
 * Lấy chi tiết ticket/issue theo id.
 */
export const getIssueTicketById = async (
  ticketId: string
): Promise<IssueTicketApiResponse> => {
  const response = await axiosClient.get<IssueTicketApiResponse>(
    `${FALLBACK_BACKEND_URL}/issues/tickets/${encodeURIComponent(ticketId)}`
  );
  return response.data;
};

/**
 * Cập nhật trạng thái ticket/issue.
 *
 * Endpoint suy đoán theo pattern /maintenances/jobs/{jobId}/status.
 * Nếu BE không đúng route này, chỉ cần sửa lại ở service.
 */
export const updateIssueTicketStatus = async (
  ticketId: string,
  status: IssueTicketStatusUpdate
): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.put<{ success: boolean; message?: string }>(
    `${FALLBACK_BACKEND_URL}/issues/tickets/${encodeURIComponent(ticketId)}/status`,
    null,
    { params: { status } }
  );
  return response.data ?? { success: true };
};

// Helper (trả về data trực tiếp) - tiện cho màn hình.
export const getIssueTicketDataById = async (
  ticketId: string
): Promise<IssueTicketFromApi | null> => {
  const res = await getIssueTicketById(ticketId);
  if (res?.success && res.data) return res.data;
  return null;
};

/**
 * Lấy danh sách ticket đã assign cho staff hiện tại.
 * Endpoint: GET /api/issues/tickets/staff
 */
export const getIssueTicketsByStaff = async (): Promise<IssueTicketListApiResponse> => {
  const response = await axiosClient.get<IssueTicketListApiResponse>(
    `${FALLBACK_BACKEND_URL}/issues/tickets/staff`
  );
  return response.data;
};

/** Helper lấy data danh sách ticket staff (đã unwrap response). */
export const getIssueTicketsDataByStaff = async (): Promise<IssueTicketListItemFromApi[]> => {
  const res = await getIssueTicketsByStaff();
  if (res?.success && Array.isArray(res.data)) return res.data;
  return [];
};

export interface CreateIssueExecutionPayload {
  houseId: string;
  assetId: string;
  conditionScore: number;
  notes: string;
}

export interface CreateIssueExecutionResponse {
  data?: {
    id: string;
    issueId: string;
    staffId: string;
    houseId: string;
    assetId: string;
    conditionScore: number;
    notes: string;
    createdAt: string;
  };
  message?: string;
  statusCode?: number;
  success?: boolean;
}

/**
 * Staff tạo execution cho issue đang xử lý.
 * POST /api/issues/executions/{issueId}/execution
 */
export const createIssueExecution = async (
  issueId: string,
  payload: CreateIssueExecutionPayload
): Promise<CreateIssueExecutionResponse> => {
  const response = await axiosClient.post<CreateIssueExecutionResponse>(
    `${FALLBACK_BACKEND_URL}/issues/executions/${encodeURIComponent(issueId)}/execution`,
    payload
  );
  return response.data;
};

/**
 * Lấy danh sách banner báo giá.
 * GET /api/issues/banners
 */
export const getIssueBanners = async (): Promise<IssueBannerFromApi[]> => {
  const response = await axiosClient.get<ApiResponse<IssueBannerFromApi[]>>(
    `${FALLBACK_BACKEND_URL}/issues/banners`
  );
  if (response.data?.success && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
};

/**
 * Tạo báo giá cho issue.
 * POST /api/issues/quotes/{issueId}/quote
 */
export const createIssueQuote = async (
  issueId: string,
  payload: CreateIssueQuotePayload
): Promise<CreateIssueQuoteApiResponse> => {
  const response = await axiosClient.post<CreateIssueQuoteApiResponse>(
    `${FALLBACK_BACKEND_URL}/issues/quotes/${encodeURIComponent(issueId)}/quote`,
    payload
  );
  return response.data;
};

