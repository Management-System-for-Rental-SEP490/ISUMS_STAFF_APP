/**
 * React Query cho mẫu lịch + work slots (enrich). Đồng bộ lại khi app active / mạng trở lại (refetchOnWindowFocus, refetchOnReconnect).
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentScheduleTemplate,
  getStaffIdForSchedule,
} from "../../../shared/services/scheduleApi";
import { STAFF_LEAVE_KEYS } from "../../../shared/hooks/useStaffLeave";
import { fetchEnrichedWorkSlotsForStaff } from "../data/workSlotEnrichment";
import type { ScheduleTemplateData } from "../../../shared/types/api";

export const SCHEDULE_DATA_KEYS = {
  all: ["staffSchedule"] as const,
  template: (date: string) => [...SCHEDULE_DATA_KEYS.all, "template", date] as const,
  workSlots: (staffId: string) => [...SCHEDULE_DATA_KEYS.all, "workSlots", staffId] as const,
};

const scheduleQueryDefaults = {
  staleTime: 0,
  refetchOnMount: true as const,
  refetchOnReconnect: true as const,
  refetchOnWindowFocus: true as const,
};

export function useScheduleTemplateQuery(dateYmd: string) {
  return useQuery({
    queryKey: SCHEDULE_DATA_KEYS.template(dateYmd),
    queryFn: async (): Promise<ScheduleTemplateData | null> => {
      const res = await getCurrentScheduleTemplate(dateYmd);
      if (res.success && res.data) return res.data;
      return null;
    },
    enabled: Boolean(dateYmd),
    ...scheduleQueryDefaults,
  });
}

export function useEnrichedWorkSlotsQuery() {
  const staffId = getStaffIdForSchedule();
  return useQuery({
    queryKey: SCHEDULE_DATA_KEYS.workSlots(staffId),
    queryFn: () => fetchEnrichedWorkSlotsForStaff(staffId),
    enabled: Boolean(staffId),
    ...scheduleQueryDefaults,
  });
}

/** Invalidate toàn bộ query lịch + leave (dùng khi vào tab Home/Calendar để BE vừa lên vẫn kéo được dữ liệu). */
export function useInvalidateScheduleRelatedQueries() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: STAFF_LEAVE_KEYS.all });
  }, [queryClient]);
}
