/**
 * Màn hình Lịch làm việc của Staff.
 * Tuần này: timeline theo từng ngày. Nút "+" cạnh "Lịch tuần này" mở modal đăng ký lịch (book schedule).
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import Header from "../../../../shared/components/header";
import {
  getWorkScheduleThisWeek,
  getScheduleTimelineRange,
  WorkSlot,
  SlotType,
} from "../../data/mockStaffData";
import { useStaffSchedule } from "../../context/StaffScheduleContext";
import BookScheduleModal from "./modals/BookScheduleModal";
import { staffCalendarStyles, HOUR_HEIGHT, SLOT_COLORS, TIMELINE_START_HOUR } from "./staffCalendarStyles";

/** Slot kéo dài thêm vào ô giờ tiếp theo để thể hiện rõ "đến" 2h (phủ lên ô 2h) */
const SLOT_OVERLAP_NEXT_ROW = Math.floor(HOUR_HEIGHT / 2);

const DAY_LABELS: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

/** Tạo danh sách mốc giờ để vẽ trục, format 08 AM, 12 PM, 01 PM... */
function getTimeTicks(startHour: number, endHour: number): string[] {
  const ticks: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const hourStr = displayHour.toString().padStart(2, "0");
    const ampm = h < 12 ? "AM" : "PM";
    ticks.push(`${hourStr} ${ampm}`);
  }
  return ticks;
}

function getSlotColor(slotType?: SlotType): string {
  return slotType ? (SLOT_COLORS[slotType] ?? SLOT_COLORS.other) : SLOT_COLORS.other;
}

/** Rút gọn ticketId: UUID dài chỉ hiển thị 8 ký tự cuối, ID ngắn (T001) giữ nguyên */
function formatTicketDisplay(ticketId?: string): string {
  if (!ticketId || !ticketId.trim()) return "";
  const s = ticketId.trim();
  if (s.length > 12 || s.includes("-")) return `#${s.slice(-8)}`;
  return `#${s}`;
}

/** Tính top (px) và height (px) cho block slot trên timeline */ //Hàm này quy đổi “slot từ mấy giờ đến mấy giờ” thành “vẽ ô ở đâu và cao bao nhiêu” trên màn hình Lịch.
function getSlotLayout(startMinutes: number, endMinutes: number, baseStartHour: number = TIMELINE_START_HOUR) {
  const startHour = startMinutes / 60;
  const top = Math.max(0, (startHour - baseStartHour) * HOUR_HEIGHT);
  const durationHours = (endMinutes - startMinutes) / 60;
  const height = Math.max(24, durationHours * HOUR_HEIGHT);
  return { top, height };
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { dayOffList, scheduleTemplate, workSlots } = useStaffSchedule();
  const [bookScheduleVisible, setBookScheduleVisible] = useState(false);

  const { startHour: timelineStartHour, endHour: timelineEndHour } = useMemo(
    () => getScheduleTimelineRange(scheduleTemplate),
    [scheduleTemplate]
  );
  const hoursCount = timelineEndHour - timelineStartHour;
  const timeTicks = useMemo(
    () => getTimeTicks(timelineStartHour, timelineEndHour),
    [timelineStartHour, timelineEndHour]
  );

  // Ưu tiên work slots từ API; không có thì dùng mock từ getWorkScheduleThisWeek
  const slotsByDay = useMemo(() => {
    const map: Record<number, WorkSlot[]> = {};
    for (let d = 1; d <= 7; d++) map[d] = [];

    if (workSlots && workSlots.length > 0) {
      workSlots.forEach((slot) => {
        if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = [];
        map[slot.dayOfWeek].push(slot);
      });
    } else {
      const schedule = getWorkScheduleThisWeek(dayOffList, scheduleTemplate)
        .filter((slot) => slot.ticketId && slot.ticketId.trim() !== "");
      schedule.forEach((slot) => {
        if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = [];
        map[slot.dayOfWeek].push(slot);
      });
    }
    Object.keys(map).forEach((d) => {
      const arr = map[Number(d)];
      arr.sort((a, b) => a.startMinutes - b.startMinutes);
    });
    return map;
  }, [dayOffList, scheduleTemplate, workSlots]);

  const isDayOff = useMemo(() => {
    const set = new Set(dayOffList);
    return (date: string) => set.has(date);
  }, [dayOffList]);

  const timelineMinHeight = hoursCount * HOUR_HEIGHT;

  const renderDayTimeline = (dayOfWeek: number, daySlots: WorkSlot[], date: string) => {
    const dayLabel = DAY_LABELS[dayOfWeek] ?? "";
    const off = isDayOff(date);
    return (
      <View key={dayOfWeek} style={staffCalendarStyles.dayCard}>
        <View style={staffCalendarStyles.dayHeader}>
          <Text style={staffCalendarStyles.dayTitle}>
            {dayLabel} {date}
            {off ? ` • ${t("staff_calendar.day_off_label")}` : ""}
          </Text>
        </View>
        <View style={[staffCalendarStyles.timelineRow, { minHeight: timelineMinHeight }]}>
          <View style={staffCalendarStyles.timeAxis}>
            {timeTicks.map((label, i) => (
              <View key={i} style={staffCalendarStyles.timeTick}>
                <Text style={staffCalendarStyles.timeTickText}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={[staffCalendarStyles.timelineContent, { minHeight: timelineMinHeight }]}>
            {daySlots.length > 0 && (
              <View style={staffCalendarStyles.timelineGrid}>
                {Array.from({ length: hoursCount }).map((_, i) => (
                  <View key={i} style={staffCalendarStyles.timelineGridRow} />
                ))}
              </View>
            )}
            {off || daySlots.length === 0 ? (
              <View style={staffCalendarStyles.emptyDayHint}>
                <Text style={staffCalendarStyles.emptyDayHintText}>
                  {off ? t("staff_calendar.day_off_label") : t("staff_calendar.no_slots_today")}
                </Text>
              </View>
            ) : (
              daySlots.map((slot) => {
                const { top, height } = getSlotLayout(
                  slot.startMinutes,
                  slot.endMinutes,
                  timelineStartHour
                );
                const bgColor = getSlotColor(slot.slotType);
                const ticketDisplay = formatTicketDisplay(slot.ticketId);
                const subText = [slot.buildingName !== "-" && slot.buildingName, ticketDisplay]
                  .filter(Boolean)
                  .join(" • ") || "";
                return (
                  <View
                    key={slot.id}
                    style={[
                      staffCalendarStyles.slotBlock,
                      {
                        backgroundColor: bgColor,
                        borderLeftColor: "rgba(255,255,255,0.6)",
                        top,
                        height: height + SLOT_OVERLAP_NEXT_ROW,
                      },
                    ]}
                  >
                    <Text style={staffCalendarStyles.slotBlockTitle} numberOfLines={1} ellipsizeMode="tail">
                      {slot.taskKey ? t(slot.taskKey) : slot.task}
                    </Text>
                    <Text style={staffCalendarStyles.slotBlockTime}>
                      {slot.timeRange}
                    </Text>
                    {subText ? (
                      <Text style={staffCalendarStyles.slotBlockSub} numberOfLines={1} ellipsizeMode="tail">
                        {subText}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>
    );
  };
/** Tạo danh sách các ngày trong tuần */
  const thisWeekDays = useMemo(() => {
    const weekDays: { dayOfWeek: number; date: string }[] = [];
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push({
        dayOfWeek: d.getDay() === 0 ? 7 : d.getDay(),
        date:
          d.getDate().toString().padStart(2, "0") +
          "/" +
          (d.getMonth() + 1).toString().padStart(2, "0"),
      });
    }
    return weekDays;
  }, []);

  return (
    <View style={staffCalendarStyles.container}>
      <Header variant="default" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={staffCalendarStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={calendarTitleRow}>
          <Text style={staffCalendarStyles.sectionTitle}>
            {t("staff_calendar.this_week_title")}
          </Text>
          <TouchableOpacity
            style={addButton}
            onPress={() => setBookScheduleVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        {thisWeekDays.map(({ dayOfWeek, date }) =>
          renderDayTimeline(dayOfWeek, slotsByDay[dayOfWeek] ?? [], date)
        )}
      </ScrollView>

      <BookScheduleModal
        visible={bookScheduleVisible}
        onClose={() => setBookScheduleVisible(false)}
        onConfirm={() => {}}
      />
    </View>
  );
}

const calendarTitleRow = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  marginBottom: 4,
};
const addButton = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#2563EB",
  justifyContent: "center" as const,
  alignItems: "center" as const,
};
const addButtonText = {
  fontSize: 22,
  fontWeight: "600" as const,
  color: "#fff",
};
