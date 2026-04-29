import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../services/userApi";
import {
  getIssueTicketDataById,
  getIssueTicketsDataByStaff,
} from "../services/issuesApi";
import type { IssueTicketFromApi, IssueTicketListItemFromApi } from "../types/api";

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

export type UseStaffIssueTicketsOptions = {
  /**
   * Khoảng (ms) tự gọi lại GET danh sách khi query đang active.
   * Dùng khi màn list đang mở để pill status khớp BE (vd. manager approve) mà không cần pull refresh.
   * Truyền `false` để tắt — thường gắn với `useIsFocused()` để chỉ poll khi tab Ticket là màn đang nhìn thấy.
   */
  refetchInterval?: number | false;
};

/**
 * Danh sách chỉ được refetch nhờ poll định kỳ / kéo làm mới / invalidate — không tự coi "hết fresh" và gọi lại mỗi lần vào tab,
 * nhưng vẫn cập nhật kịp nhờ `refetchInterval` khi tab đang mở (giống lịch sự kiện trên các app phổ biến).
 */
const STAFF_TICKET_LIST_STALE_MS = Number.POSITIVE_INFINITY;

/**
 * Danh sách ticket assign cho staff đang đăng nhập.
 *
 * `staleTime: Infinity` + `refetchOnMount: false`: cache giữ khi chuyển tab / quay lại — không GET lại toàn danh sách mỗi lần vào.
 * Cập nhật nhờ poll (`refetchInterval` khi tab hiển thị), pull refresh, và `invalidateQueries` sau thao tác.
 * `retry`: giảm lỗi tải tạm do timeout/mạng.
 */
export const useStaffIssueTickets = (options?: UseStaffIssueTicketsOptions) => {
  return useQuery<IssueTicketListItemFromApi[]>({
    queryKey: ISSUE_TICKET_KEYS.byStaff(),
    queryFn: getIssueTicketsDataByStaff,
    staleTime: STAFF_TICKET_LIST_STALE_MS,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnMount: false,
    refetchInterval: options?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
};

/** Chi tiết ticket theo ticketId. */
export const useIssueTicketById = (ticketId: string) => {
  return useQuery<IssueTicketFromApi | null>({
    queryKey: ISSUE_TICKET_KEYS.byId(ticketId),
    queryFn: () => getIssueTicketDataById(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
};

// Hiện tại BE chưa có API update profile nên tạm thời không export hook update.
