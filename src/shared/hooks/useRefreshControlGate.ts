import { useCallback, useState } from "react";
import { Platform } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Dung sai pixel: coi là đầu danh sách khi offsetY <= giá trị này (subpixel / safe area). */
const AT_TOP_EPSILON = 5;

/**
 * Android: luôn mount `RefreshControl` và dùng `enabled` thay vì gỡ mount khi cuộn — tránh nhảy scroll.
 * iOS: không truyền (gesture kéo chỉ ở đầu nội dung).
 */
export function refreshControlAndroidGateProps(scrollAtTop: boolean, refreshing: boolean) {
  if (Platform.OS !== "android") return {};
  return { enabled: scrollAtTop || refreshing } as const;
}

/**
 * Chỉ cho phép pull-to-refresh khi người dùng đang ở đầu nội dung cuộn.
 * Gắn `onScrollForRefreshGate` + `scrollEventThrottle` vào ScrollView/FlatList,
 * kết hợp `refreshControl` luôn mount + `refreshControlAndroidGateProps` (Android).
 *
 * `onRefresh` thường gọi `refetch()` / API qua axios: **tối đa** chờ `DATA_LOAD_TIMEOUT_MS` (trần, không ép chờ đủ hết số ms).
 */
export function useRefreshControlGate() {
  const [scrollAtTop, setScrollAtTop] = useState(true);

  const onScrollForRefreshGate = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrollAtTop((prev) => {
      const next = y <= AT_TOP_EPSILON;
      return prev === next ? prev : next;
    });
  }, []);

  return { scrollAtTop, onScrollForRefreshGate };
}
