/**
 * API Issue/Ticket từ Backend.
 * - GET /api/issues/tickets/{ticketId} - chi tiết ticket/issue
 * - PUT /api/issues/tickets/{ticketId}/status?status={status} - cập nhật trạng thái (nếu BE hỗ trợ)
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type {
  IssueTicketApiResponse,
  IssueTicketFromApi,
  IssueTicketStatusUpdate,
} from "../types/api";

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

