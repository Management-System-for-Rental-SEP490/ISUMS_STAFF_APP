import { useCallback, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Dung sai pixel: coi là đầu danh sách khi offsetY <= giá trị này (subpixel / safe area). */
const AT_TOP_EPSILON = 5;

/**
 * Chỉ cho phép pull-to-refresh khi người dùng đang ở đầu nội dung cuộn.
 * Gắn `onScrollForRefreshGate` + `scrollEventThrottle` vào ScrollView/FlatList,
 * rồi chỉ render `refreshControl` khi `scrollAtTop || đangRefreshing`.
 *
 * `onRefresh` thường gọi `refetch()` / API qua axios: **tối đa** chờ `DATA_LOAD_TIMEOUT_MS` (trần, không ép chờ đủ 8s).
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
