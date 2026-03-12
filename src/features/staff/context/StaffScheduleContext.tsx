/**
 * Context chia sẻ danh sách ngày nghỉ (day off) của Staff giữa Calendar, Home và TicketDetail.
 * Lịch mặc định: làm 8h–18h mỗi ngày; chỉ những ngày staff đăng ký nghỉ mới không có khung giờ.
 */
import React, { createContext, useContext, useState, useCallback } from "react";

type StaffScheduleContextValue = {
  /** Danh sách ngày nghỉ (định dạng dd/MM, VD "21/02") */
  dayOffList: string[];
  /** Thêm một ngày nghỉ */
  addDayOff: (date: string) => void;
  /** Bỏ đăng ký nghỉ một ngày */
  removeDayOff: (date: string) => void;
};

const StaffScheduleContext = createContext<StaffScheduleContextValue | null>(null);

const INITIAL_DAY_OFF: string[] = [];

export function StaffScheduleProvider({ children }: { children: React.ReactNode }) {
  const [dayOffList, setDayOffList] = useState<string[]>(INITIAL_DAY_OFF);

  const addDayOff = useCallback((date: string) => {
    const d = date.trim();
    if (!d) return;
    setDayOffList((prev) => (prev.includes(d) ? prev : [...prev, d]));
  }, []);

  const removeDayOff = useCallback((date: string) => {
    const d = date.trim();
    setDayOffList((prev) => prev.filter((x) => x !== d));
  }, []);

  return (
    <StaffScheduleContext.Provider value={{ dayOffList, addDayOff, removeDayOff }}>
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
