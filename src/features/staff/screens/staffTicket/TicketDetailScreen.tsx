/**
 * Màn hình Chi tiết Ticket của Staff.
 * Hiển thị thông tin ticket (tiêu đề, mô tả, thiết bị, người thuê, trạng thái, ưu tiên...).
 * Nếu ticket chưa được nhận (status = pending): hiển thị nút "Nhận ticket" → mở modal chọn khung giờ từ lịch tuần này → xác nhận.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import { CustomAlert } from "../../../../shared/components/alert";
import { staffTicketDetailStyles } from "./staffTicketDetailStyles";
import {
  brandPrimary,
  brandSecondary,
  brandTintBg,
  neutral,
} from "../../../../shared/theme/color";
import {
  appTypography,
  formatDdMmYyyy,
  getThisAndNextWorkWeekMonToSatYmd,
} from "../../../../shared/utils";
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
import { ISSUE_TICKET_KEYS, useIssueTicketById } from "../../../../shared/hooks/useUserProfile";
import { useHouses } from "../../../../shared/hooks/useHouses";
import { useAssetItems } from "../../../../shared/hooks/useAssetItems";
import { SCHEDULE_DATA_KEYS } from "../../hooks/useStaffScheduleData";
import {
  confirmStaffWorkSlotForJob,
  getStaffIdForSchedule,
} from "../../../../shared/services/scheduleApi";
import { getIssueTicketImages } from "../../../../shared/services/issuesApi";
import ChooseScheduleSlotModal from "../staffCalendar/modals/ChooseScheduleSlotModal";

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
    case "WAITING_MANAGER_CONFIRM":
    case "WAITING_MANAGER_APPROVAL":
    case "WAITING_TENANT_APPROVAL":
    case "WAITING_MANAGER_APPROVAL_QUOTE":
    case "WAITING_TENANT_APPROVAL_QUOTE":
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

function getStatusLabel(status: string, t: (k: string) => string) {
  const i18nKey = `staff_ticket_list.status_${String(status || "").toUpperCase()}`;
  const translated = t(i18nKey);
  if (translated !== i18nKey) return translated;
  return status;
}

function getTypeLabel(type: string, t: (k: string) => string) {
  const key = `staff_ticket_list.type_${String(type || "").toUpperCase()}`;
  const translated = t(key);
  return translated !== key ? translated : t("staff_ticket_list.type_other");
}

function DetailSection({
  title,
  headerIcon,
  children,
}: {
  title: string;
  headerIcon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={staffTicketDetailStyles.detailCard}>
      <View style={staffTicketDetailStyles.detailCardHeaderRow}>
        {headerIcon}
        <Text style={staffTicketDetailStyles.detailCardHeaderLabel}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/**
 * Hiển thị nút đăng ký khung giờ làm việc (POST confirm work slot).
 * BE mới: tenant gửi ticket kèm slot (ưu tiên / template), `slotId` không đồng nghĩa staff đã chốt ca;
 * trạng thái có thể là CREATED hoặc WAITING_MANAGER_CONFIRM trước khi quản lý xác nhận lịch staff.
 */
function shouldShowIssueRegisterTimeButton(status: string, sessionSubmitted: boolean): boolean {
  if (sessionSubmitted) return false;
  const st = String(status || "").toUpperCase();
  if (st === "NEED_RESCHEDULE") return true;
  if (st === "CREATED") return true;
  if (st === "WAITING_MANAGER_CONFIRM") return true;
  return false;
}

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<TicketDetailRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { ticketId } = route.params;
  const { data: ticket, isLoading, isError, refetch } = useIssueTicketById(ticketId);
  const {
    data: ticketImages = [],
    isLoading: ticketImagesLoading,
    refetch: refetchTicketImages,
  } = useQuery({
    queryKey: [...ISSUE_TICKET_KEYS.byId(ticketId), "images"] as const,
    queryFn: () => getIssueTicketImages(ticketId),
    enabled: Boolean(ticketId?.trim()),
  });
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const { data: housesRes } = useHouses();
  const { data: assetsRes } = useAssetItems();
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  /** Sau khi gọi API confirm slot thành công (phiên hiện tại); reset khi đổi ticket. */
  const [slotRegistrationSubmitted, setSlotRegistrationSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSlotRegistrationSubmitted(false);
  }, [ticketId]);

  // Đồng bộ trạng thái khi user quay lại từ màn list.
  useFocusEffect(
    useCallback(() => {
      void refetch();
      return undefined;
    }, [refetch])
  );

  /** Tuần này + tuần sau (T2 tuần này → T7 tuần sau), khớp GET .../slots/me. */
  const generatedRange = useMemo(() => getThisAndNextWorkWeekMonToSatYmd(new Date()), []);

  /** Tải slot trước khi mở modal (prefetch trong ChooseScheduleSlotModal). */
  const prefetchRegisterSlots =
    ticket != null &&
    shouldShowIssueRegisterTimeButton(ticket.status, slotRegistrationSubmitted);

  const handleCloseModal = useCallback(() => {
    setSlotModalVisible(false);
  }, []);

  const queryClient = useQueryClient();

  const confirmSlotMutation = useMutation({
    mutationFn: confirmStaffWorkSlotForJob,
    onSuccess: async (res) => {
      if (!res.success) {
        CustomAlert.alert(
          t("common.error"),
          t("staff_ticket_detail.confirm_slot_error"),
          [{ text: t("common.close") }],
          { type: "error" }
        );
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ISSUE_TICKET_KEYS.byId(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ISSUE_TICKET_KEYS.byStaff() }),
        queryClient.invalidateQueries({
          queryKey: SCHEDULE_DATA_KEYS.generatedSlots(
            generatedRange.startYmd,
            generatedRange.endYmd
          ),
        }),
      ]);
      const staffId = getStaffIdForSchedule();
      if (staffId) {
        await queryClient.invalidateQueries({
          queryKey: SCHEDULE_DATA_KEYS.workSlots(staffId),
        });
      }
      setSlotRegistrationSubmitted(true);
      handleCloseModal();
      CustomAlert.alert(
        t("staff_ticket_detail.confirm_slot_success_title"),
        t("staff_ticket_detail.confirm_slot_success"),
        [
          {
            text: t("common.close"),
            onPress: () => {
              // Điều hướng về tab danh sách ticket của staff.
              navigation.navigate("Main" as any, { screen: "Ticket" } as any);
            },
          },
        ],
        { type: "success" }
      );
    },
    onError: () => {
      CustomAlert.alert(
        t("common.error"),
        t("staff_ticket_detail.confirm_slot_error"),
        [{ text: t("common.close") }],
        { type: "error" }
      );
    },
  });

  const houseNameById = new Map((housesRes?.data ?? []).map((house) => [house.id, house.name]));
  const assetNameById = new Map((assetsRes?.data ?? []).map((asset) => [asset.id, asset.displayName]));

  if (isLoading) {
    return (
      <View
        style={[
          staffTicketDetailStyles.container,
          { justifyContent: "center", alignItems: "center", paddingTop: insets.top },
        ]}
      >
        <Text style={{ color: neutral.textSecondary }}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (isError || !ticket) {
    return (
      <View
        style={[
          staffTicketDetailStyles.container,
          { justifyContent: "center", alignItems: "center", paddingTop: insets.top },
        ]}
      >
        <Text style={{ color: neutral.textSecondary }}>{t("staff_ticket_list.load_error")}</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={[appTypography.chip, { color: brandPrimary }]}>{t("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  const statusStyle = getStatusStyle(ticket.status);
  const showRegisterTimeButton = shouldShowIssueRegisterTimeButton(
    ticket.status,
    slotRegistrationSubmitted
  );
  const createdAt = new Date(ticket.createdAt);
  const createdAtStr = Number.isNaN(createdAt.getTime())
    ? ticket.createdAt
    : formatDdMmYyyy(createdAt);
  const houseName = houseNameById.get(ticket.houseId) ?? ticket.houseId;
  const assetName = assetNameById.get(ticket.assetId) ?? ticket.assetId;
  const tenantPhone = ticket.tenantPhone ? ticket.tenantPhone : t("staff_ticket_list.phone_unavailable");

  const handleRegisterTime = () => {
    setSlotModalVisible(true);
  };

  // Không dùng `useCallback` ở đây để tránh thay đổi số lượng hook khi render theo nhánh `isLoading`.
  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchTicketImages()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={staffTicketDetailStyles.container}>
      <StackScreenTitleHeaderStrip>
        <View style={stackScreenTitleRowStyle}>
          <View style={stackScreenTitleSideSlotStyle}>
            <Pressable
              style={stackScreenTitleBackBtnOnBrand}
              onPress={() => navigation.goBack()}
            >
              <Icons.chevronBack size={28} color={stackScreenTitleOnBrandIconColor} />
            </Pressable>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={brandPrimary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={staffTicketDetailStyles.heroCard}>
          <Text style={staffTicketDetailStyles.heroTitle}>{ticket.title}</Text>
          <View style={staffTicketDetailStyles.badgeRow}>
            <View style={staffTicketDetailStyles.typePill}>
              <Text style={staffTicketDetailStyles.typePillText}>{getTypeLabel(ticket.type, t)}</Text>
            </View>
            <View style={[staffTicketDetailStyles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[staffTicketDetailStyles.statusText, { color: statusStyle.color }]}>
                {getStatusLabel(ticket.status, t)}
              </Text>
            </View>
          </View>
          <View style={staffTicketDetailStyles.heroDateRow}>
            <Icons.accessTime size={15} color={neutral.textMuted} />
            <Text style={staffTicketDetailStyles.heroDateText}>
              {t("staff_ticket_detail.sent_at")}: {createdAtStr}
            </Text>
          </View>
        </View>

        <DetailSection
          title={t("staff_ticket_detail.section_info")}
          headerIcon={<Icons.infoOutline size={22} color={brandPrimary} />}
        >
          <View style={staffTicketDetailStyles.detailFieldRow}>
            <Text style={staffTicketDetailStyles.fieldLabel}>{t("staff_ticket_detail.device")}</Text>
            <Text style={staffTicketDetailStyles.fieldValue} selectable>
              {assetName}
            </Text>
          </View>
          <View style={staffTicketDetailStyles.detailFieldRow}>
            <Text style={staffTicketDetailStyles.fieldLabel}>{t("staff_ticket_detail.building")}</Text>
            <Text style={staffTicketDetailStyles.fieldValue} selectable>
              {houseName}
            </Text>
          </View>
          <View style={staffTicketDetailStyles.detailFieldRow}>
            <Text style={staffTicketDetailStyles.fieldLabel}>{t("staff_ticket_detail.tenant_phone")}</Text>
            <Text style={staffTicketDetailStyles.fieldValue} selectable>
              {tenantPhone}
            </Text>
          </View>
          <View style={[staffTicketDetailStyles.detailFieldRow, staffTicketDetailStyles.detailFieldRowLast]}>
            <Text style={staffTicketDetailStyles.fieldLabel}>{t("staff_ticket_detail.created_at")}</Text>
            <Text style={staffTicketDetailStyles.fieldValue} selectable>
              {createdAtStr}
            </Text>
          </View>
        </DetailSection>

        <DetailSection
          title={t("staff_ticket_detail.section_description")}
          headerIcon={<Icons.subject size={22} color={brandPrimary} />}
        >
          <Text style={staffTicketDetailStyles.descriptionBody} selectable>
            {ticket.description?.trim() ? ticket.description : "—"}
          </Text>
        </DetailSection>

        <DetailSection
          title={t("staff_ticket_detail.images_label")}
          headerIcon={<Icons.photoLibrary size={22} color={brandPrimary} />}
        >
          {ticketImagesLoading ? (
            <View style={staffTicketDetailStyles.assetLoadingRow}>
              <ActivityIndicator size="small" color={brandSecondary} />
              <Text style={staffTicketDetailStyles.fieldValueMuted}>{t("common.loading")}</Text>
            </View>
          ) : ticketImages.length > 0 ? (
            <View style={staffTicketDetailStyles.ticketImagesWrap}>
              {ticketImages.map((img) => (
                <Pressable
                  key={img.id}
                  style={staffTicketDetailStyles.ticketImageThumb}
                  onPress={() => setActiveImageUrl(img.url)}
                >
                  <Image
                    source={{ uri: img.url }}
                    style={staffTicketDetailStyles.ticketImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={staffTicketDetailStyles.fieldValueMuted}>{t("staff_ticket_detail.images_empty")}</Text>
          )}
        </DetailSection>

        {showRegisterTimeButton ? (
          <Pressable style={staffTicketDetailStyles.acceptBtn} onPress={handleRegisterTime}>
            <Text style={staffTicketDetailStyles.acceptBtnText}>
              {t("staff_ticket_detail.register_time")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={activeImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageUrl(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={staffTicketDetailStyles.imageModalBackdrop}
          onPress={() => setActiveImageUrl(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => {
              e.stopPropagation();
            }}
            style={staffTicketDetailStyles.imageModalContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={staffTicketDetailStyles.imageModalClose}
              onPress={() => setActiveImageUrl(null)}
            >
              <Text style={staffTicketDetailStyles.imageModalCloseText}>×</Text>
            </TouchableOpacity>
            {activeImageUrl ? (
              <Image
                source={{ uri: activeImageUrl }}
                style={staffTicketDetailStyles.imageModalImage}
                resizeMode="contain"
              />
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ChooseScheduleSlotModal
        visible={slotModalVisible}
        onClose={() => {
          if (!confirmSlotMutation.isPending) handleCloseModal();
        }}
        startYmd={generatedRange.startYmd}
        endYmd={generatedRange.endYmd}
        prefetchSlots={prefetchRegisterSlots}
        onConfirm={(slot) => {
          if (confirmSlotMutation.isPending) return;
          confirmSlotMutation.mutate({
            jobId: ticketId,
            startTime: slot.startTimeLocalIso,
          });
        }}
        isSubmitting={confirmSlotMutation.isPending}
        closeOnConfirm={false}
      />
    </View>
  );
}
