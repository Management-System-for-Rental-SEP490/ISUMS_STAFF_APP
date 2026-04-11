import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { brandGradient, neutral } from "../theme/color";
import Icons from "../theme/icon";

type StaffScreenActionFabProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  /**
   * Màn nằm trong `StaffTabs`: vùng nội dung đã kết thúc ngay trên tab bar —
   * chỉ cần lề nhỏ, không cộng thêm chiều cao tab (tránh đẩy FAB lên cao).
   */
  insetAboveTabBar?: boolean;
};

/**
 * Nút tròn dấu + góc phải dưới — dùng cho tạo mới / mở menu thao tác thay vì đặt trên header.
 */
export function StaffScreenActionFab({
  onPress,
  accessibilityLabel,
  insetAboveTabBar = false,
}: StaffScreenActionFabProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = insetAboveTabBar
    ? 12
    : Math.max(insets.bottom, 12) + 16;

  return (
    <View style={[styles.wrap, { bottom: bottomPad }]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.touch}
      >
        <LinearGradient
          colors={[brandGradient[0], brandGradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Icons.plus size={26} color={neutral.surface} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  touch: {
    borderRadius: FAB_SIZE / 2,
    overflow: "hidden",
  },
  gradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
