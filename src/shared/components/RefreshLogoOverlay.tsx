import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  processColor,
  RefreshControl,
  useWindowDimensions,
  type ColorValue,
  type RefreshControlProps,
} from "react-native";
import { useTranslation } from "react-i18next";
import { neutral } from "../theme/color";
import { refreshControlAndroidGateProps } from "../hooks/useRefreshControlGate";

const LOGO = require("../../../assets/logob.png");

const RING_PADDING = (px: number) => Math.max(4, Math.round(px * 0.14));
const ringSize = (logoPx: number) => logoPx + RING_PADDING(logoPx) * 2;

const REFRESH_SLIDE_OFFSET = 56;

/** Màu alpha 0 (processColor) — Android parse string rgba đôi khi vẫn nháy vòng mặc định một frame. */
const ANDROID_TRANSPARENT: number = (() => {
  const c = processColor("#00000000");
  return typeof c === "number" ? c : 0;
})();
/** Android Material dùng nhiều màu cho vòng — gán hết alpha 0 để không vẽ sắc. */
const ANDROID_GHOST_COLORS = [
  ANDROID_TRANSPARENT,
  ANDROID_TRANSPARENT,
  ANDROID_TRANSPARENT,
] as unknown as ColorValue[];

export type RefreshLogoOverlayMode = "pull" | "page";

type RefreshPullContentProps = {
  logoPx: number;
  labelKey?: string;
  /** `false`: chỉ logo (nút / hàng tải); `true`: kèm chữ (pull, page). */
  showLabel?: boolean;
};

/**
 * Logo trong khung tròn + rotateY + chữ tùy chọn (pull, page, inline).
 */
function RefreshPullContent({
  logoPx,
  labelKey = "common.loading",
  showLabel = true,
}: RefreshPullContentProps) {
  const { t } = useTranslation();
  const flip = useRef(new Animated.Value(0)).current;
  const rs = ringSize(logoPx);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(flip, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [flip]);

  const rotateY = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t(labelKey)}
      style={{ alignItems: "center" }}
    >
      <Animated.View
        style={{
          width: rs,
          height: rs,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ perspective: 900 }, { rotateY }],
        }}
      >
        <View
          style={{
            width: rs,
            height: rs,
            borderRadius: rs / 2,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={LOGO}
            style={{ width: logoPx, height: logoPx, resizeMode: "contain" }}
          />
        </View>
      </Animated.View>
      {showLabel ? (
        <Text
          style={{
            marginTop: 10,
            fontSize: 13,
            color: neutral.textSecondary,
            textAlign: "center",
          }}
        >
          {t(labelKey)}
        </Text>
      ) : null}
    </View>
  );
}

const LOGO_PX_INLINE_DEFAULT = 22;

export type RefreshLogoInlineProps = {
  visible?: boolean;
  logoPx?: number;
  labelKey?: string;
  showLabel?: boolean;
};

/**
 * Logo xoay cùng hệ thống với pull/page, kích thước nhỏ — dùng trong nút, hàng, ô tải lẻ.
 */
export function RefreshLogoInline({
  visible = true,
  logoPx = LOGO_PX_INLINE_DEFAULT,
  labelKey = "common.loading",
  showLabel = false,
}: RefreshLogoInlineProps) {
  if (!visible) return null;
  return <RefreshPullContent logoPx={logoPx} labelKey={labelKey} showLabel={showLabel} />;
}

const LOGO_PX_PULL = 36;
const LOGO_PX_PAGE = 56;

export type RefreshLogoOverlayProps = {
  visible: boolean;
  /**
   * `pull` — mép trên list (kéo làm mới), có trượt từ trên.
   * `page` — full khối tải dữ liệu (giữa màn / vùng flex).
   */
  mode?: RefreshLogoOverlayMode;
  /** Chỉ `mode === 'pull'`: khoảng cách từ mép trên vùng cuộn. */
  offsetTop?: number;
  /** Key i18n cho chữ dưới logo (mặc định `common.loading`). */
  labelKey?: string;
};

/**
 * UI tải dữ liệu thống nhất: logo khung tròn + rotateY + chữ.
 * - `pull`: dùng cùng gesture pull-to-refresh (đặt absolute trên list; spinner native ẩn — dùng `PullToRefreshControl`).
 * - `page`: phủ vùng cha (`flex:1` + `position:'relative'`) — căn giữa.
 */
export function RefreshLogoOverlay({
  visible,
  mode = "pull",
  offsetTop = 10,
  labelKey = "common.loading",
}: RefreshLogoOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const hasShownRef = useRef(false);
  const translateY = useRef(new Animated.Value(-REFRESH_SLIDE_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      translateY.stopAnimation();
      opacity.stopAnimation();
      scale.stopAnimation();
      hasShownRef.current = true;
      setMounted(true);

      if (mode === "pull") {
        translateY.setValue(-REFRESH_SLIDE_OFFSET);
        opacity.setValue(0);
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            friction: 9,
            tension: 68,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        opacity.setValue(0);
        scale.setValue(0.96);
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
        ]).start();
      }
      return;
    }

    if (!hasShownRef.current) return;

    if (mode === "pull") {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -REFRESH_SLIDE_OFFSET,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          hasShownRef.current = false;
          setMounted(false);
        }
      });
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          hasShownRef.current = false;
          setMounted(false);
        }
      });
    }
  }, [visible, mode]);

  if (!visible && !mounted) return null;

  const logoPx = mode === "pull" ? LOGO_PX_PULL : LOGO_PX_PAGE;

  if (mode === "page") {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center", zIndex: 999 }]}
      >
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <RefreshPullContent logoPx={logoPx} labelKey={labelKey} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: offsetTop,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateY }],
          opacity,
        }}
      >
        <RefreshPullContent logoPx={logoPx} labelKey={labelKey} />
      </Animated.View>
    </View>
  );
}

export type PullToRefreshControlProps = RefreshControlProps & {
  scrollAtTop?: boolean;
};

/**
 * Pull-to-refresh “vô hình”: native vẫn mount (gesture + refreshing), chỉ không thấy vòng/spinner hệ thống.
 * Logo thương hiệu: `RefreshLogoOverlay` mode `pull`.
 */
export function PullToRefreshControl({ scrollAtTop, ...rest }: PullToRefreshControlProps) {
  const { height: windowH } = useWindowDimensions();
  const refreshing = Boolean(rest.refreshing);
  const androidGate =
    scrollAtTop !== undefined
      ? refreshControlAndroidGateProps(scrollAtTop, refreshing)
      : {};

  /** Đẩy indicator native ra ngoài viewport theo chiều cao thực (mọi máy / xoay màn). */
  const ghostProgressOffset = useMemo(() => {
    if (Platform.OS === "ios") {
      return Math.round(windowH + 240);
    }
    return -Math.round(Math.max(windowH * 0.95, 720));
  }, [windowH]);

  const {
    progressViewOffset: _ignoreProgressOffset,
    tintColor: _ignoreTint,
    titleColor: _ignoreTitleColor,
    colors: _ignoreColors,
    progressBackgroundColor: _ignoreProgressBg,
    ...restSafe
  } = rest;

  return (
    <RefreshControl
      {...restSafe}
      {...androidGate}
      progressViewOffset={ghostProgressOffset}
      tintColor={Platform.OS === "ios" ? "rgba(0,0,0,0)" : undefined}
      titleColor={Platform.OS === "ios" ? "rgba(0,0,0,0)" : undefined}
      colors={Platform.OS === "android" ? ANDROID_GHOST_COLORS : undefined}
      progressBackgroundColor={
        Platform.OS === "android" ? (ANDROID_TRANSPARENT as unknown as ColorValue) : undefined
      }
      title={undefined}
    />
  );
}
