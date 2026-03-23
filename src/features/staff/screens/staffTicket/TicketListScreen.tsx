/**
 * Màn hình Danh sách Ticket dành cho Staff.
 * Hiển thị các ticket do người thuê gửi (báo cáo sự cố). Mock data từ mockStaffData.
 * Khi có API sẽ thay bằng dữ liệu thật; có thể navigate sang TicketDetail khi nhấn vào item.
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
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import Header from "../../../../shared/components/header";
import { MOCK_STAFF_TICKETS, StaffTicketListItem } from "../../data/mockStaffData";
import { ticketListStyles } from "./ticketListStyles";
import {
  brandPrimary,
  brandSecondary,
  brandTintBg,
  neutral,
} from "../../../../shared/theme/color";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import {
  formatStaffTicketListCreatedAt,
  getTotalPages,
  slicePage,
} from "../../../../shared/utils";

type TicketListNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Ticket">,
  NativeStackNavigationProp<RootStackParamList>
>;
// String về priority ticket
function getPriorityStyle(priority: string) {
  switch (priority) {
    case "high":
      return { bg: brandTintBg, color: brandPrimary };
    case "medium":
      return { bg: brandTintBg, color: brandSecondary };
    default:
      return { bg: neutral.background, color: neutral.textSecondary };
  }
}
// String về status ticket
function getStatusStyle(status: string) {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "CREATED":
      return { bg: brandTintBg, color: brandPrimary };
    case "NEED_RESCHEDULE":
    case "SCHEDULED":
      return { bg: brandTintBg, color: brandSecondary };
    case "IN_PROGRESS":
      return { bg: brandTintBg, color: brandPrimary };
    case "WAITING_MANAGER_APPROVAL":
    case "WAITING_TENANT_APPROVAL":
    case "WAITING_PAYMENT":
      return { bg: brandTintBg, color: brandSecondary };
    case "DONE":
    case "CLOSED":
      return { bg: brandTintBg, color: brandPrimary };
    case "CANCELLED":
      return { bg: neutral.background, color: neutral.textSecondary };
    default:
      return { bg: neutral.background, color: neutral.textSecondary };
  }
}

export default function TicketListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TicketListNavProp>();
  const tickets = useMemo(() => MOCK_STAFF_TICKETS, []);
  const [listPage, setListPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const ticketTotalPages = getTotalPages(tickets.length);
  const pagedTickets = useMemo(
    () => slicePage(tickets, listPage),
    [tickets, listPage]
  );

  useEffect(() => {
    setListPage(1);
  }, [tickets.length]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 450);
  }, []);

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

    const statusKey = `staff_ticket_list.status_${String(item.status || "").toUpperCase()}`;
    const translatedStatus = t(statusKey);
    const statusLabel =
      translatedStatus !== statusKey ? translatedStatus : String(item.status || "");

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
          {t("staff_ticket_list.tenant")}: {item.tenantName} • {formatStaffTicketListCreatedAt(item.createdAt, t)}
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
        data={pagedTickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={() => (
          <PaginationBar
            currentPage={listPage}
            totalPages={ticketTotalPages}
            onPageChange={setListPage}
            style={{ paddingBottom: Math.max(8, insets.bottom) }}
          />
        )}
        contentContainerStyle={
          tickets.length === 0
            ? [ticketListStyles.listContent, { flex: 1 }]
            : ticketListStyles.listContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
      />
    </View>
  );
}
