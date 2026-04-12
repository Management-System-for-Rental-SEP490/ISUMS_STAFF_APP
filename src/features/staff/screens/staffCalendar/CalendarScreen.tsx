/**
 * Màn hình Lịch làm việc hàng tuần của Staff.
 * - Không có workslot: cột phải để trắng (không hiển thị ô khung giờ).
 * - Có workslot (từ API): hiển thị workslot với giờ, task, phòng, ticket.
 */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from "@react-navigation/native";
import {
  useInvalidateScheduleRelatedQueries,
  SCHEDULE_DATA_KEYS,
} from "../../hooks/useStaffScheduleData";
import { useQueryClient } from "@tanstack/react-query";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import { PullToRefreshControl, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import Header from "../../../../shared/components/header";
import { StaffScreenActionFab } from "../../../../shared/components/StaffScreenActionFab";
import { getWorkingDaysFromTemplate } from "../../data/mockStaffData";
import type { WorkSlot } from "../../data/mockStaffData";
import { useStaffSchedule } from "../../context/StaffScheduleContext";
import DayOffActionModal from "./modals/DayOffActionModal";
import {
  staffCalendarStyles,
  calendarWorkSlotCardSurface,
  calendarWorkSlotTaskText,
} from "./staffCalendarStyles";
import { formatMonthYearSlashed } from "../../../../shared/utils";
import { useRefreshControlGate } from "../../../../shared/hooks";

/** Key i18n cho ngày ngắn (T2, Mon, 月...) - 1=Mon..7=Sun */
const DAY_SHORT_KEYS: Record<number, string> = {
  1: "staff_calendar.day_short_1",
  2: "staff_calendar.day_short_2",
  3: "staff_calendar.day_short_3",
  4: "staff_calendar.day_short_4",
  5: "staff_calendar.day_short_5",
  6: "staff_calendar.day_short_6",
  7: "staff_calendar.day_short_7",
};

const JOB_STATUS_KEYS = new Set([
  "PENDING", "WAITING_MANAGER_CONFIRM", "CONFIRMED", "BOOKED", "BLOCKED",
  "CREATED", "SCHEDULED", "NEED_RESCHEDULE", "IN_PROGRESS", "COMPLETED", "DONE",
  "FAILED", "CANCELLED", "OVERDUE", "AVAILABLE",
]);

function normalizeWorkSlotStatusKey(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function getJobStatusKey(status: string | undefined): string {
  if (!status) return "staff_calendar.job_status_OTHER";
  const n = normalizeWorkSlotStatusKey(status);
  const key = `staff_calendar.job_status_${n}`;
  return JOB_STATUS_KEYS.has(n) ? key : "staff_calendar.job_status_OTHER";
}

function parseYmdToLocalDate(ymd: string): Date {
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Giữ để tương thích - workslot không hiển thị ticket nữa, chỉ status + time + jobType */
function formatTicketDisplay(_ticketId?: string): string {
  return "";
}

type CalendarRouteProp = RouteProp<MainTabParamList, "Calendar">;

export default function CalendarScreen() {
  const { t } = useTranslation();
  const route = useRoute<CalendarRouteProp>();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Calendar">>();
  const {
    dayOffList,
    scheduleTemplate,
    workSlots,
    refetchTemplate,
    refetchWorkSlots,
    refetchLeaveRequests,
  } = useStaffSchedule();
  const queryClient = useQueryClient();
  const invalidateScheduleRelated = useInvalidateScheduleRelatedQueries();
  const [dayOffActionVisible, setDayOffActionVisible] = useState(false);
  const [timetableRefreshing, setTimetableRefreshing] = useState(false);
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const [weekOffset, setWeekOffset] = useState(0);
  /** null = hiển thị full tuần, string = chỉ hiển thị ngày đó */
  const [selectedDateYMD, setSelectedDateYMD] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setDate(monday.getDate() + weekOffset * 7);
    const result: { dayOfWeek: number; date: string; dateObj: Date; dateYMD: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
      result.push({
        dayOfWeek,
        date: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`,
        dateObj: d,
        dateYMD: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`,
      });
    }
    return result;
  }, [weekOffset]);

  const weekStart = weekDays[0]?.dateObj;
  const weekEnd = weekDays[6]?.dateObj;

  /** Workslot theo ngày (date dd/MM) - khi có API workslot sẽ có data */
  const slotsByDate = useMemo(() => {
    const map: Record<string, WorkSlot[]> = {};
    weekDays.forEach((d) => { map[d.date] = []; });
    if (workSlots?.length) {
      workSlots.forEach((slot) => {
        if (map[slot.date]) {
          map[slot.date].push(slot);
        }
      });
      Object.keys(map).forEach((d) => map[d].sort((a, b) => a.startMinutes - b.startMinutes));
    }
    return map;
  }, [workSlots, weekDays]);

  const workingDaysSet = useMemo(
    () => getWorkingDaysFromTemplate(scheduleTemplate),
    [scheduleTemplate]
  );

  const isDayOff = useMemo(() => {
    const set = new Set(dayOffList);
    return (date: string) => set.has(date);
  }, [dayOffList]);

  /** Ngày hôm nay (YYYY-MM-DD) — so khớp với từng ô trong strip tuần */
  const todayYMD = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${(n.getMonth() + 1).toString().padStart(2, "0")}-${n.getDate().toString().padStart(2, "0")}`;
  }, []);

  /** Khi có selected thì highlight ngày đó; khi null thì không highlight (full view) */
  const effectiveSelected = selectedDateYMD;

  useEffect(() => {
    if (weekStart) {
      const ymd = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, "0")}-${weekStart.getDate().toString().padStart(2, "0")}`;
      refetchTemplate(ymd);
    }
  }, [weekOffset, refetchTemplate]);

  useEffect(() => {
    if (weekOffset !== 0) setSelectedDateYMD(null);
  }, [weekOffset]);

  /** Sau khi hoàn thành ca: mở đúng tuần + highlight ngày của slot trên lịch. */
  useEffect(() => {
    const ymd = route.params?.focusDateYmd;
    if (!ymd) return;
    const target = parseYmdToLocalDate(ymd);
    const today = new Date();
    const mondayThis = getMonday(today);
    const mondayTarget = getMonday(target);
    const diffWeeks = Math.round(
      (mondayTarget.getTime() - mondayThis.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    setWeekOffset(diffWeeks);
    setSelectedDateYMD(ymd);
    navigation.setParams({
      focusDateYmd: undefined,
      focusWorkSlotId: undefined,
    });
  }, [route.params?.focusDateYmd, navigation]);

  useFocusEffect(
    useCallback(() => {
      invalidateScheduleRelated();
    }, [invalidateScheduleRelated])
  );

  const navigateWeek = (delta: number) => setWeekOffset((prev) => prev + delta);

  const onTimetableRefresh = useCallback(async () => {
    setTimetableRefreshing(true);
    try {
      const tasks: Promise<unknown>[] = [refetchWorkSlots(), refetchLeaveRequests()];
      if (weekStart) {
        const ymd = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${weekStart.getDate().toString().padStart(2, "0")}`;
        tasks.push(queryClient.refetchQueries({ queryKey: SCHEDULE_DATA_KEYS.template(ymd) }));
      }
      await Promise.all(tasks);
    } finally {
      setTimetableRefreshing(false);
    }
  }, [weekStart, queryClient, refetchWorkSlots, refetchLeaveRequests]);

  return (
    <View style={staffCalendarStyles.container}>
      <Header
        variant="default"
        staffTabWelcome
        staffTabPageBadgeTitle={t("staff_calendar.weekly_timetable")}
      />
      {/* Phần cố định: week nav + danh sách ngày - không scroll */}
      <View style={staffCalendarStyles.fixedTopSection}>
        {weekStart && weekEnd && (
          <View style={staffCalendarStyles.weekNavRow}>
            <View style={staffCalendarStyles.weekNavArrows}>
              <TouchableOpacity style={staffCalendarStyles.navArrow} onPress={() => navigateWeek(-1)} activeOpacity={0.7}>
                <View style={staffCalendarStyles.navArrowInner}>
                  <Text style={staffCalendarStyles.navArrowText}>‹</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={staffCalendarStyles.weekNavMonthWrap}
                onPress={() => setSelectedDateYMD(null)}
                activeOpacity={0.7}
              >
                <Text style={staffCalendarStyles.monthText}>{formatMonthYearSlashed(weekStart)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={staffCalendarStyles.navArrow} onPress={() => navigateWeek(1)} activeOpacity={0.7}>
                <View style={staffCalendarStyles.navArrowInner}>
                  <Text style={staffCalendarStyles.navArrowText}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={staffCalendarStyles.daysHeaderRow}>
          {weekDays.map(({ dayOfWeek, date, dateYMD }) => {
            const daySlots = slotsByDate[date] ?? [];
            const hasWorkslots = daySlots.length > 0;
            const isSelected = dateYMD === effectiveSelected;
            const isCalendarToday = dateYMD === todayYMD;
            const dayLabel = t(DAY_SHORT_KEYS[dayOfWeek] ?? "staff_calendar.day_short_1");
            return (
              <TouchableOpacity
                key={`${dateYMD}-${dayOfWeek}`}
                style={staffCalendarStyles.daysHeaderCell}
                onPress={() => setSelectedDateYMD(selectedDateYMD === dateYMD ? null : dateYMD)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    staffCalendarStyles.daysHeaderDay,
                    isSelected && staffCalendarStyles.daysHeaderDayToday,
                    isCalendarToday && staffCalendarStyles.daysHeaderDayIsToday,
                  ]}
                >
                  {dayLabel}
                </Text>
                <View style={staffCalendarStyles.daysHeaderNumRow}>
                  <View
                    style={[
                      staffCalendarStyles.daysHeaderNumWrap,
                      isSelected && staffCalendarStyles.daysHeaderNumWrapToday,
                      isCalendarToday && !isSelected && staffCalendarStyles.daysHeaderNumWrapIsToday,
                    ]}
                  >
                    <Text
                      style={[
                        staffCalendarStyles.daysHeaderNum,
                        isSelected && staffCalendarStyles.daysHeaderNumToday,
                        isCalendarToday && !isSelected && staffCalendarStyles.daysHeaderNumIsToday,
                      ]}
                    >
                      {date.split("/")[0]}
                    </Text>
                  </View>
                </View>
                {hasWorkslots && <View style={staffCalendarStyles.daysHeaderDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Chỉ bảng lịch scroll - danh sách ngày luôn cố định phía trên */}
      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={timetableRefreshing} />
        <ScrollView
          style={staffCalendarStyles.timetableScroll}
          contentContainerStyle={staffCalendarStyles.timetableScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={onScrollForRefreshGate}
          scrollEventThrottle={16}
          refreshControl={
            <PullToRefreshControl
              refreshing={timetableRefreshing}
              onRefresh={onTimetableRefresh}
              scrollAtTop={scrollAtTop}
            />
          }
        >
        <View style={staffCalendarStyles.timetableFrame}>
          {(effectiveSelected
            ? weekDays.filter((d) => d.dateYMD === effectiveSelected)
            : weekDays
          )
            .map(({ dayOfWeek, date, dateObj, dateYMD }, idx, arr) => {
            const daySlots = slotsByDate[date] ?? [];
            const hasWorkslots = daySlots.length > 0;
            const dayLabel = t(DAY_SHORT_KEYS[dayOfWeek] ?? "staff_calendar.day_short_1");
            const dateText = `${dateObj.getDate()}/${dateObj.getMonth() + 1} ${dayLabel}`;
            const isLast = idx === arr.length - 1;
            const isToday = dateYMD === todayYMD;

            return (
              <View
                key={`${dateYMD}-${dayOfWeek}`}
                style={[staffCalendarStyles.timetableRow, isLast && staffCalendarStyles.timetableRowLast]}
              >
                <View style={staffCalendarStyles.timetableDateColumn}>
                  <Text
                    style={[
                      staffCalendarStyles.timetableDateText,
                      isToday && staffCalendarStyles.timetableDateToday,
                    ]}
                  >
                    {dateText}
                  </Text>
                </View>
                <View style={staffCalendarStyles.timetableSlotColumn}>
                  {hasWorkslots ? (
                    <View style={staffCalendarStyles.slotColumnContent}>
                      {daySlots.map((slot, slotIdx) => {
                        const statusKey = getJobStatusKey(slot.status);
                        const isLastSlot = slotIdx === daySlots.length - 1;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              staffCalendarStyles.slotCard,
                              calendarWorkSlotCardSurface(slot.slotType),
                              !isLastSlot && staffCalendarStyles.slotCardSeparator,
                            ]}
                            onPress={() => {
                              navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("WorkSlotDetail", { slot });
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={staffCalendarStyles.slotCardTime}>{slot.timeRange}</Text>
                            <Text
                              style={[
                                staffCalendarStyles.slotCardTask,
                                calendarWorkSlotTaskText(slot.slotType),
                              ]}
                            >
                              {slot.taskKey ? t(slot.taskKey) : slot.task}
                            </Text>
                            <Text style={staffCalendarStyles.slotCardStatus}>{t(statusKey)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        </ScrollView>
      </View>

      <StaffScreenActionFab
        insetAboveTabBar
        onPress={() => setDayOffActionVisible(true)}
        accessibilityLabel={t("staff_calendar.add_menu_open")}
      />

      <DayOffActionModal
        visible={dayOffActionVisible}
        onClose={() => setDayOffActionVisible(false)}
        onViewLeaveRequests={() => {
          setDayOffActionVisible(false);
          navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("LeaveRequestList");
        }}
        onSendLeaveRequest={() => {
          setDayOffActionVisible(false);
          navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("RequestDayOff");
        }}
      />
    </View>
  );
}
