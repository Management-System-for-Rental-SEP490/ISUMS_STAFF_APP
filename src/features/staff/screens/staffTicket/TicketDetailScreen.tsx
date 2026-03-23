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
import {
  brandPrimary,
  brandSecondary,
  brandTintBg,
  neutral,
} from "../../../../shared/theme/color";
import { appTypography, formatViTicketCreatedAt } from "../../../../shared/utils";
import {
  StackScreenTitleBadge,
  StackScreenTitleBarBalance,
  StackScreenTitleHeaderStrip,
  stackScreenTitleBackBtnOnBrand,
  stackScreenTitleCenterSlotStyle,
  stackScreenTitleOnBrandIconColor,
  stackScreenTitleRowStyle,
  stackScreenTitleSideSlotStyle,
} from "../../../../shared/components/StackScreenTitleBadge";

type TicketDetailRouteProp = RouteProp<RootStackParamList, "TicketDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "TicketDetail">;

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

function getStatusLabel(status: string, t: (k: string) => string) {
  const i18nKey = `staff_ticket_list.status_${String(status || "").toUpperCase()}`;
  const translated = t(i18nKey);
  if (translated !== i18nKey) return translated;
  return status;
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
  const { dayOffList, scheduleTemplate } = useStaffSchedule();
  const { ticketId } = route.params;

  const ticket = getTicketById(ticketId);
  const [slotModalVisible, setSlotModalVisible] = useState(false);

  if (!ticket) { // nếu ticket không tồn tại thì hiển thị thông báo
    return (
      <View
        style={[
          staffTicketDetailStyles.container,
          { justifyContent: "center", alignItems: "center", paddingTop: insets.top },
        ]}
      >
        <Text style={{ color: neutral.textSecondary }}>{t("common.no_data")}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={[appTypography.chip, { color: brandPrimary }]}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = getStatusStyle(ticket.status);
  const priorityStyle = getPriorityStyle(ticket.priority);
  const isPending = String(ticket.status || "").toUpperCase() === "CREATED";
  const createdAtStr = formatViTicketCreatedAt(ticket.createdAt);

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
      <StackScreenTitleHeaderStrip>
        <View style={stackScreenTitleRowStyle}>
          <View style={stackScreenTitleSideSlotStyle}>
            <TouchableOpacity
              style={stackScreenTitleBackBtnOnBrand}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icons.chevronBack size={28} color={stackScreenTitleOnBrandIconColor} />
            </TouchableOpacity>
          </View>
          <View style={stackScreenTitleCenterSlotStyle}>
            <StackScreenTitleBadge numberOfLines={1}>
              {t("staff_ticket_detail.screen_title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <ScrollView
        contentContainerStyle={[
          staffTicketDetailStyles.scrollContent,
          { paddingBottom: 24 + insets.bottom },
        ]}
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
        slots={getFreeScheduleSlots(dayOffList, scheduleTemplate)}
        onConfirm={handleConfirmSlot}
      />
    </View>
  );
}
