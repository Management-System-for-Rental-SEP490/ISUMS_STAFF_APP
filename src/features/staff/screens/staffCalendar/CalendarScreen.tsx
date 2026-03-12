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
import { getWorkScheduleThisWeek, WorkSlot, SlotType } from "../../data/mockStaffData";
import { useStaffSchedule } from "../../context/StaffScheduleContext";
import BookScheduleModal from "./modals/BookScheduleModal";
import {
  staffCalendarStyles,
  HOUR_HEIGHT,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  SLOT_COLORS,
} from "./staffCalendarStyles";

const HOURS_COUNT = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // trả về số giờ từ 08:00 đến 18:00

const DAY_LABELS: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

/** Tạo danh sách mốc giờ để vẽ trục (08:00 - 18:00), format 08 AM, 12 PM, 01 PM... */
function getTimeTicks(): string[] {
  const ticks: string[] = [];
  for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const hourStr = displayHour.toString().padStart(2, "0");
    const ampm = h < 12 ? "AM" : "PM";
    ticks.push(`${hourStr} ${ampm}`);
  }
  return ticks;
}

const TIME_TICKS = getTimeTicks();

function getSlotColor(slotType?: SlotType): string {
  return slotType ? (SLOT_COLORS[slotType] ?? SLOT_COLORS.other) : SLOT_COLORS.other;
}

/** Tính top (px) và height (px) cho block slot trên timeline */ //Hàm này quy đổi “slot từ mấy giờ đến mấy giờ” thành “vẽ ô ở đâu và cao bao nhiêu” trên màn hình Lịch.
function getSlotLayout(startMinutes: number, endMinutes: number) {
  const startHour = startMinutes / 60;
  const endHour = endMinutes / 60;
  const top = Math.max(0, (startHour - TIMELINE_START_HOUR) * HOUR_HEIGHT);
  const durationHours = (endMinutes - startMinutes) / 60;
  const height = Math.max(24, durationHours * HOUR_HEIGHT);
  return { top, height };
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { dayOffList } = useStaffSchedule();
  const [bookScheduleVisible, setBookScheduleVisible] = useState(false);

  // Chỉ hiển thị các slot có ticketId (có việc) - không render tất cả khung giờ
  const slotsByDay = useMemo(() => {
    const schedule = getWorkScheduleThisWeek(dayOffList)
      .filter((slot) => slot.ticketId && slot.ticketId.trim() !== "");
    const map: Record<number, WorkSlot[]> = {};
    for (let d = 1; d <= 7; d++) map[d] = [];
    schedule.forEach((slot) => {
      if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = [];
      map[slot.dayOfWeek].push(slot);
    });
    Object.keys(map).forEach((d) => {
      const arr = map[Number(d)];
      arr.sort((a, b) => a.startMinutes - b.startMinutes);
    });
    return map;
  }, [dayOffList]);

  const isDayOff = useMemo(() => {
    const set = new Set(dayOffList);
    return (date: string) => set.has(date);
  }, [dayOffList]);

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
        <View style={staffCalendarStyles.timelineRow}>
          <View style={staffCalendarStyles.timeAxis}>
            {TIME_TICKS.map((label, i) => (
              <View key={i} style={staffCalendarStyles.timeTick}>
                <Text style={staffCalendarStyles.timeTickText}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={staffCalendarStyles.timelineContent}>
            {daySlots.length > 0 && (
              <View style={staffCalendarStyles.timelineGrid}>
                {Array.from({ length: HOURS_COUNT }).map((_, i) => (
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
                const { top, height } = getSlotLayout(slot.startMinutes, slot.endMinutes);
                const bgColor = getSlotColor(slot.slotType);
                return (
                  <View
                    key={slot.id}
                    style={[
                      staffCalendarStyles.slotBlock,
                      {
                        backgroundColor: bgColor,
                        top,
                        height,
                      },
                    ]}
                  >
                    <Text style={staffCalendarStyles.slotBlockTitle} numberOfLines={2}>
                      {slot.task}
                    </Text>
                    <Text style={staffCalendarStyles.slotBlockTime}>
                      {slot.timeRange}
                    </Text>
                    <Text style={staffCalendarStyles.slotBlockSub} numberOfLines={1}>
                      {slot.buildingName}
                      {slot.ticketId ? ` • #${slot.ticketId}` : ""}
                    </Text>
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
