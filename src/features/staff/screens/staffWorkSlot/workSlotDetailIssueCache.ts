/**
 * Cache React Query cho ticket issue sau GET — tái sử dụng từ màn chi tiết ca / ticket.
 */
import type { QueryClient } from "@tanstack/react-query";
import { ISSUE_TICKET_KEYS } from "../../../../shared/hooks/useUserProfile";
import type { IssueTicketFromApi } from "../../../../shared/types/api";

export function primeIssueTicketDetailCache(qc: QueryClient, ticket: IssueTicketFromApi) {
  const id = String(ticket?.id ?? "").trim();
  if (!id) return;
  qc.setQueryData(ISSUE_TICKET_KEYS.byId(id), ticket);
}
