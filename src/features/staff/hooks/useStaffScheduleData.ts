/**
 * React Query cho mẫu lịch + work slots (enrich). Đồng bộ lại khi app active / mạng trở lại (refetchOnWindowFocus, refetchOnReconnect).
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentScheduleTemplate,
  getMyWorkSlots,
  getStaffIdForSchedule,
} from "../../../shared/services/scheduleApi";
import {
  addDaysToYmd,
  getWorkWeekMonToSatYmd,
  mergeGeneratedWorkSlotsDays,
} from "../../../shared/utils";
import { STAFF_LEAVE_KEYS } from "../../../shared/hooks/useStaffLeave";
import { fetchEnrichedWorkSlotsForStaff } from "../data/workSlotEnrichment";
import type {
  GeneratedWorkSlotsDayFromApi,
  ScheduleTemplateData,
} from "../../../shared/types/api";

export const SCHEDULE_DATA_KEYS = {
  all: ["staffSchedule"] as const,
  template: (date: string) => [...SCHEDULE_DATA_KEYS.all, "template", date] as const,
  workSlots: (staffId: string) => [...SCHEDULE_DATA_KEYS.all, "workSlots", staffId] as const,
  generatedSlots: (start: string, end: string) =>
    [...SCHEDULE_DATA_KEYS.all, "generatedSlots", start, end] as const,
};

const scheduleQueryDefaults = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnMount: false as const,
  refetchOnReconnect: false as const,
  refetchOnWindowFocus: false as const,
  retry: 1,
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

/**
 * Slot từ BE (GET .../work_slots/slots/me) theo khoảng ngày. Dùng màn/modal đăng ký khung giờ xử lý issue.
 */
/** Modal chọn khung giờ gọi 2 nhánh tuần; cache ngắn để reopen nhanh, không chờ refetch không cần thiết. */
const GENERATED_SLOTS_STALE_MS = 90_000;

export function useGeneratedWorkSlotsQuery(
  startYmd: string,
  endYmd: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false;
  return useQuery({
    queryKey: SCHEDULE_DATA_KEYS.generatedSlots(startYmd, endYmd),
    queryFn: async (): Promise<GeneratedWorkSlotsDayFromApi[]> => {
      /**
       * Gọi từng tuần T2–T7 rồi gộp — nhiều BE giới hạn độ dài startDate–endDate (1 request 2 tuần dễ lỗi).
       * Neo theo `startYmd` (thường = T2 tuần này từ màn ticket) để khớp queryKey.
       */
      const week1 = getWorkWeekMonToSatYmd(new Date(`${startYmd}T12:00:00`));
      const nextMondayYmd = addDaysToYmd(week1.endYmd, 2);
      const week2 = getWorkWeekMonToSatYmd(new Date(`${nextMondayYmd}T12:00:00`));

      const settled = await Promise.allSettled([
        getMyWorkSlots(week1.startYmd, week1.endYmd),
        getMyWorkSlots(week2.startYmd, week2.endYmd),
      ]);

      const chunks: GeneratedWorkSlotsDayFromApi[][] = [];
      const failures: unknown[] = [];

      for (const s of settled) {
        if (s.status === "fulfilled") {
          const res = s.value;
          if (res.success && Array.isArray(res.data)) chunks.push(res.data);
        } else {
          failures.push(s.reason);
        }
      }

      if (chunks.length === 0 && failures.length > 0) {
        throw failures[0];
      }

      return mergeGeneratedWorkSlotsDays(chunks);
    },
    enabled: enabled && Boolean(startYmd && endYmd),
    ...scheduleQueryDefaults,
    staleTime: GENERATED_SLOTS_STALE_MS,
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
