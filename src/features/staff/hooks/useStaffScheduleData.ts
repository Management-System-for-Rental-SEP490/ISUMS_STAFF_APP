/**
 * React Query cho mẫu lịch + work slots (enrich). Đồng bộ lại khi app active / mạng trở lại (refetchOnWindowFocus, refetchOnReconnect).
 */
import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
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
import { ASSET_ITEM_KEYS } from "../../../shared/hooks/useAssetItems";
import { HOUSES_KEYS } from "../../../shared/hooks/useHouses";
import { ISSUE_TICKET_KEYS, USER_KEYS } from "../../../shared/hooks/useUserProfile";
import { fetchRawWorkSlotsForStaff } from "../data/workSlotEnrichment";
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

export type UseEnrichedWorkSlotsQueryOptions = {
  /**
   * Khi false: query không chạy. Dùng khi tab Staff không cần lịch (Ticket/Devices/Profile).
   */
  enabled?: boolean;
};

/**
 * Work slots của staff — chỉ 1 request, không enrich.
 * Home (bảng tóm tắt) và Calendar chỉ cần `jobType`, `startTime`, `endTime`.
 * WorkSlotDetailScreen tự fetch dữ liệu chi tiết khi cần.
 */
export function useEnrichedWorkSlotsQuery(options?: UseEnrichedWorkSlotsQueryOptions) {
  const staffId = getStaffIdForSchedule();
  const enabled = options?.enabled !== false;
  return useQuery({
    queryKey: SCHEDULE_DATA_KEYS.workSlots(staffId),
    queryFn: () => fetchRawWorkSlotsForStaff(staffId),
    enabled: Boolean(staffId) && enabled,
    ...scheduleQueryDefaults,
  });
}

export type InvalidateStaffStatusCachesOpts = {
  staffId: string;
  /** GET chi tiết ticket (modal / detail). */
  ticketId?: string;
  /** Danh sách ticket staff — sau đổi trạng thái issue liên quan slot. */
  issueTicketListToo?: boolean;
  /** Khớp queryKey `useGeneratedWorkSlotsQuery` (đăng ký slot issue). */
  generatedRange?: { startYmd: string; endYmd: string };
};

/**
 * Sau mutation job / inspection / issue ảnh hưởng lịch: invalidate **có chừng** thay vì `SCHEDULE_DATA_KEYS.all`
 * để Calendar/Home cập nhật nhanh mà không refetch mọi template/generatedSlots.
 *
 * Thứ tự: work slots (nguồn truth trạng thái ca) → optional generated range → ticket by id → list staff.
 * `await` để màn gọi xong (vd. WorkSlot detail) có thể `getQueryData` ngay sau đó.
 */
export async function invalidateStaffStatusCaches(
  queryClient: QueryClient,
  opts: InvalidateStaffStatusCachesOpts
): Promise<void> {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.workSlots(opts.staffId) }),
  ];
  if (opts.generatedRange) {
    const { startYmd, endYmd } = opts.generatedRange;
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: SCHEDULE_DATA_KEYS.generatedSlots(startYmd, endYmd),
      })
    );
  }
  if (opts.ticketId?.trim()) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: ISSUE_TICKET_KEYS.byId(opts.ticketId.trim()) })
    );
  }
  if (opts.issueTicketListToo) {
    tasks.push(queryClient.invalidateQueries({ queryKey: ISSUE_TICKET_KEYS.byStaff() }));
  }
  await Promise.all(tasks);
}

const NOTIFICATION_STAFF_PREFIX = ["notifications", "app", "staff"] as const;

/**
 * Sau đăng nhập: invalidate theo domain Staff thay vì `queryClient.invalidateQueries()` không filter
 * (tránh refetch mọi query không liên quan).
 *
 * Kiểm tra cache trước khi invalidate — nếu domain chưa có data (vừa clear sau logout) thì bỏ qua.
 * Tránh kích trigger refetch hàng loạt vô ích khi cache đang hoàn toàn rỗng sau cold login đầu tiên.
 */
export async function invalidatePostLoginStaffDomainCaches(
  queryClient: QueryClient
): Promise<void> {
  const domainKeys = [
    HOUSES_KEYS.all,
    ASSET_ITEM_KEYS.base,
    ISSUE_TICKET_KEYS.all,
    SCHEDULE_DATA_KEYS.all,
    STAFF_LEAVE_KEYS.all,
    USER_KEYS.all,
    [...NOTIFICATION_STAFF_PREFIX] as readonly string[],
  ] as const;

  // Chỉ invalidate domain thực sự có entry trong cache — domain rỗng không cần đánh dấu stale.
  const keysWithData = domainKeys.filter(
    (key) => queryClient.getQueriesData({ queryKey: key as readonly unknown[] }).length > 0
  );

  if (keysWithData.length === 0) return;

  await Promise.all(
    keysWithData.map((key) =>
      queryClient.invalidateQueries({ queryKey: key as readonly unknown[] })
    )
  );
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

/**
 * Khi vào tab Lịch (focus): làm mới work slots + leave — không invalidate template/generatedSlots
 * để tránh bão refetch không cần cho thẻ slot trên lịch.
 */
export function useInvalidateScheduleRelatedQueries() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    const staffId = getStaffIdForSchedule();
    if (staffId) {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.workSlots(staffId) });
    }
    void queryClient.invalidateQueries({ queryKey: STAFF_LEAVE_KEYS.all });
  }, [queryClient]);
}
