/**
 * Thông báo Staff: REST `/api/notifications` (defensive) + poll foreground; mock đã thay bằng API.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import { PullToRefreshControl, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import Header from "../../../../shared/components/header";
import Icons from "../../../../shared/theme/icon";
import { staffNotificationStyles } from "./staffNotificationStyles";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import {
  CLIENT_LIST_PAGE_SIZE,
  formatTimeAgoI18n,
  getTotalPages,
  slicePage,
} from "../../../../shared/utils";
import { useRefreshControlGate, useStaffBusinessNotifications } from "../../../../shared/hooks";
import type { AppNotificationFromApi } from "../../../../shared/types/api";
import {
  NOTIFICATION_READ_ALL_AVAILABLE,
  NOTIFICATION_REALTIME_ENABLED,
} from "../../../../shared/api/config";
import { formatAppNotificationTitle } from "../../../../shared/utils/notificationDisplay";
import { useNotificationTransportStore } from "../../../../store/useNotificationTransportStore";
import { useAlertStore } from "../../../../store/useAlertStore";
import { resolveStaffNotificationNavigation } from "../../../../shared/utils/resolveStaffNotificationNavigation";

export default function StaffNotificationScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const biz = useStaffBusinessNotifications(true);
  const realtimeUnavailable = useNotificationTransportStore((s) => s.realtimeUnavailable);

  const [listPage, setListPage] = useState(1);

  const notifications = biz.items;
  const notifTotalPages = getTotalPages(notifications.length, CLIENT_LIST_PAGE_SIZE);
  const pagedNotifications = useMemo(
    () => slicePage(notifications, listPage, CLIENT_LIST_PAGE_SIZE),
    [notifications, listPage]
  );

  useEffect(() => {
    setListPage(1);
  }, [notifications.length]);

  const listLoading = biz.listQuery.isPending && notifications.length === 0;
  const refreshing = biz.listQuery.isRefetching || biz.unreadQuery.isRefetching;

  const onRefresh = useCallback(() => {
    void biz.refetchAll();
  }, [biz]);

  const onPressMarkAllRead = useCallback(async () => {
    const ok = await biz.markAllRead();
    if (!ok) {
      useAlertStore.getState().show(t("common.error"), t("notification.mark_read_failed"), [{ text: "OK" }], "error");
    }
  }, [biz, t]);

  const onPressItem = useCallback(
    async (item: AppNotificationFromApi) => {
      const ok = await biz.markRead(item.id);
      if (!ok) {
        useAlertStore.getState().show(t("common.error"), t("notification.mark_read_failed"), [{ text: "OK" }], "error");
        return;
      }
      const nav = resolveStaffNotificationNavigation(item);
      if (nav.kind === "fallbackMain") {
        navigation.navigate("Main" as never);
        return;
      }
      if (nav.kind === "stack") {
        navigation.navigate(nav.screen, nav.params);
        return;
      }
      if (nav.kind === "mainTab") {
        navigation.navigate("Main", { screen: nav.tab, params: nav.params });
      }
    },
    [biz, navigation, t]
  );

  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();

  const renderItem: ListRenderItem<AppNotificationFromApi> = ({ item }) => {
    const title = formatAppNotificationTitle(item, i18n.language);
    const ts = Date.parse(String(item.createdAt ?? item.timestamp ?? ""));
    const timeStr = Number.isFinite(ts)
      ? formatTimeAgoI18n(new Date(ts), t)
      : "—";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => void onPressItem(item)}
        style={[
          staffNotificationStyles.itemCard,
          !item.read && staffNotificationStyles.itemCardUnread,
        ]}
      >
        <View style={[staffNotificationStyles.iconWrapper, staffNotificationStyles.iconWrapperTicket]}>
          <Icons.notification size={22} color={brandPrimary} />
        </View>
        <View style={staffNotificationStyles.itemBody}>
          <Text style={staffNotificationStyles.itemTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={staffNotificationStyles.itemMessage} numberOfLines={2}>
            {item.category} · {item.type}
          </Text>
          <Text style={staffNotificationStyles.itemTime}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      <Text style={staffNotificationStyles.title}>{t("screens.notification")}</Text>
      {NOTIFICATION_REALTIME_ENABLED && realtimeUnavailable ? (
        <View style={bannerStyles.hint}>
          <Text style={bannerStyles.hintText}>{t("notification.realtime_unavailable_hint")}</Text>
        </View>
      ) : null}
      {NOTIFICATION_READ_ALL_AVAILABLE && biz.resolvedUnreadCount > 0 ? (
        <Pressable
          onPress={() => void onPressMarkAllRead()}
          style={({ pressed }) => [bannerStyles.readAll, pressed && { opacity: 0.88 }]}
        >
          <Text style={bannerStyles.readAllText}>{t("notification.read_all")}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const listEmpty = !listLoading ? (
    <View style={staffNotificationStyles.emptyWrapper}>
      <Text style={staffNotificationStyles.emptyText}>{t("notification.empty")}</Text>
    </View>
  ) : null;

  return (
    <View style={staffNotificationStyles.container}>
      <Header
        variant="default"
        staffTabWelcome
        staffTabBackButton={navigation.canGoBack()}
        onStaffTabBackPress={() => navigation.goBack()}
        staffTabBackAccessibilityLabel={t("common.back")}
      />
      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={refreshing} />
        {listLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 160 }}>
            <Text style={{ color: neutral.textSecondary }}>{t("common.loading")}</Text>
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={pagedNotifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={() => (
              <PaginationBar
                currentPage={listPage}
                totalPages={notifTotalPages}
                onPageChange={setListPage}
                style={{ paddingBottom: Math.max(8, insets.bottom) }}
              />
            )}
            contentContainerStyle={
              notifications.length === 0
                ? [staffNotificationStyles.listContent, { flex: 1 }]
                : staffNotificationStyles.listContent
            }
            showsVerticalScrollIndicator={false}
            onScroll={onScrollForRefreshGate}
            scrollEventThrottle={16}
            refreshControl={
              <PullToRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                scrollAtTop={scrollAtTop}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  hint: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    backgroundColor: neutral.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: neutral.border,
  },
  hintText: {
    fontSize: 13,
    color: neutral.textSecondary,
    textAlign: "center",
  },
  readAll: {
    alignSelf: "flex-end",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  readAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: brandPrimary,
  },
});
