import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../services/userApi";
import {
  getIssueTicketDataById,
  getIssueTicketsStaffPage,
  type IssueTicketStaffListPageResult,
} from "../services/issuesApi";
import type { IssueTicketFromApi } from "../types/api";
import { CLIENT_LIST_PAGE_SIZE } from "../utils/pagination";

// Query Key
export const USER_KEYS = {
  all: ["user"] as const,
  profile: () => [...USER_KEYS.all, "profile"] as const,
};

// Hook lấy thông tin user
export const useUserProfile = () => {
  return useQuery({
    queryKey: USER_KEYS.profile(),
    queryFn: () => getUserProfile(),
  });
};

export const ISSUE_TICKET_KEYS = {
  all: ["issues", "tickets"] as const,
  byStaff: () => [...ISSUE_TICKET_KEYS.all, "staff"] as const,
  byId: (ticketId: string) => [...ISSUE_TICKET_KEYS.all, ticketId] as const,
};

export type UseStaffIssueTicketsPageOptions = {
  /**
   * Khoảng (ms) tự gọi lại GET **trang hiện tại** khi query đang active.
   * Truyền `false` để tắt — thường gắn với `useIsFocused()` để chỉ poll khi tab Ticket đang nhìn thấy.
   */
  refetchInterval?: number | false;
};

/** Chu kỳ poll màn đang mở (ticket list/detail, lịch…) — đồng bộ status từ BE. */
export const STAFF_ACTIVE_SCREEN_POLL_MS = 30_000;

/**
 * Danh sách ticket staff chỉ refetch nhờ poll / kéo làm mới / invalidate — không tự hết fresh giữa các lần vào tab (per page).
 */
const STAFF_TICKET_LIST_STALE_MS = Number.POSITIVE_INFINITY;

/**
 * Một trang danh sách ticket assign cho staff (`page` UI **1-based**, `CLIENT_LIST_PAGE_SIZE` phần tử).
 * Đổi trang pagination → queryKey đổi → GET đúng trang đó; cache theo `(staff, page, size)`.
 */
export const useStaffIssueTicketsPage = (
  page: number,
  options?: UseStaffIssueTicketsPageOptions
) => {
  const pageSize = CLIENT_LIST_PAGE_SIZE;
  const stablePage = Math.max(1, Math.floor(page) || 1);
  return useQuery<IssueTicketStaffListPageResult>({
    queryKey: [...ISSUE_TICKET_KEYS.byStaff(), stablePage, pageSize],
    queryFn: () => getIssueTicketsStaffPage(stablePage, pageSize),
    staleTime: STAFF_TICKET_LIST_STALE_MS,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnMount: false,
    refetchInterval: options?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
};

export type UseIssueTicketByIdOptions = {
  /** Khi màn chi tiết đang focus — poll GET ticket để status/slot cập nhật khớp BE. */
  refetchInterval?: number | false;
};

/** Chi tiết ticket theo ticketId — poll tùy chọn khi màn đang mở. */
export const useIssueTicketById = (ticketId: string, options?: UseIssueTicketByIdOptions) => {
  return useQuery<IssueTicketFromApi | null>({
    queryKey: ISSUE_TICKET_KEYS.byId(ticketId),
    queryFn: () => getIssueTicketDataById(ticketId),
    enabled: Boolean(ticketId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 10 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnMount: false,
    refetchInterval: options?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
};

// Hiện tại BE chưa có API update profile nên tạm thời không export hook update.
