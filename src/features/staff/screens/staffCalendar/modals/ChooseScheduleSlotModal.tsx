/**
 * Modal chọn khung giờ từ lịch làm việc tuần này (khi staff nhấn "Nhận ticket").
 * Hiển thị bảng lịch tuần này, staff chọn một slot rồi nhấn Xác nhận.
 * Sau có API sẽ gửi lên server để gán ticket vào slot đó.
 */
import React, { useState } from "react";
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
import { WorkSlot } from "../data/mockStaffData";

const DAY_LABELS: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

type ChooseScheduleSlotModalProps = {
  visible: boolean;
  onClose: () => void;
  slots: WorkSlot[];
  onConfirm: (slot: WorkSlot) => void;
};

export default function ChooseScheduleSlotModal({
  visible, // hiển thị modal
  onClose,
  slots,
  onConfirm,
}: ChooseScheduleSlotModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedSlot, setSelectedSlot] = useState<WorkSlot | null>(null);

  const handleConfirm = () => {
    if (selectedSlot) {
      onConfirm(selectedSlot);
      onClose();
    }
  };

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
            <Text style={styles.title}>{t("staff_ticket_detail.choose_slot_modal_title")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{t("staff_ticket_detail.choose_slot_modal_hint")}</Text>
          <ScrollView style={styles.tableWrap} showsVerticalScrollIndicator={false}>
            {slots.length === 0 ? (
              <View style={styles.emptySlots}>
                <Text style={styles.emptySlotsText}>{t("staff_ticket_detail.choose_slot_no_free")}</Text>
              </View>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colTime]}>{t("staff_home.schedule_col_time")}</Text>
                  <Text style={[styles.th, styles.colBuilding]}>{t("staff_home.schedule_col_building")}</Text>
                  <Text style={[styles.th, styles.colTask]}>{t("staff_home.schedule_col_task")}</Text>
                </View>
                {slots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              const dayLabel = DAY_LABELS[slot.dayOfWeek] ?? "";
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.tableRow, isSelected && styles.tableRowSelected]}
                  onPress={() => setSelectedSlot(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.td, styles.colTime]} numberOfLines={1}>
                    {dayLabel} {slot.date} • {slot.timeRange}
                  </Text>
                  <Text style={[styles.td, styles.colBuilding]} numberOfLines={1}>
                    {slot.buildingName}
                  </Text>
                  <Text style={[styles.td, styles.colTask]} numberOfLines={2}>
                    {slot.task}
                  </Text>
                </TouchableOpacity>
              );
            })}
              </>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, (!selectedSlot || slots.length === 0) && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedSlot || slots.length === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                {t("staff_ticket_detail.confirm_slot")}
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
  closeBtn: { padding: 4 },
  closeBtnText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    color: "#64748b",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  emptySlots: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptySlotsText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  tableWrap: {
    maxHeight: 320,
    paddingHorizontal: 16,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
    marginBottom: 6,
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableRowSelected: {
   backgroundColor: "#EFF6FF",
   //borderLeftWidth: 4,
   borderLeftColor: "#2563EB",
   marginLeft: -4,
   paddingLeft: 8,
  },
  td: {
    fontSize: 13,
    color: "#374151",
  },
  colTime: { width: "32%" },
  colBuilding: { flex: 1, marginRight: 8 },
  colTask: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
