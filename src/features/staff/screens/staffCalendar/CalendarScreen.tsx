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
import { useNavigation, useFocusEffect, type NavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Header from "../../../../shared/components/header";
import { getWorkingDaysFromTemplate } from "../../data/mockStaffData";
import type { WorkSlot, SlotType } from "../../data/mockStaffData";
import { useStaffSchedule } from "../../context/StaffScheduleContext";
import DayOffActionModal from "./modals/DayOffActionModal";
import { staffCalendarStyles, SLOT_COLORS } from "./staffCalendarStyles";

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

/** Key i18n cho ngày đầy đủ (Thứ Hai, Monday, 月曜日...) - 1=Mon..7=Sun */
const DAY_FULL_KEYS: Record<number, string> = {
  1: "staff_calendar.day_full_1",
  2: "staff_calendar.day_full_2",
  3: "staff_calendar.day_full_3",
  4: "staff_calendar.day_full_4",
  5: "staff_calendar.day_full_5",
  6: "staff_calendar.day_full_6",
  7: "staff_calendar.day_full_7",
};

const JOB_STATUS_KEYS = new Set([
  "CREATED", "SCHEDULED", "NEED_RESCHEDULE", "IN_PROGRESS", "COMPLETED",
  "FAILED", "CANCELLED", "OVERDUE", "AVAILABLE", "BOOKED",
]);

function getSlotColor(slotType?: SlotType): string {
  return slotType ? (SLOT_COLORS[slotType] ?? SLOT_COLORS.other) : SLOT_COLORS.other;
}

function getJobStatusKey(status: string | undefined): string {
  if (!status) return "staff_calendar.job_status_OTHER";
  const key = `staff_calendar.job_status_${status.toUpperCase()}`;
  return JOB_STATUS_KEYS.has(status.toUpperCase()) ? key : "staff_calendar.job_status_OTHER";
}

/** Giữ để tương thích - workslot không hiển thị ticket nữa, chỉ status + time + jobType */
function formatTicketDisplay(_ticketId?: string): string {
  return "";
}

function formatDateRange(start: Date, end: Date): string {
  const s = `${start.getDate().toString().padStart(2, "0")}/${(start.getMonth() + 1).toString().padStart(2, "0")}/${start.getFullYear()}`;
  const e = `${end.getDate().toString().padStart(2, "0")}/${(end.getMonth() + 1).toString().padStart(2, "0")}/${end.getFullYear()}`;
  return `${s} - ${e}`;
}

function formatMonthYear(d: Date): string {
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dayOffList, scheduleTemplate, workSlots, refetchTemplate, refetchLeaveRequests } = useStaffSchedule();
  const [dayOffActionVisible, setDayOffActionVisible] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      refetchLeaveRequests();
    }, [refetchLeaveRequests])
  );

  const navigateWeek = (delta: number) => setWeekOffset((prev) => prev + delta);

  return (
    <View style={staffCalendarStyles.container}>
      <Header variant="default" />
      {/* Phần cố định: title + week nav + danh sách ngày - không scroll */}
      <View style={staffCalendarStyles.fixedTopSection}>
        <View style={staffCalendarStyles.titleRow}>
          <Text style={staffCalendarStyles.sectionTitle}>
            {t("staff_calendar.weekly_timetable")}
          </Text>
          <TouchableOpacity
            style={staffCalendarStyles.addButton}
            onPress={() => setDayOffActionVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={staffCalendarStyles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {weekStart && weekEnd && (
          <View style={staffCalendarStyles.weekNavRow}>
            <Text style={staffCalendarStyles.weekNavLabel}>
              {t("staff_calendar.current_week")}: {formatDateRange(weekStart, weekEnd)}
            </Text>
            <View style={staffCalendarStyles.weekNavArrows}>
              <TouchableOpacity style={staffCalendarStyles.navArrow} onPress={() => navigateWeek(-1)} activeOpacity={0.7}>
                <Text style={staffCalendarStyles.navArrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={staffCalendarStyles.weekNavMonthWrap}
                onPress={() => setSelectedDateYMD(null)}
                activeOpacity={0.7}
              >
                <Text style={staffCalendarStyles.monthText}>{formatMonthYear(weekStart)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={staffCalendarStyles.navArrow} onPress={() => navigateWeek(1)} activeOpacity={0.7}>
                <Text style={staffCalendarStyles.navArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={staffCalendarStyles.daysHeaderRow}>
          {weekDays.map(({ dayOfWeek, date, dateYMD }) => {
            const daySlots = slotsByDate[date] ?? [];
            const hasWorkslots = daySlots.length > 0;
            const isSelected = dateYMD === effectiveSelected;
            const dayLabel = t(DAY_FULL_KEYS[dayOfWeek] ?? "staff_calendar.day_full_1");
            return (
              <TouchableOpacity
                key={dayOfWeek}
                style={staffCalendarStyles.daysHeaderCell}
                onPress={() => setSelectedDateYMD(selectedDateYMD === dateYMD ? null : dateYMD)}
                activeOpacity={0.7}
              >
                <Text style={[staffCalendarStyles.daysHeaderDay, isSelected && staffCalendarStyles.daysHeaderDayToday]}>
                  {dayLabel}
                </Text>
                <View style={[staffCalendarStyles.daysHeaderNumWrap, isSelected && staffCalendarStyles.daysHeaderNumWrapToday]}>
                  <Text style={[staffCalendarStyles.daysHeaderNum, isSelected && staffCalendarStyles.daysHeaderNumToday]}>
                    {date.split("/")[0]}
                  </Text>
                </View>
                {hasWorkslots && <View style={staffCalendarStyles.daysHeaderDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Chỉ bảng lịch scroll - danh sách ngày luôn cố định phía trên */}
      <ScrollView
        style={staffCalendarStyles.timetableScroll}
        contentContainerStyle={staffCalendarStyles.timetableScrollContent}
        showsVerticalScrollIndicator={false}
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
                      {daySlots.map((slot) => {
                        const bgColor = getSlotColor(slot.slotType);
                        const statusKey = getJobStatusKey(slot.status);
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[staffCalendarStyles.slotCard, { borderLeftColor: bgColor }]}
                            onPress={() => {
                              navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("WorkSlotDetail", { slot });
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={staffCalendarStyles.slotCardTime}>{slot.timeRange}</Text>
                            <Text style={[staffCalendarStyles.slotCardTask, { color: bgColor }]}>
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

      <DayOffActionModal
        visible={dayOffActionVisible}
        onClose={() => setDayOffActionVisible(false)}
      />
    </View>
  );
}
