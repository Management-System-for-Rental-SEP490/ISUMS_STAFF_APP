/**
 * API Issue/Ticket từ Backend.
 * - GET /api/issues/tickets/{ticketId} - chi tiết ticket/issue
 * - PUT /api/issues/tickets/{ticketId}/status?status={status} - cập nhật trạng thái (nếu BE hỗ trợ)
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
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

  const url = `${BACKEND_API_BASE}/issues/tickets/${encodeURIComponent(ticketId)}/images`;
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
    `${BACKEND_API_BASE}/issues/tickets/${encodeURIComponent(ticketId)}`
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
    `${BACKEND_API_BASE}/issues/tickets/${encodeURIComponent(ticketId)}/status`,
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
    `${BACKEND_API_BASE}/issues/tickets/staff`
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
    `${BACKEND_API_BASE}/issues/executions/${encodeURIComponent(issueId)}/execution`,
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
    `${BACKEND_API_BASE}/issues/banners`
  );
  if (response.data?.success && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
};

/**
 * Tạo báo giá cho ticket sửa chữa.
 * POST /api/issues/quotes/{ticketId}/quote — path param là **ticketId** (id ticket/issue).
 */
export const createIssueQuote = async (
  ticketId: string,
  payload: CreateIssueQuotePayload
): Promise<CreateIssueQuoteApiResponse> => {
  const response = await axiosClient.post<CreateIssueQuoteApiResponse>(
    `${BACKEND_API_BASE}/issues/quotes/${encodeURIComponent(ticketId)}/quote`,
    payload
  );
  return response.data;
};

/**
 * Kỹ thuật xác nhận hoàn tất sửa chữa — chuyển ticket sang trạng thái sẵn sàng chọn thanh toán (vd. WAITING_STAFF_COMPLETION).
 * POST /api/issues/tickets/{ticketId}/repair-complete
 */
export const postIssueTicketRepairComplete = async (
  ticketId: string
): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.post<{ success: boolean; message?: string }>(
    `${BACKEND_API_BASE}/issues/tickets/${encodeURIComponent(ticketId)}/repair-complete`,
    {}
  );
  return response.data ?? { success: true };
};

/**
 * Xác nhận đã nhận tiền mặt cho ticket (sau PUT status=WAITING_CASH_PAYMENT).
 * POST /api/issues/tickets/{ticketId}/cash-payment/confirm
 */
export const confirmIssueTicketCashPayment = async (
  ticketId: string
): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.post<{ success: boolean; message?: string }>(
    `${BACKEND_API_BASE}/issues/tickets/${encodeURIComponent(ticketId)}/cash-payment/confirm`,
    {}
  );
  return response.data ?? { success: true };
};

