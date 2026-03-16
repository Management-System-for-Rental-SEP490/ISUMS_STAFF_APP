/**
 * Context chia sẻ lịch làm việc của Staff giữa Calendar, Home và TicketDetail.
 * - dayOffList: ngày nghỉ đã duyệt (định dạng dd/MM), derived từ leave API.
 * - scheduleTemplate: mẫu lịch từ API (giờ làm, ngày làm việc, slot...) – fetch khi mount.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  getCurrentScheduleTemplate,
  getWorkSlotsByStaffId,
  getLeaveRequestsByStaffId,
  getStaffIdForSchedule,
} from "../../../shared/services/scheduleApi";
import type { LeaveRequestFromApi, ScheduleTemplateData } from "../../../shared/types/api";
import type { WorkSlot } from "../data/mockStaffData";
import { mapWorkSlotsFromApiForCurrentWeek } from "../data/workSlotUtils";

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
  /** Danh sách ngày nghỉ đã duyệt (định dạng dd/MM), từ leave API */
  dayOffList: string[];
  /** Gọi lại API leave để cập nhật dayOffList */
  refetchLeaveRequests: () => Promise<void>;
  /** Mẫu lịch làm việc từ API (null khi chưa load hoặc lỗi) */
  scheduleTemplate: ScheduleTemplateData | null;
  /** Đang fetch template */
  templateLoading: boolean;
  /** Lỗi khi fetch (nếu có) */
  templateError: string | null;
  /** Gọi lại API với ngày (YYYY-MM-DD). Dùng khi chuyển tuần. */
  refetchTemplate: (date: string) => Promise<void>;
  /** Work slots từ API (đã map sang WorkSlot, chỉ trong tuần hiện tại). Null khi chưa load hoặc lỗi. */
  workSlots: WorkSlot[] | null;
  /** Đang fetch work slots */
  workSlotsLoading: boolean;
  /** Lỗi khi fetch work slots (nếu có) */
  workSlotsError: string | null;
  /** Gọi lại API work slots. Dùng khi cần refresh lịch. */
  refetchWorkSlots: () => Promise<void>;
};

const StaffScheduleContext = createContext<StaffScheduleContextValue | null>(null);

export function StaffScheduleProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestFromApi[]>([]);
  const [scheduleTemplate, setScheduleTemplate] = useState<ScheduleTemplateData | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [workSlots, setWorkSlots] = useState<WorkSlot[] | null>(null);
  const [workSlotsLoading, setWorkSlotsLoading] = useState(false);
  const [workSlotsError, setWorkSlotsError] = useState<string | null>(null);

  const refetchWorkSlots = useCallback(async () => {
    const staffId = getStaffIdForSchedule();
    setWorkSlotsLoading(true);
    setWorkSlotsError(null);
    try {
      const res = await getWorkSlotsByStaffId(staffId);
      if (res.success && res.data) {
        const mapped = mapWorkSlotsFromApiForCurrentWeek(res.data);
        setWorkSlots(mapped);
      } else {
        setWorkSlots([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("staff_calendar.work_slots_load_error");
      setWorkSlotsError(msg);
      setWorkSlots(null);
    } finally {
      setWorkSlotsLoading(false);
    }
  }, [t]);

  const refetchTemplate = useCallback(async (date: string) => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const res = await getCurrentScheduleTemplate(date);
      if (res.success && res.data) {
        const d = res.data;
        // // eslint-disable-next-line no-console
        // console.log("[Schedule Template API] Đã bắt được giá trị:", {
        //   id: d.id,
        //   workingDays: d.workingDays,
        //   openTime: d.openTime,
        //   breakStart: d.breakStart,
        //   breakEnd: d.breakEnd,
        //   closeTime: d.closeTime,
        //   slotMinutes: d.slotMinutes,
        //   bufferMinutes: d.bufferMinutes,
        //   effectiveFrom: d.effectiveFrom,
        //   updatedAt: d.updatedAt,
        // });
        setScheduleTemplate(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("staff_calendar.template_load_error");
      setTemplateError(msg);
      setScheduleTemplate(null);
    } finally {
      setTemplateLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const monday = getMondayOfCurrentWeek();
    refetchTemplate(monday);
  }, [refetchTemplate]);

  useEffect(() => {
    refetchWorkSlots();
  }, [refetchWorkSlots]);

  const refetchLeaveRequests = useCallback(async () => {
    const staffId = getStaffIdForSchedule();
    try {
      const res = await getLeaveRequestsByStaffId(staffId);
      const data = Array.isArray(res.data) ? res.data : [];
      setLeaveRequests(data);
    } catch {
      setLeaveRequests([]);
    }
  }, []);

  useEffect(() => {
    refetchLeaveRequests();
  }, [refetchLeaveRequests]);

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
