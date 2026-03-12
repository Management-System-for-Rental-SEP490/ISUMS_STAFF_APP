/**
 * Modal đăng ký ngày nghỉ cho Staff.
 * Mặc định staff làm 8h–18h mỗi ngày; chỉ cần chọn ngày muốn nghỉ trong tuần.
 * Chọn ngày đã nghỉ → nút "Bỏ đăng ký nghỉ"; chọn ngày chưa nghỉ → "Đăng ký nghỉ ngày này".
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStaffSchedule } from "../../../context/StaffScheduleContext";
import { getThisWeekDatesForPicker } from "../../../data/mockStaffData";

type BookScheduleModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

export default function BookScheduleModal({
  visible,
  onClose,
  onConfirm,
}: BookScheduleModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayOffList, addDayOff, removeDayOff } = useStaffSchedule();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const weekDays = useMemo(() => getThisWeekDatesForPicker(), []);

  const handleConfirm = () => {
    if (!selectedDate) return;
    if (dayOffList.includes(selectedDate)) {
      removeDayOff(selectedDate); // nếu chọn vô ngày đã state nghỉ thì bỏ nghỉ
    } else {
      addDayOff(selectedDate); // nếu chọn vô ngày chưa state nghỉ thì thêm vào state nghỉ
    }
    onConfirm?.(); // gọi hàm onConfirm nếu có
    onClose(); // đóng modal
  };

  const isSelectedOff = selectedDate != null && dayOffList.includes(selectedDate);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.title}>{t("staff_book_schedule_modal.title")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>{t("staff_book_schedule_modal.hint")}</Text>
            <Text style={[styles.label, { marginTop: 16 }]}>
              {t("staff_book_schedule_modal.day_label")}
            </Text>
            <View style={styles.dayRow}>
              {weekDays.map((d) => {
                const isOff = dayOffList.includes(d.date);
                const isSelected = selectedDate === d.date;
                return (
                  <TouchableOpacity
                    key={d.date}
                    style={[
                      styles.dayChip,
                      isOff && styles.dayChipOff,
                      isSelected && styles.dayChipSelected,
                    ]}
                    onPress={() => setSelectedDate(d.date)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        isOff && styles.dayChipTextOff,
                        isSelected && styles.dayChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {d.dateLabel}
                    </Text>
                    {isOff && (
                      <Text style={styles.badgeOff}>{t("staff_book_schedule_modal.already_off")}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedDate && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedDate}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                {selectedDate
                  ? isSelectedOff // nếu chọn vô ngày đã state nghỉ thì hiển thị "Bỏ đăng ký nghỉ"
                    ? t("staff_book_schedule_modal.confirm_remove_off")
                    : t("staff_book_schedule_modal.confirm_off")
                  : t("staff_book_schedule_modal.confirm_off")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: "#64748b",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    minWidth: 90,
  },
  dayChipOff: {
    backgroundColor: "#fef3c7",
  },
  dayChipSelected: {
    backgroundColor: "#2563EB",
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  dayChipTextOff: {
    color: "#92400e",
  },
  dayChipTextSelected: {
    color: "#fff",
  },
  badgeOff: {
    fontSize: 11,
    color: "#92400e",
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  confirmBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
