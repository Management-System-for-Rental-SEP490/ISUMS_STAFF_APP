/**
 * Màn form gửi yêu cầu nghỉ. POST /api/schedules/leave với staffId, leaveDate, note.
 * Chọn ngày bằng lịch tháng (calendar).
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import Header from "../../../../shared/components/header";
import { CustomAlert } from "../../../../shared/components/alert";
import { useCreateLeaveRequest } from "../../../../shared/hooks";
import { staffDayOffStyles } from "./staffDayOffStyles";
import { neutral } from "../../../../shared/theme/color";

const DAY_HEADER_KEYS: Record<number, string> = {
  0: "staff_calendar.day_short_7", // CN
  1: "staff_calendar.day_short_1",
  2: "staff_calendar.day_short_2",
  3: "staff_calendar.day_short_3",
  4: "staff_calendar.day_short_4",
  5: "staff_calendar.day_short_5",
  6: "staff_calendar.day_short_6",
};

/** Tạo lưới ngày cho một tháng. Trả về mảng 6x7 (có thể có ô trống đầu/cuối). */
function getCalendarDays(year: number, month: number, today: Date) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay(); // 0 = CN
  const totalDays = last.getDate();
  const grid: ({ day: number; ymd: string; isPast: boolean } | null)[] = [];
  // Ô trống trước ngày 1
  for (let i = 0; i < startPad; i++) grid.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const d2 = new Date(year, month, d);
    const ymd = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    grid.push({
      day: d,
      ymd,
      isPast: d2 < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    });
  }
  return grid;
}

export default function StaffRequestDayOffScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [leaveDate, setLeaveDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = tháng hiện tại, 1 = tháng sau...
  const createLeaveMutation = useCreateLeaveRequest();

  const today = useMemo(() => new Date(), []);
  const displayDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      today
    );
  }, [displayDate, today]);

  const monthYearLabel = `${(displayDate.getMonth() + 1).toString().padStart(2, "0")}/${displayDate.getFullYear()}`;

  const handleSubmit = async () => {
    if (!leaveDate) {
      CustomAlert.alert(t("staff_day_off.form_error_title"), t("staff_day_off.form_date_required"), undefined, { type: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveMutation.mutateAsync({
        leaveDate,
        note: note.trim() || "",
      });
      CustomAlert.alert(
        t("common.success"),
        t("staff_day_off.form_success"),
        [{ text: t("common.close"), onPress: () => navigation.goBack() }],
        { type: "success" }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("staff_day_off.load_error");
      CustomAlert.alert(t("common.error"), msg, undefined, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[staffDayOffStyles.container, { paddingBottom: insets.bottom }]}>
      <Header variant="default" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 60 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            staffDayOffStyles.formScroll,
            { paddingBottom: Math.max(320, insets.bottom + 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          <Text style={staffDayOffStyles.formLabel}>{t("staff_day_off.form_date_label")}</Text>

          {/* Lịch tháng */}
          <View style={staffDayOffStyles.calendarCard}>
            <View style={staffDayOffStyles.calendarHeader}>
              <TouchableOpacity
                style={[staffDayOffStyles.calendarNavBtn, monthOffset <= 0 && { opacity: 0.4 }]}
                onPress={() => monthOffset > 0 && setMonthOffset((o) => o - 1)}
                hitSlop={12}
                disabled={monthOffset <= 0}
              >
                <Text style={staffDayOffStyles.calendarNavBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={staffDayOffStyles.calendarMonthTitle}>{monthYearLabel}</Text>
              <TouchableOpacity
                style={staffDayOffStyles.calendarNavBtn}
                onPress={() => setMonthOffset((o) => o + 1)}
                hitSlop={12}
              >
                <Text style={staffDayOffStyles.calendarNavBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            {/* Hàng tiêu đề: T2, T3, ... CN */}
            <View style={staffDayOffStyles.calendarDayHeaderRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
                <View key={dow} style={staffDayOffStyles.calendarDayHeaderCell}>
                  <Text style={staffDayOffStyles.calendarDayHeaderText}>
                    {t(DAY_HEADER_KEYS[dow])}
                  </Text>
                </View>
              ))}
            </View>
            {/* Lưới ngày */}
            <View style={staffDayOffStyles.calendarGrid}>
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <View key={`empty-${idx}`} style={staffDayOffStyles.calendarDayCell} />;
                }
                const { day, ymd, isPast } = cell;
                const selected = leaveDate === ymd;
                const disabled = isPast;
                return (
                  <TouchableOpacity
                    key={ymd}
                    style={[
                      staffDayOffStyles.calendarDayCell,
                      disabled && staffDayOffStyles.calendarDayCellDisabled,
                    ]}
                    onPress={() => !disabled && setLeaveDate(ymd)}
                    activeOpacity={0.75}
                    disabled={disabled}
                  >
                    <View
                      style={[
                        staffDayOffStyles.calendarDayCircle,
                        selected && staffDayOffStyles.calendarDayCircleSelected,
                      ]}
                    >
                      <Text
                          style={[
                            staffDayOffStyles.calendarDayCellText,
                            selected && staffDayOffStyles.calendarDayCellTextSelected,
                            disabled && staffDayOffStyles.calendarDayCellTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={[staffDayOffStyles.formLabel, { marginTop: 20 }]}>
            {t("staff_day_off.form_note_label")}
          </Text>
          <TextInput
            style={staffDayOffStyles.formNoteInput}
            placeholder={t("staff_day_off.form_note_placeholder")}
            placeholderTextColor={neutral.slate400}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!submitting}
          />

          <TouchableOpacity
            style={[
              staffDayOffStyles.formSubmitBtn,
              (!leaveDate || submitting) && staffDayOffStyles.formSubmitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!leaveDate || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={neutral.surface} />
            ) : (
              <Text style={staffDayOffStyles.formSubmitBtnText}>
                {t("staff_day_off.form_submit")}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
