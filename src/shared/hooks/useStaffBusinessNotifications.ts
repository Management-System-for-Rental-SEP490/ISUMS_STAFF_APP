/**
 * Danh sách thông báo nghiệp vụ staff (REST) + unread merge + poll foreground.
 * Đồng bộ logic với tenant `useTenantBusinessNotifications` (unread: API trước, fallback đếm read===false sau dedupe).
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  NOTIFICATION_POLL_FALLBACK_ENABLED,
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_REALTIME_ENABLED,
} from "../api/config";
import {
  getNotifications,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationApi";
import {
  resetNotificationRealtimeTransportState,
  startNotificationStream,
  stopNotificationStream,
} from "../services/notificationRealtime";
import { useNotificationTransportStore } from "../../store/useNotificationTransportStore";
import type { AppNotificationFromApi } from "../types/api";
import { canonicalDedupeId } from "../utils/notificationDedupe";

const QK_LIST = ["notifications", "app", "staff", "list"] as const;
const QK_UNREAD = ["notifications", "app", "staff", "unread-count"] as const;

function sortByTimeDesc(a: AppNotificationFromApi, b: AppNotificationFromApi): number {
  const ta = Date.parse(String(a.createdAt ?? a.timestamp ?? "")) || 0;
  const tb = Date.parse(String(b.createdAt ?? b.timestamp ?? "")) || 0;
  return tb - ta;
}

/**
 * Hook staff: business notifications.
 * @param enabled — thường true khi đã đăng nhập.
 */
export function useStaffBusinessNotifications(enabled: boolean) {
  const queryClient = useQueryClient();
  const setRealtimeUn = useNotificationTransportStore((s) => s.setRealtimeUnavailable);
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      resetNotificationRealtimeTransportState();
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  const listQuery = useInfiniteQuery({
    queryKey: [...QK_LIST],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      getNotifications({
        cursor: pageParam ?? null,
        limit: 20,
        unreadOnly: false,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled,
  });

  const unreadQuery = useQuery({
    queryKey: [...QK_UNREAD],
    queryFn: () => getNotificationsUnreadCount(),
    enabled,
  });

  const items = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    const map = new Map<string, AppNotificationFromApi>();
    for (const p of pages) {
      for (const it of p.items) {
        const k = canonicalDedupeId(it.dedupeKey, it.eventId) || it.id;
        if (!map.has(k)) map.set(k, it);
      }
    }
    return Array.from(map.values()).sort(sortByTimeDesc);
  }, [listQuery.data?.pages]);

  const fallbackUnreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items]
  );

  const hasNumericUnreadFromApi =
    typeof unreadQuery.data === "number" && Number.isFinite(unreadQuery.data);

  const resolvedUnreadCount = useMemo(() => {
    if (hasNumericUnreadFromApi) return Math.max(0, unreadQuery.data as number);
    return fallbackUnreadCount;
  }, [hasNumericUnreadFromApi, unreadQuery.data, fallbackUnreadCount]);

  const unreadCountIsFallback = !hasNumericUnreadFromApi;

  const refetchAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...QK_LIST] });
    void queryClient.invalidateQueries({ queryKey: [...QK_UNREAD] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !NOTIFICATION_REALTIME_ENABLED) return;

    const onRefresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", "app", "staff"] });
    };

    const connect = () => {
      startNotificationStream({
        onQueryRefresh: onRefresh,
        onSessionDisabled: (reason) => {
          setRealtimeUn(true, reason);
        },
      });
    };

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") connect();
      else stopNotificationStream();
    });

    if (AppState.currentState === "active") connect();

    return () => {
      sub.remove();
      stopNotificationStream();
    };
  }, [enabled, queryClient, setRealtimeUn]);

  useEffect(() => {
    if (!enabled || !NOTIFICATION_POLL_FALLBACK_ENABLED) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const tick = () => {
      if (AppState.currentState !== "active") return;
      void queryClient.invalidateQueries({ queryKey: ["notifications", "app", "staff"] });
    };

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") {
        clearPoll();
        tick();
        interval = setInterval(tick, NOTIFICATION_POLL_INTERVAL_MS);
      } else {
        clearPoll();
      }
    };

    const sub = AppState.addEventListener("change", onAppState);
    if (AppState.currentState === "active") {
      interval = setInterval(tick, NOTIFICATION_POLL_INTERVAL_MS);
    }

    return () => {
      sub.remove();
      clearPoll();
    };
  }, [enabled, queryClient]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const ok = await markNotificationRead(notificationId);
      if (ok) await refetchAll();
      return ok;
    },
    [refetchAll]
  );

  const markAllRead = useCallback(async () => {
    const ok = await markAllNotificationsRead();
    if (ok) await refetchAll();
    return ok;
  }, [refetchAll]);

  return {
    items,
    listQuery,
    unreadQuery,
    resolvedUnreadCount,
    unreadCountIsFallback,
    refetchAll,
    markRead,
    markAllRead,
  };
}
