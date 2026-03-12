/**
 * Màn hình Chi tiết Ticket của Staff.
 * Hiển thị thông tin ticket (tiêu đề, mô tả, thiết bị, người thuê, trạng thái, ưu tiên...).
 * Nếu ticket chưa được nhận (status = pending): hiển thị nút "Nhận ticket" → mở modal chọn khung giờ từ lịch tuần này → xác nhận.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import {
  getTicketById,
  getFreeScheduleSlots,
  WorkSlot,
} from "../../data/mockStaffData";
import { useStaffSchedule } from "../../context/StaffScheduleContext";
import Icons from "../../../../shared/theme/icon";
import { staffTicketDetailStyles } from "./staffTicketDetailStyles";
import ChooseScheduleSlotModal from "../staffCalendar/modals/ChooseScheduleSlotModal";

type TicketDetailRouteProp = RouteProp<RootStackParamList, "TicketDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "TicketDetail">;

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

function getStatusLabel(status: string, t: (k: string) => string) {
  const key: Record<string, string> = {
    pending: "staff_ticket_list.status_pending",
    assigned: "staff_ticket_list.status_assigned",
    scheduled: "staff_ticket_list.status_scheduled",
    in_progress: "staff_ticket_list.status_in_progress",
    completed: "staff_ticket_list.status_completed",
    cancelled: "staff_ticket_list.status_cancelled",
  };
  return t(key[status] || key.pending);
}

function getPriorityLabel(priority: string, t: (k: string) => string) {
  const key: Record<string, string> = {
    high: "staff_ticket_list.priority_high",
    medium: "staff_ticket_list.priority_medium",
    low: "staff_ticket_list.priority_low",
  };
  return t(key[priority] || key.low);
}

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<TicketDetailRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { dayOffList } = useStaffSchedule();
  const { ticketId } = route.params;

  const ticket = getTicketById(ticketId);
  const [slotModalVisible, setSlotModalVisible] = useState(false);

  if (!ticket) { // nếu ticket không tồn tại thì hiển thị thông báo
    return (
      <View style={[staffTicketDetailStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#6B7280" }}>{t("common.no_data")}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#2563EB", fontWeight: "600" }}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = getStatusStyle(ticket.status);
  const priorityStyle = getPriorityStyle(ticket.priority);
  const isPending = ticket.status === "pending";
  const createdAtStr = ticket.createdAt.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleAcceptTicket = () => {
    setSlotModalVisible(true);
  };

  const handleConfirmSlot = (slot: WorkSlot) => {
    setSlotModalVisible(false);
    // TODO: Gọi API gán ticket vào slot. Hiện mock chỉ đóng modal và có thể thông báo thành công.
    navigation.goBack();
  };

  return (
    <View style={staffTicketDetailStyles.container}>
      <View style={[staffTicketDetailStyles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={staffTicketDetailStyles.backBtn} onPress={() => navigation.goBack()}>
          <Icons.chevronBack size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={staffTicketDetailStyles.topBarTitle} numberOfLines={1}>
          #{ticket.id} {ticket.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={staffTicketDetailStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={staffTicketDetailStyles.card}>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.status")}</Text>
            <View style={[staffTicketDetailStyles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[staffTicketDetailStyles.statusText, { color: statusStyle.color }]}>
                {getStatusLabel(ticket.status, t)}
              </Text>
            </View>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.priority")}</Text>
            <View style={[staffTicketDetailStyles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[staffTicketDetailStyles.statusText, { color: priorityStyle.color }]}>
                {getPriorityLabel(ticket.priority, t)}
              </Text>
            </View>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.title_label")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{ticket.title}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.description")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{ticket.description}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.device")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>
              {ticket.deviceName} • {ticket.deviceLocation}
            </Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.building")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{ticket.buildingName}</Text>
          </View>
          <View style={[staffTicketDetailStyles.row, staffTicketDetailStyles.rowLast]}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.tenant")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{ticket.tenantName}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.created_at")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{createdAtStr}</Text>
          </View>
        </View>

        {isPending && (
          <TouchableOpacity
            style={staffTicketDetailStyles.acceptBtn}
            onPress={handleAcceptTicket}
            activeOpacity={0.8}
          >
            <Text style={staffTicketDetailStyles.acceptBtnText}>
              {t("staff_ticket_detail.accept_ticket")}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ChooseScheduleSlotModal
        visible={slotModalVisible}
        onClose={() => setSlotModalVisible(false)}
        slots={getFreeScheduleSlots(dayOffList)}
        onConfirm={handleConfirmSlot}
      />
    </View>
  );
}
