/**
 * Sheet chọn hành động lịch nghỉ từ FAB trên màn Lịch (xem danh sách / gửi yêu cầu).
 */
import React from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { dayOffActionModalStyles as styles } from "./dayOffActionModalStyles";

export type DayOffActionModalProps = {
  visible: boolean;
  onClose: () => void;
  onViewLeaveRequests: () => void;
  onSendLeaveRequest: () => void;
};

export default function DayOffActionModal({
  visible,
  onClose,
  onViewLeaveRequests,
  onSendLeaveRequest,
}: DayOffActionModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { marginBottom: Math.max(insets.bottom, 8) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>{t("staff_day_off.action_modal_title")}</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onSendLeaveRequest}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t("staff_day_off.send_leave_request")}
          >
            <Text style={styles.primaryBtnText}>{t("staff_day_off.send_leave_request")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onViewLeaveRequests}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t("staff_day_off.view_leave_requests")}
          >
            <Text style={styles.secondaryBtnText}>{t("staff_day_off.view_leave_requests")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{t("profile.cancel")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
