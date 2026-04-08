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
import { ISSUE_TICKET_KEYS, useIssueTicketById } from "../../../../shared/hooks/useUserProfile";
import { useHouses } from "../../../../shared/hooks/useHouses";
import { useAssetItems } from "../../../../shared/hooks/useAssetItems";
import {
  SCHEDULE_DATA_KEYS,
  useGeneratedWorkSlotsQuery,
} from "../../hooks/useStaffScheduleData";
import {
  confirmStaffWorkSlotForJob,
  getStaffIdForSchedule,
} from "../../../../shared/services/scheduleApi";
import { getIssueTicketImages } from "../../../../shared/services/issuesApi";
import { listAvailableGeneratedSlotChoices, type AvailableGeneratedSlotChoice } from "../../../../shared/utils";

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

function formatDateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseSlotStartDate(choice: AvailableGeneratedSlotChoice): Date {
  const raw = choice.startTime?.trim();
  const normalized =
    raw.length === 5 ? `${raw}:00` : raw.length >= 8 ? raw.slice(0, 8) : raw;
  return new Date(`${choice.dateYmd}T${normalized}`);
}

function formatDateLabelVi(dateYmd: string): string {
  const d = new Date(`${dateYmd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateYmd;
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  const [selectedSlot, setSelectedSlot] = useState<AvailableGeneratedSlotChoice | null>(null);
  const [selectedDateYmd, setSelectedDateYmd] = useState<string | null>(null);
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

  const generatedRange = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 13);
    return {
      startYmd: formatDateToYmd(today),
      endYmd: formatDateToYmd(end),
    };
  }, []);
  const {
    data: generatedDays = [],
    isLoading: isGeneratedSlotsLoading,
    isError: isGeneratedSlotsError,
  } = useGeneratedWorkSlotsQuery(generatedRange.startYmd, generatedRange.endYmd, {
    enabled: slotModalVisible,
  });

  const selectableSlots = useMemo(() => {
    const now = Date.now();
    return listAvailableGeneratedSlotChoices(generatedDays)
      .filter((choice) => parseSlotStartDate(choice).getTime() >= now)
      .sort((a, b) => parseSlotStartDate(a).getTime() - parseSlotStartDate(b).getTime());
  }, [generatedDays]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailableGeneratedSlotChoice[]>();
    for (const slot of selectableSlots) {
      const list = map.get(slot.dateYmd) ?? [];
      list.push(slot);
      map.set(slot.dateYmd, list);
    }
    return map;
  }, [selectableSlots]);

  const availableDateYmds = useMemo(() => Array.from(slotsByDate.keys()), [slotsByDate]);
  const slotsInSelectedDate = useMemo(() => {
    if (!selectedDateYmd) return [];
    return slotsByDate.get(selectedDateYmd) ?? [];
  }, [selectedDateYmd, slotsByDate]);

  useEffect(() => {
    if (availableDateYmds.length === 0) {
      setSelectedDateYmd(null);
      setSelectedSlot(null);
      return;
    }
    setSelectedDateYmd((prev) => (prev && slotsByDate.has(prev) ? prev : availableDateYmds[0]));
    setSelectedSlot((prev) => {
      if (!prev) return null;
      const list = slotsByDate.get(prev.dateYmd) ?? [];
      const stillExists = list.some(
        (s) =>
          s.dateYmd === prev.dateYmd &&
          s.startTime === prev.startTime &&
          s.endTime === prev.endTime
      );
      return stillExists ? prev : null;
    });
  }, [availableDateYmds, slotsByDate]);

  const handleCloseModal = useCallback(() => {
    setSlotModalVisible(false);
    setSelectedSlot(null);
    setSelectedDateYmd(null);
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
    : formatViTicketCreatedAt(createdAt);
  const houseName = houseNameById.get(ticket.houseId) ?? ticket.houseId;
  const assetName = assetNameById.get(ticket.assetId) ?? ticket.assetId;
  const tenantPhone = ticket.tenantPhone ? ticket.tenantPhone : t("staff_ticket_list.phone_unavailable");

  const handleRegisterTime = () => {
    setSelectedSlot(null);
    setSelectedDateYmd(null);
    setSlotModalVisible(true);
  };

  const handleConfirmSlot = () => {
    if (!selectedSlot || confirmSlotMutation.isPending) return;
    confirmSlotMutation.mutate({
      jobId: ticketId,
      startTime: selectedSlot.startTimeLocalIso,
    });
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
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.title_label")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{ticket.title}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.type")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{getTypeLabel(ticket.type, t)}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.description")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{ticket.description}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.device")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{assetName}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.building")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{houseName}</Text>
          </View>
          <View style={[staffTicketDetailStyles.row, staffTicketDetailStyles.rowLast]}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.tenant_phone")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{tenantPhone}</Text>
          </View>
          <View style={staffTicketDetailStyles.row}>
            <Text style={staffTicketDetailStyles.cardLabel}>{t("staff_ticket_detail.created_at")}</Text>
            <Text style={staffTicketDetailStyles.cardValue}>{createdAtStr}</Text>
          </View>

          <View style={{ marginTop: 4 }}>
            <Text style={staffTicketDetailStyles.imageSectionTitle}>
              {t("staff_ticket_detail.images_label")}
            </Text>
            {ticketImagesLoading ? (
              <View style={staffTicketDetailStyles.imageLoadingRow}>
                <ActivityIndicator size="small" color={neutral.textSecondary} />
                <Text style={staffTicketDetailStyles.imageEmptyText}>{t("common.loading")}</Text>
              </View>
            ) : ticketImages.length > 0 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={staffTicketDetailStyles.ticketImagesScroll}
                contentContainerStyle={staffTicketDetailStyles.ticketImagesStrip}
              >
                {ticketImages.map((img) => (
                  <TouchableOpacity
                    key={img.id}
                    style={staffTicketDetailStyles.ticketImageThumb}
                    activeOpacity={0.85}
                    onPress={() => setActiveImageUrl(img.url)}
                  >
                    <Image
                      source={{ uri: img.url }}
                      style={staffTicketDetailStyles.ticketImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={staffTicketDetailStyles.imageEmptyText}>
                {t("staff_ticket_detail.images_empty")}
              </Text>
            )}
          </View>
        </View>

        {showRegisterTimeButton && (
          <Pressable style={staffTicketDetailStyles.acceptBtn} onPress={handleRegisterTime}>
            <Text style={staffTicketDetailStyles.acceptBtnText}>
              {t("staff_ticket_detail.register_time")}
            </Text>
          </Pressable>
        )}
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

      <Modal
        visible={slotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={staffTicketDetailStyles.placeholderModalBackdrop}>
          <View style={staffTicketDetailStyles.placeholderModalCard}>
            <Text style={staffTicketDetailStyles.placeholderModalTitle}>
              {t("staff_ticket_detail.choose_slot_modal_title")}
            </Text>
            <Text style={staffTicketDetailStyles.placeholderModalBody}>
              {t("staff_ticket_detail.choose_slot_modal_hint")}
            </Text>

            {isGeneratedSlotsLoading ? (
              <View style={staffTicketDetailStyles.slotLoadingWrap}>
                <ActivityIndicator size="small" color={brandPrimary} />
                <Text style={staffTicketDetailStyles.slotLoadingText}>{t("common.loading")}</Text>
              </View>
            ) : isGeneratedSlotsError ? (
              <Text style={staffTicketDetailStyles.slotErrorText}>
                {t("staff_calendar.work_slots_load_error")}
              </Text>
            ) : selectableSlots.length === 0 ? (
              <Text style={staffTicketDetailStyles.slotEmptyText}>
                {t("staff_ticket_detail.choose_slot_no_free")}
              </Text>
            ) : (
              <>
                <View style={staffTicketDetailStyles.slotSection}>
                  <Text style={staffTicketDetailStyles.slotSectionTitle}>
                    {t("common.date")}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={staffTicketDetailStyles.dateListContent}
                  >
                    {availableDateYmds.map((dateYmd) => {
                      const isSelectedDate = selectedDateYmd === dateYmd;
                      return (
                        <Pressable
                          key={dateYmd}
                          style={[
                            staffTicketDetailStyles.dateChip,
                            isSelectedDate && staffTicketDetailStyles.dateChipSelected,
                          ]}
                          onPress={() => {
                            setSelectedDateYmd(dateYmd);
                            setSelectedSlot(null);
                          }}
                        >
                          <Text
                            style={[
                              staffTicketDetailStyles.dateChipText,
                              isSelectedDate && staffTicketDetailStyles.dateChipTextSelected,
                            ]}
                          >
                            {formatDateLabelVi(dateYmd)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={staffTicketDetailStyles.slotSection}>
                  <Text style={staffTicketDetailStyles.slotSectionTitle}>
                    {t("staff_ticket_detail.register_time")}
                  </Text>
                  <ScrollView
                    style={staffTicketDetailStyles.slotList}
                    contentContainerStyle={staffTicketDetailStyles.slotListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {slotsInSelectedDate.map((slot) => {
                      const isSelected =
                        selectedSlot?.dateYmd === slot.dateYmd &&
                        selectedSlot.startTime === slot.startTime &&
                        selectedSlot.endTime === slot.endTime;
                      return (
                        <Pressable
                          key={`${slot.dateYmd}-${slot.startTime}-${slot.endTime}`}
                          style={[
                            staffTicketDetailStyles.slotRow,
                            isSelected && staffTicketDetailStyles.slotRowSelected,
                          ]}
                          onPress={() => setSelectedSlot(slot)}
                        >
                          <Text
                            style={[
                              staffTicketDetailStyles.slotRowText,
                              isSelected && staffTicketDetailStyles.slotRowTextSelected,
                            ]}
                          >
                            {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}

            <View style={staffTicketDetailStyles.placeholderModalActions}>
              <Pressable
                style={staffTicketDetailStyles.placeholderModalGhostBtn}
                onPress={handleCloseModal}
              >
                <Text style={staffTicketDetailStyles.placeholderModalGhostText}>
                  {t("common.close")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  staffTicketDetailStyles.placeholderModalCloseBtn,
                  (!selectedSlot ||
                    selectableSlots.length === 0 ||
                    confirmSlotMutation.isPending) &&
                    staffTicketDetailStyles.placeholderModalCloseBtnDisabled,
                ]}
                onPress={handleConfirmSlot}
                disabled={
                  !selectedSlot ||
                  selectableSlots.length === 0 ||
                  confirmSlotMutation.isPending
                }
              >
                {confirmSlotMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={staffTicketDetailStyles.placeholderModalCloseText}>
                    {t("staff_ticket_detail.confirm_slot")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
