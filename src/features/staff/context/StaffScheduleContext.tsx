/**
 * Context chia sẻ lịch làm việc của Staff giữa Calendar, Home và TicketDetail.
 * Dữ liệu lấy qua React Query (đồng bộ lại khi app active / mạng trở lại).
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLeaveRequests } from "../../../shared/hooks/useStaffLeave";
import {
  useScheduleTemplateQuery,
  useEnrichedWorkSlotsQuery,
  SCHEDULE_DATA_KEYS,
} from "../hooks/useStaffScheduleData";
import type { LeaveRequestFromApi, ScheduleTemplateData } from "../../../shared/types/api";
import type { WorkSlot } from "../data/mockStaffData";

/** Chuyển YYYY-MM-DD hoặc ISO sang dd/MM */
function toDdMm(s: string): string {
  const d = new Date(s);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

/** Chuyển thứ Hai tuần hiện tại sang chuỗi YYYY-MM-DD cho API. */
function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const y = monday.getFullYear();
  const m = (monday.getMonth() + 1).toString().padStart(2, "0");
  const d = monday.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type StaffScheduleContextValue = {
  dayOffList: string[];
  refetchLeaveRequests: () => Promise<unknown>;
  scheduleTemplate: ScheduleTemplateData | null;
  templateLoading: boolean;
  templateError: string | null;
  refetchTemplate: (date: string) => void;
  workSlots: WorkSlot[] | null;
  workSlotsLoading: boolean;
  workSlotsError: string | null;
  refetchWorkSlots: () => Promise<unknown>;
};

const StaffScheduleContext = createContext<StaffScheduleContextValue | null>(null);

function queryErrToMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof Error ? err.message : String(err);
}

export function StaffScheduleProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [templateQueryDate, setTemplateQueryDate] = useState(getMondayOfCurrentWeek);

  const templateQuery = useScheduleTemplateQuery(templateQueryDate);
  const workSlotsQuery = useEnrichedWorkSlotsQuery();
  const leaveQuery = useLeaveRequests();

  const refetchTemplate = useCallback(
    (date: string) => {
      setTemplateQueryDate((prev) => {
        if (prev === date) {
          void queryClient.refetchQueries({ queryKey: SCHEDULE_DATA_KEYS.template(date) });
        }
        return date;
      });
    },
    [queryClient]
  );

  const refetchWorkSlots = useCallback(() => workSlotsQuery.refetch(), [workSlotsQuery]);
  const refetchLeaveRequests = useCallback(() => leaveQuery.refetch(), [leaveQuery]);

  const scheduleTemplate = templateQuery.data ?? null;
  const templateLoading = templateQuery.isFetching;
  const templateError = queryErrToMessage(templateQuery.error);

  const workSlots = workSlotsQuery.isError ? null : (workSlotsQuery.data ?? null);
  const workSlotsLoading = workSlotsQuery.isFetching;
  const workSlotsError = queryErrToMessage(workSlotsQuery.error);

  const leaveRequests: LeaveRequestFromApi[] = useMemo(() => {
    const res = leaveQuery.data;
    return Array.isArray(res?.data) ? res.data : [];
  }, [leaveQuery.data]);

  const dayOffList = useMemo(() => {
    const approved = leaveRequests.filter((r) => r.status?.toUpperCase() === "APPROVED");
    const set = new Set<string>();
    approved.forEach((r) => {
      if (r.leaveDate) set.add(toDdMm(r.leaveDate));
    });
    return Array.from(set);
  }, [leaveRequests]);

  return (
    <StaffScheduleContext.Provider
      value={{
        dayOffList,
        refetchLeaveRequests,
        scheduleTemplate,
        templateLoading,
        templateError,
        refetchTemplate,
        workSlots,
        workSlotsLoading,
        workSlotsError,
        refetchWorkSlots,
      }}
    >
      {children}
    </StaffScheduleContext.Provider>
  );
}

export function useStaffSchedule(): StaffScheduleContextValue {
  const ctx = useContext(StaffScheduleContext);
  if (!ctx) {
    throw new Error("useStaffSchedule must be used inside StaffScheduleProvider");
  }
  return ctx;
}
