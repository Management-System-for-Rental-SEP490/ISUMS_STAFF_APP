/**
 * Modal 2 lựa chọn khi staff bấm nút "+" trên màn Lịch:
 * 1. Xem yêu cầu nghỉ - navigate đến danh sách yêu cầu nghỉ từ API
 * 2. Gửi yêu cầu nghỉ - navigate đến form gửi (sẽ làm sau)
 */
import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../../shared/types";

type DayOffActionModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function DayOffActionModal({
  visible,
  onClose,
}: DayOffActionModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleViewRequests = () => {
    onClose();
    navigation.navigate("LeaveRequestList");
  };

  const handleSendRequest = () => {
    onClose();
    navigation.navigate("RequestDayOff");
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.container}
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.title}>{t("staff_day_off.action_modal_title")}</Text>
          <TouchableOpacity
            style={styles.option}
            onPress={handleViewRequests}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>
              {t("staff_day_off.view_leave_requests")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={handleSendRequest}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>
              {t("staff_day_off.send_leave_request")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    width: "100%",
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    backgroundColor: "#f8fafc",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  cancelBtn: {
    paddingVertical: 14,
    marginTop: 4,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "600",
  },
});
