import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icons from "../../../../../shared/theme/icon";
import { brandTintBg, neutral } from "../../../../../shared/theme/color";
import { appTypography } from "../../../../../shared/utils";

type IotAddDeviceMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddController: () => void;
  onAddNode: () => void;
};

/**
 * Menu chọn loại thiết bị IoT cần thêm (Controller / Node).
 * Hiển thị căn giữa màn hình (cùng pattern với DayOffActionModal, AssignNfcModal).
 */
export function IotAddDeviceMenuModal({
  visible,
  onClose,
  onAddController,
  onAddNode,
}: IotAddDeviceMenuModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.container, { paddingBottom: 12 + insets.bottom }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.title}>{t("staff_iot.add_menu_title")}</Text>

          <TouchableOpacity
            style={styles.option}
            activeOpacity={0.85}
            onPress={onAddController}
            accessibilityRole="button"
            accessibilityLabel={t("staff_iot.add_controller")}
          >
            <View style={styles.optionIcon}>
              <Icons.electric size={18} color={neutral.iconMuted} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.optionTitle}>{t("staff_iot.add_controller")}</Text>
              <Text style={styles.optionSub} numberOfLines={2}>
                {t("staff_iot.add_controller_sub")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            activeOpacity={0.85}
            onPress={onAddNode}
            accessibilityRole="button"
            accessibilityLabel={t("staff_iot.add_node")}
          >
            <View style={styles.optionIcon}>
              <Icons.water size={18} color={neutral.iconMuted} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.optionTitle}>{t("staff_iot.add_node")}</Text>
              <Text style={styles.optionSub} numberOfLines={2}>
                {t("staff_iot.add_node_sub")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.85}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
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
    alignSelf: "center",
    flexGrow: 0,
    backgroundColor: neutral.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    width: "100%",
    maxWidth: 360,
    maxHeight: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    ...appTypography.itemTitle,
    fontWeight: "800",
    color: neutral.text,
    marginBottom: 14,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surface,
    marginBottom: 10,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brandTintBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    ...appTypography.itemTitle,
    fontWeight: "800",
    color: neutral.text,
  },
  optionSub: {
    ...appTypography.caption,
    color: neutral.textSecondary,
    marginTop: 2,
  },
  cancelBtn: {
    
    paddingTop: 6,
  
    alignItems: "center",
  },
  cancelBtnText: {
    ...appTypography.buttonLabel,
    color: neutral.slate500,
    fontWeight: "600",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
