/**
 * Màn hình Thông báo dành cho Staff.
 * Mock: thông báo kiểu "người thuê căn X đã gửi ticket", "lịch làm việc đã cập nhật", ...
 * Khi có API sẽ thay bằng dữ liệu thật.
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from "react-native";
import { useTranslation } from "react-i18next";
import Header from "../../../../shared/components/header";
import Icons from "../../../../shared/theme/icon";
import { staffNotificationStyles } from "./staffNotificationStyles";

/** Loại thông báo dành cho Staff */
export type StaffNotificationType = "ticket_from_tenant" | "schedule_updated" | "ticket_assigned" | "inspection_reminder" | "system";

/** Một thông báo mock cho Staff */
export interface StaffNotificationItem {
  id: string;
  type: StaffNotificationType;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
  createdAt: Date;
  read?: boolean;
}

const MOCK_STAFF_NOTIFICATIONS: StaffNotificationItem[] = [
  {
    id: "sn1",
    type: "ticket_from_tenant",
    titleKey: "staff_notification.tenant_sent_ticket_title",
    bodyKey: "staff_notification.tenant_sent_ticket_body",
    params: { house: "Nhà A - Tòa 1", id: "T002" },
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
    params: { building: "Nhà C - Tòa 3" },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: "sn5",
    type: "ticket_from_tenant",
    titleKey: "staff_notification.tenant_sent_ticket_title",
    bodyKey: "staff_notification.tenant_sent_ticket_body",
    params: { house: "Nhà B - Tòa 2", id: "T003" },
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

function formatTimeAgo(
  date: Date,
  t: (key: string, opts?: { n?: number }) => string
): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffMins < 60) return t("notification.time_minutes", { n: diffMins || 1 });
  if (diffHours < 24) return t("notification.time_hours", { n: diffHours });
  return t("notification.time_days", { n: diffDays });
}

export default function StaffNotificationScreen() {
  const { t } = useTranslation();
  const notifications = useMemo(() => MOCK_STAFF_NOTIFICATIONS, []);

  const renderItem: ListRenderItem<StaffNotificationItem> = ({ item }) => {
    const title = t(item.titleKey, item.params as Record<string, string>);
    const body = t(item.bodyKey, item.params as Record<string, string>);
    const timeStr = formatTimeAgo(item.createdAt, t);

    let iconWrapperStyle = staffNotificationStyles.iconWrapperTicket;
    let IconComponent = Icons.ticket;
    let iconColor = "#2563EB";
    if (item.type === "schedule_updated" || item.type === "inspection_reminder") {
      iconWrapperStyle = staffNotificationStyles.iconWrapperSchedule;
      IconComponent = Icons.calendar;
      iconColor = "#2E7D32";
    } else if (item.type === "ticket_assigned") {
      iconWrapperStyle = staffNotificationStyles.iconWrapperTicket;
      IconComponent = Icons.contract;
      iconColor = "#2563EB";
    } else if (item.type === "system") {
      iconWrapperStyle = staffNotificationStyles.iconWrapperSystem;
      IconComponent = Icons.shield;
      iconColor = "#E65100";
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
      <Header variant="default" />
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={
          notifications.length === 0
            ? [staffNotificationStyles.listContent, { flex: 1 }]
            : staffNotificationStyles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
