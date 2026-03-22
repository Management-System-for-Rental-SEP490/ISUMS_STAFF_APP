import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brandGradient, neutral } from "../theme/color";
import { appTypography } from "../utils/typography";

export type StackScreenTitleBadgeProps = {
  children: React.ReactNode;
  numberOfLines?: number;
  textStyle?: StyleProp<TextStyle>;
  tone?: "onBrand" | "onLight";
};

/** Đồng bộ Mobile tenant — gradient + safe area + status bar sáng. */
export function StackScreenTitleHeaderStrip({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={stripStyles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[brandGradient[0], brandGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[stripStyles.gradient, { paddingTop: insets.top + 12 }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

export const stackScreenTitleRowStyle = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
}).row;

export const stackScreenTitleBackBtnOnBrand = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
}).btn;

export const stackScreenTitleOnBrandIconColor = neutral.surface;

export function StackScreenTitleBadge({
  children,
  numberOfLines = 1,
  textStyle,
  tone = "onBrand",
}: StackScreenTitleBadgeProps) {
  const onBrand = tone === "onBrand";
  return (
    <View style={onBrand ? styles.badgeOnBrand : styles.badgeOnLight}>
      <Text
        style={[onBrand ? styles.textOnBrand : styles.textOnLight, textStyle]}
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
    </View>
  );
}

export function StackScreenTitleBarBalance() {
  return <View style={styles.balance} pointerEvents="none" />;
}

export const stackScreenTitleCenterSlotStyle = StyleSheet.create({
  slot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
}).slot;

export const stackScreenTitleSideSlotStyle = StyleSheet.create({
  slot: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
}).slot;

const stripStyles = StyleSheet.create({
  wrapper: {
    width: "100%",
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
});

const styles = StyleSheet.create({
  badgeOnLight: {
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: neutral.backgroundElevated,
    borderWidth: 1,
    borderColor: neutral.slate200,
  },
  textOnLight: {
    ...appTypography.listTitle,
    fontWeight: "500",
    color: neutral.slate600,
    textAlign: "center",
  },
  badgeOnBrand: {
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
  },
  textOnBrand: {
    ...appTypography.listTitle,
    fontWeight: "600",
    color: neutral.surface,
    textAlign: "center",
  },
  balance: {
    width: 48,
    height: 48,
  },
});
