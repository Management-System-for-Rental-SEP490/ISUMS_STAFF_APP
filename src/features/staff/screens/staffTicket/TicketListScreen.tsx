/**
 * Màn hình Danh sách Ticket dành cho Staff.
 * Hiển thị các ticket do người thuê gửi (báo cáo sự cố). Mock data từ mockStaffData.
 * Khi có API sẽ thay bằng dữ liệu thật; có thể navigate sang TicketDetail khi nhấn vào item.
 */
import React, { useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, ListRenderItem } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import Header from "../../../../shared/components/header";
import { MOCK_STAFF_TICKETS, StaffTicketListItem } from "../../data/mockStaffData";
import { ticketListStyles } from "./ticketListStyles";

type TicketListNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Ticket">,
  NativeStackNavigationProp<RootStackParamList>
>;
// String về priority ticket
function getPriorityStyle(priority: string) {
  switch (priority) {
    case "high":
      return { bg: "#FEE2E2", color: "#DC2626" };
    case "medium":
      return { bg: "#FEF3C7", color: "#D97706" };
    default:
      return { bg: "#F3F4F6", color: "#6B7280" };
  }
}
// String về status ticket
function getStatusStyle(status: string) {
  switch (status) {
    case "pending":
      return { bg: "#FEF3C7", color: "#92400E" };
    case "assigned":
      return { bg: "#DBEAFE", color: "#1D4ED8" };
    case "scheduled":
      return { bg: "#E0E7FF", color: "#4338CA" };
    case "in_progress":
      return { bg: "#D1FAE5", color: "#059669" };
    case "completed":
      return { bg: "#D1FAE5", color: "#047857" };
    case "cancelled":
      return { bg: "#F3F4F6", color: "#6B7280" };
    default:
      return { bg: "#F3F4F6", color: "#6B7280" };
  }
}

function formatDate(d: Date, t: (key: string, options?: Record<string, number>) => string): string {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000)); // trả về khoảng thời gian giữa d và bây giờ, bỏ phần lẻ
  if (days === 0) return t("staff_ticket_list.today");
  if (days === 1) return t("staff_ticket_list.yesterday");
  if (days < 7) return t("staff_ticket_list.days_ago", { n: days }); //
  return d.toLocaleDateString(); // chuyển đổi ngày thành chuỗi theo locale
}

export default function TicketListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<TicketListNavProp>();
  const tickets = useMemo(() => MOCK_STAFF_TICKETS, []);

  const openTicketDetail = (ticketId: string) => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) { // nếu root có navigate thì gọi navigate
      (root as { navigate: (name: string, params: { ticketId: string }) => void }).navigate(
        "TicketDetail", // navigate đến màn hình chi tiết ticket
        { ticketId }
      );
    }
  };

  const renderItem: ListRenderItem<StaffTicketListItem> = ({ item }) => {
    const priorityStyle = getPriorityStyle(item.priority);
    const statusStyle = getStatusStyle(item.status);
    const cardBorder =
      item.priority === "high"
        ? ticketListStyles.cardHigh
        : item.priority === "medium"
        ? ticketListStyles.cardMedium
        : ticketListStyles.cardLow;

    const priorityLabel =
      item.priority === "high"
        ? t("staff_ticket_list.priority_high")
        : item.priority === "medium"
        ? t("staff_ticket_list.priority_medium")
        : t("staff_ticket_list.priority_low");

    const statusLabel =
      item.status === "pending"
        ? t("staff_ticket_list.status_pending")
        : item.status === "assigned"
        ? t("staff_ticket_list.status_assigned")
        : item.status === "scheduled"
        ? t("staff_ticket_list.status_scheduled")
        : item.status === "in_progress"
        ? t("staff_ticket_list.status_in_progress")
        : item.status === "completed"
        ? t("staff_ticket_list.status_completed")
        : t("staff_ticket_list.status_cancelled");

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[ticketListStyles.card, cardBorder]}
        onPress={() => openTicketDetail(item.id)}
      >
        <View style={ticketListStyles.cardHeader}>
          <Text style={ticketListStyles.ticketId}>#{item.id}</Text>
          <View style={[ticketListStyles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[ticketListStyles.priorityText, { color: priorityStyle.color }]}>
              {priorityLabel}
            </Text>
          </View>
        </View>
        <Text style={ticketListStyles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={ticketListStyles.cardMeta}>
          {item.buildingName} • {item.deviceName}
        </Text>
        <Text style={ticketListStyles.cardMeta}>
          {t("staff_ticket_list.tenant")}: {item.tenantName} • {formatDate(item.createdAt, t)}
        </Text>
        <Text style={ticketListStyles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={[ticketListStyles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[ticketListStyles.statusText, { color: statusStyle.color }]}>
            {statusLabel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <Text style={ticketListStyles.title}>
      {t("staff_ticket_list.title")}
    </Text>
  );

  const listEmpty = (
    <View style={ticketListStyles.emptyWrapper}>
      <Text style={ticketListStyles.emptyText}>
        {t("staff_ticket_list.empty")}
      </Text>
    </View>
  );

  return (
    <View style={ticketListStyles.container}>
      <Header variant="default" />
      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={
          tickets.length === 0
            ? [ticketListStyles.listContent, { flex: 1 }]
            : ticketListStyles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
