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
  IssueTicketListItemFromApi,
  IssueTicketStaffListPagedPayloadFromApi,
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

/** Kết quả chuẩn hoá một trang danh sách ticket staff (sau GET phân trang). */
export type IssueTicketStaffListPageResult = {
  items: IssueTicketListItemFromApi[];
  totalElements: number;
  /** Tổng ticket DONE/CLOSED (toàn staff) — chỉ có khi BE trả kèm payload phân trang. */
  completedElements?: number;
};

function sortStaffTicketsNewestFirst(items: IssueTicketListItemFromApi[]): IssueTicketListItemFromApi[] {
  return [...items].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    const na = Number.isNaN(at) ? 0 : at;
    const nb = Number.isNaN(bt) ? 0 : bt;
    return nb - na;
  });
}

function countStaffTicketsDone(items: IssueTicketListItemFromApi[]): number {
  return items.filter((t) => {
    const s = String(t.status || "").toUpperCase();
    return s === "DONE" || s === "CLOSED";
  }).length;
}

/**
 * Chuẩn hoá body GET `/issues/tickets/staff`:
 * - Phân trang: `data` là object có `content` | `items` + `totalElements` | `total`.
 * - Legacy: `data` là mảng đầy đủ → cắt client theo `pageOneBased` / `pageSize` (tạm thời khi BE chưa filter).
 */
function parseStaffTicketsListResponse(
  body: unknown,
  pageOneBased: number,
  pageSize: number
): IssueTicketStaffListPageResult {
  const pageIndex = Math.max(0, Math.floor(pageOneBased) - 1);
  const size = Math.max(1, Math.floor(pageSize));
  const empty = (): IssueTicketStaffListPageResult => ({
    items: [],
    totalElements: 0,
    completedElements: 0,
  });

  if (!body || typeof body !== "object") return empty();
  const res = body as { success?: boolean; data?: unknown };
  if (!res.success || res.data == null) return empty();

  const data = res.data;
  if (Array.isArray(data)) {
    const sorted = sortStaffTicketsNewestFirst(data as IssueTicketListItemFromApi[]);
    const totalElements = sorted.length;
    const completedElements = countStaffTicketsDone(sorted);
    const start = pageIndex * size;
    const items = sorted.slice(start, start + size);
    return { items, totalElements, completedElements };
  }

  if (typeof data === "object") {
    const d = data as IssueTicketStaffListPagedPayloadFromApi;
    const raw = d.content ?? d.items;
    const items = Array.isArray(raw) ? sortStaffTicketsNewestFirst(raw) : [];
    let totalElements =
      typeof d.totalElements === "number" && Number.isFinite(d.totalElements)
        ? Math.max(0, Math.floor(d.totalElements))
        : typeof d.total === "number" && Number.isFinite(d.total)
          ? Math.max(0, Math.floor(d.total))
          : items.length;
    const completedRaw = d.completedElements ?? d.completedTicketCount ?? d.doneCount;
    const completedElements =
      typeof completedRaw === "number" && Number.isFinite(completedRaw)
        ? Math.max(0, Math.floor(completedRaw))
        : undefined;
    return { items, totalElements, completedElements };
  }

  return empty();
}

/**
 * Danh sách ticket assign cho staff — một trang (server-side pagination).
 *
 * - Query: `page` **0-based** (Spring `Pageable`), `size` = số phần tử/trang (vd. 10).
 * - Nếu BE trả legacy `data: []` toàn bộ, service vẫn cắt đúng trang trên client cho tới khi BE bật filter.
 */
export const getIssueTicketsStaffPage = async (
  pageOneBased: number,
  pageSize: number
): Promise<IssueTicketStaffListPageResult> => {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const pageIndex = Math.max(0, Math.floor(pageOneBased) - 1);
  const size = Math.max(1, Math.floor(pageSize));
  try {
    const response = await axiosClient.get<unknown>(`${BACKEND_API_BASE}/issues/tickets/staff`, {
      params: { page: pageIndex, size },
    });
    const parsed = parseStaffTicketsListResponse(response.data, pageOneBased, pageSize);
    if (__DEV__) {
      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      console.log(
        `[STAFF_TICKET_LIST_TIMING] GET issues/tickets/staff OK ${elapsed.toFixed(0)}ms http=${response.status} page=${pageOneBased} size=${size} items=${parsed.items.length} total=${parsed.totalElements}`
      );
    }
    return parsed;
  } catch (e) {
    if (__DEV__) {
      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      console.warn(
        `[STAFF_TICKET_LIST_TIMING] GET issues/tickets/staff FAIL sau ${elapsed.toFixed(0)}ms page=${pageOneBased}`,
        e
      );
    }
    throw e;
  }
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

