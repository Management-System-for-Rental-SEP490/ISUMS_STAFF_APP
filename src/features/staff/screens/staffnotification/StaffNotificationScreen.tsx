/**
 * Màn hình Thông báo dành cho Staff.
 * Mock: thông báo kiểu "người thuê căn X đã gửi ticket", "lịch làm việc đã cập nhật", ...
 * Khi có API sẽ thay bằng dữ liệu thật.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import Header from "../../../../shared/components/header";
import Icons from "../../../../shared/theme/icon";
import { staffNotificationStyles } from "./staffNotificationStyles";
import { brandPrimary } from "../../../../shared/theme/color";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import { formatTimeAgoI18n, getTotalPages, slicePage } from "../../../../shared/utils";
import { useRefreshControlGate, refreshControlAndroidGateProps } from "../../../../shared/hooks";
import type { StaffNotificationItem } from "../../../../shared/types/api";

export default function StaffNotificationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const notifications = useMemo((): StaffNotificationItem[] => {
    const base: StaffNotificationItem[] = [
      {
        id: "sn1",
        type: "ticket_from_tenant",
        titleKey: "staff_notification.tenant_sent_ticket_title",
        bodyKey: "staff_notification.tenant_sent_ticket_body",
        params: { house: t("staff_notification.demo_house_a"), id: "T002" },
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
      },
      {
        id: "sn2",
        type: "schedule_updated",
        titleKey: "staff_notification.schedule_updated_title",
        bodyKey: "staff_notification.schedule_updated_body",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
      },
      {
        id: "sn3",
        type: "ticket_assigned",
        titleKey: "staff_notification.ticket_assigned_title",
        bodyKey: "staff_notification.ticket_assigned_body",
        params: { id: "T001" },
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: "sn4",
        type: "inspection_reminder",
        titleKey: "staff_notification.inspection_reminder_title",
        bodyKey: "staff_notification.inspection_reminder_body",
        params: { building: t("staff_notification.demo_building_c") },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: "sn5",
        type: "ticket_from_tenant",
        titleKey: "staff_notification.tenant_sent_ticket_title",
        bodyKey: "staff_notification.tenant_sent_ticket_body",
        params: { house: t("staff_notification.demo_house_b"), id: "T003" },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: "sn6",
        type: "system",
        titleKey: "staff_notification.system_maintenance_title",
        bodyKey: "staff_notification.system_maintenance_body",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        read: true,
      },
    ];
    const extra: StaffNotificationItem[] = Array.from({ length: 14 }, (_, i) => ({
      id: `sn-demo-${i}`,
      type: "system",
      titleKey: "staff_notification.system_maintenance_title",
      bodyKey: "staff_notification.system_maintenance_body",
      createdAt: new Date(Date.now() - (i + 8) * 3600 * 1000),
      read: i % 3 !== 0,
    }));
    return [...base, ...extra];
  }, [t]);
  const [listPage, setListPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const notifTotalPages = getTotalPages(notifications.length);
  const pagedNotifications = useMemo(
    () => slicePage(notifications, listPage),
    [notifications, listPage]
  );

  useEffect(() => {
    setListPage(1);
  }, [notifications.length]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 450);
  }, []);

  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();

  const renderItem: ListRenderItem<StaffNotificationItem> = ({ item }) => {
    const title = t(item.titleKey, item.params as Record<string, string>);
    const body = t(item.bodyKey, item.params as Record<string, string>);
    const timeStr = formatTimeAgoI18n(item.createdAt, t);

    let iconWrapperStyle = staffNotificationStyles.iconWrapperTicket;
    let IconComponent = Icons.ticket;
    let iconColor = brandPrimary;
    if (item.type === "schedule_updated" || item.type === "inspection_reminder") {
      iconWrapperStyle = staffNotificationStyles.iconWrapperSchedule;
      IconComponent = Icons.calendar;
      iconColor = brandPrimary;
    } else if (item.type === "ticket_assigned") {
      iconWrapperStyle = staffNotificationStyles.iconWrapperTicket;
      IconComponent = Icons.contract;
      iconColor = brandPrimary;
    } else if (item.type === "system") {
      iconWrapperStyle = staffNotificationStyles.iconWrapperSystem;
      IconComponent = Icons.shield;
      iconColor = brandPrimary;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          staffNotificationStyles.itemCard,
          !item.read && staffNotificationStyles.itemCardUnread,
        ]}
      >
        <View style={[staffNotificationStyles.iconWrapper, iconWrapperStyle]}>
          <IconComponent size={22} color={iconColor} />
        </View>
        <View style={staffNotificationStyles.itemBody}>
          <Text style={staffNotificationStyles.itemTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={staffNotificationStyles.itemMessage} numberOfLines={3}>
            {body}
          </Text>
          <Text style={staffNotificationStyles.itemTime}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <Text style={staffNotificationStyles.title}>
      {t("screens.notification")}
    </Text>
  );

  const listEmpty = (
    <View style={staffNotificationStyles.emptyWrapper}>
      <Text style={staffNotificationStyles.emptyText}>
        {t("notification.empty")}
      </Text>
    </View>
  );

  return (
    <View style={staffNotificationStyles.container}>
      <Header
        variant="default"
        staffTabWelcome
        staffTabBackButton={navigation.canGoBack()}
        onStaffTabBackPress={() => navigation.goBack()}
        staffTabBackAccessibilityLabel={t("common.back")}
      />
      <FlatList
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
            {...refreshControlAndroidGateProps(scrollAtTop, refreshing)}
          />
        }
      />
    </View>
  );
}
