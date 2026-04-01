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
    queryFn: getUserProfile,       
  });
};

export const ISSUE_TICKET_KEYS = {
  all: ["issues", "tickets"] as const,
  byStaff: () => [...ISSUE_TICKET_KEYS.all, "staff"] as const,
  byId: (ticketId: string) => [...ISSUE_TICKET_KEYS.all, ticketId] as const,
};

/** Danh sách ticket assign cho staff đang đăng nhập. */
export const useStaffIssueTickets = () => {
  return useQuery<IssueTicketListItemFromApi[]>({
    queryKey: ISSUE_TICKET_KEYS.byStaff(),
    queryFn: getIssueTicketsDataByStaff,
  });
};

/** Chi tiết ticket theo ticketId. */
export const useIssueTicketById = (ticketId: string) => {
  return useQuery<IssueTicketFromApi | null>({
    queryKey: ISSUE_TICKET_KEYS.byId(ticketId),
    queryFn: () => getIssueTicketDataById(ticketId),
    enabled: Boolean(ticketId),
  });
};

// Hiện tại BE chưa có API update profile nên tạm thời không export hook update.
