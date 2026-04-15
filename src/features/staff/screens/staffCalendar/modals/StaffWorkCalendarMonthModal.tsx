/**
 * Lịch tháng cùng giao diện trang xin nghỉ — chọn ngày để nhảy tới tuần chứa ngày đó trên lịch làm việc.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { staffDayOffStyles } from "../../staffDayOff/staffDayOffStyles";

const DAY_HEADER_KEYS: Record<number, string> = {
  0: "staff_calendar.day_short_7",
  1: "staff_calendar.day_short_1",
  2: "staff_calendar.day_short_2",
  3: "staff_calendar.day_short_3",
  4: "staff_calendar.day_short_4",
  5: "staff_calendar.day_short_5",
  6: "staff_calendar.day_short_6",
};

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const totalDays = last.getDate();
  const grid: ({ day: number; ymd: string } | null)[] = [];
  for (let i = 0; i < startPad; i++) grid.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const ymd = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    grid.push({ day: d, ymd });
  }
  return grid;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Tháng mở lần đầu (bất kỳ ngày trong tháng). */
  initialMonth: Date;
  onSelectDay: (ymd: string) => void;
};

export function StaffWorkCalendarMonthModal({ visible, onClose, initialMonth, onSelectDay }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState(() => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));

  useEffect(() => {
    if (!visible) return;
    setView(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  }, [visible, initialMonth]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthYearLabel = `${(month + 1).toString().padStart(2, "0")}/${year}`;
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  const shiftMonth = (delta: number) => {
    setView((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  const shiftYear = (delta: number) => {
    setView((d) => new Date(d.getFullYear() + delta, d.getMonth(), 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.45)",
          justifyContent: "center",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <View style={[staffDayOffStyles.calendarCard, { marginBottom: 0 }]}>
            <View style={staffDayOffStyles.calendarHeader}>
              <TouchableOpacity style={staffDayOffStyles.calendarNavBtn} onPress={() => shiftMonth(-1)} hitSlop={12}>
                <Text style={staffDayOffStyles.calendarNavBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={staffDayOffStyles.calendarMonthTitle}>{monthYearLabel}</Text>
              <TouchableOpacity style={staffDayOffStyles.calendarNavBtn} onPress={() => shiftMonth(1)} hitSlop={12}>
                <Text style={staffDayOffStyles.calendarNavBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                marginBottom: 12,
              }}
            >
              <TouchableOpacity style={staffDayOffStyles.calendarNavBtn} onPress={() => shiftYear(-1)} hitSlop={8}>
                <Text style={[staffDayOffStyles.calendarNavBtnText, { fontSize: 16 }]}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#334155" }}>{year}</Text>
              <TouchableOpacity style={staffDayOffStyles.calendarNavBtn} onPress={() => shiftYear(1)} hitSlop={8}>
                <Text style={[staffDayOffStyles.calendarNavBtnText, { fontSize: 16 }]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={staffDayOffStyles.calendarDayHeaderRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                <View key={dow} style={staffDayOffStyles.calendarDayHeaderCell}>
                  <Text style={staffDayOffStyles.calendarDayHeaderText}>{t(DAY_HEADER_KEYS[dow])}</Text>
                </View>
              ))}
            </View>
            <View style={staffDayOffStyles.calendarGrid}>
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <View key={`empty-${idx}`} style={staffDayOffStyles.calendarDayCell} />;
                }
                const { day, ymd } = cell;
                return (
                  <TouchableOpacity
                    key={ymd}
                    style={staffDayOffStyles.calendarDayCell}
                    onPress={() => {
                      onSelectDay(ymd);
                      onClose();
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={staffDayOffStyles.calendarDayCircle}>
                      <Text style={staffDayOffStyles.calendarDayCellText}>{day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ marginTop: 14, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b" }}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
