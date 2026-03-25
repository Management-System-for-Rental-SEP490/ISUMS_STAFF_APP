/**
 * Màn hình Chi tiết Work Slot của Staff.
 * Hiển thị đầy đủ thông tin work slot và ticket/issue (lấy từ API GET /api/issues/tickets/{ticketId}).
 * ticketId lấy từ work slot API: GET /api/schedules/work_slots/staff/{staffId}.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import {
  getIssueTicketById,
  getIssueTicketImages,
  type IssueTicketImageFromApi,
  updateIssueTicketStatus,
} from "../../../../shared/services/issuesApi";
import { getJobById, updateJobStatus } from "../../../../shared/services/maintenanceApi";
import { CustomAlert } from "../../../../shared/components/alert";
import type { HouseFromApi, IssueTicketFromApi, JobFromApi } from "../../../../shared/types/api";
import Icons from "../../../../shared/theme/icon";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import { staffWorkSlotStyles, STATUS_COLORS } from "./staffWorkSlotStyles";
import { brandPrimary, brandTintBg, neutral } from "../../../../shared/theme/color";
import { formatIsoDueDateVi, formatViTicketCreatedAt } from "../../../../shared/utils";
import { useHouses } from "../../../../shared/hooks/useHouses";
import { getAssetItemById } from "../../../../shared/services/assetItemApi";
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

function getIssueStatusLabel(status: string | undefined, t: (k: string) => string): string {
  const s = String(status || "").toUpperCase();
  const i18nKey = `staff_ticket_list.status_${s}`;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : status ?? "";
}

const JOB_STATUS_KEYS = new Set([
  "CREATED", "SCHEDULED", "NEED_RESCHEDULE", "IN_PROGRESS", "COMPLETED",
  "FAILED", "CANCELLED", "OVERDUE", "AVAILABLE", "BOOKED",
]);

function getJobStatusLabel(status: string | undefined, t: (k: string) => string): string {
  if (!status) return t("staff_calendar.job_status_OTHER");
  const key = `staff_calendar.job_status_${status.toUpperCase()}`;
  return JOB_STATUS_KEYS.has(status.toUpperCase()) ? t(key) : t("staff_calendar.job_status_OTHER");
}

function getStatusColors(status: string | undefined): { bg: string; text: string } {
  const key = status?.toUpperCase() ?? "OTHER";
  return STATUS_COLORS[key] ?? STATUS_COLORS.OTHER;
}

type WorkSlotDetailRouteProp = RouteProp<RootStackParamList, "WorkSlotDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "WorkSlotDetail">;

export default function WorkSlotDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<WorkSlotDetailRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { slot } = route.params;
  const isIssueSlot = String(slot.task || "").toUpperCase() === "ISSUE";

  const [job, setJob] = useState<JobFromApi | null>(null);
  const [ticket, setTicket] = useState<IssueTicketFromApi | null>(null);
  const [assetDisplayName, setAssetDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(!!slot.ticketId);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [ticketImages, setTicketImages] = useState<IssueTicketImageFromApi[]>([]);
  const [ticketImagesLoading, setTicketImagesLoading] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  // Danh sách houses từ BE (dùng để map houseId -> tên căn nhà hiển thị cho người dùng).
  const { data: housesResp } = useHouses();
  const houses: HouseFromApi[] = housesResp?.data ?? [];

  const refetchItem = () => {
    if (!slot.ticketId?.trim()) return;
    if (isIssueSlot) {
      getIssueTicketById(slot.ticketId)
        .then(async (res) => {
          if (!res?.success || !res?.data) return;
          setTicket(res.data);
          setJob(null);
          // Asset display name (optional) - BE có thể không trả đủ assetName trong ticket
          if (res.data.assetId?.trim()) {
            const asset = await getAssetItemById(res.data.assetId);
            setAssetDisplayName(asset?.displayName ?? res.data.assetId);
          } else {
            setAssetDisplayName("");
          }
        })
        .catch(() => {});
      return;
    }

    getJobById(slot.ticketId)
      .then((res) => {
        if (!res?.success || !res?.data) return;
        setJob(res.data);
        setTicket(null);
        setAssetDisplayName("");
      })
      .catch(() => {});
  };

  const handleStartWork = async () => {
    if (!slot.ticketId) return;
    if (isIssueSlot) {
      if (!ticket?.id) return;
      const current = (ticket.status ?? "").toUpperCase();
      const newStatus = "IN_PROGRESS";
      if (current !== "SCHEDULED") {
        CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
        return;
      }
      setUpdateLoading(true);
      try {
        await updateIssueTicketStatus(ticket.id, newStatus);
        CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
        refetchItem();
      } catch (err) {
        CustomAlert.alert(t("staff_work_slot_detail.update_error"), err instanceof Error ? err.message : "", [{ text: t("common.close") }]);
      } finally {
        setUpdateLoading(false);
      }
      return;
    }

    if (!job?.id) return;
    const current = (job.status ?? "").toUpperCase();
    const newStatus = current === "IN_PROGRESS" ? "COMPLETED" : "IN_PROGRESS";
    if (newStatus === "IN_PROGRESS" && current !== "SCHEDULED") {
      CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
      return;
    }
    if (newStatus === "COMPLETED" && current !== "IN_PROGRESS") {
      CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
      return;
    }
    setUpdateLoading(true);
    try {
      await updateJobStatus(job.id, newStatus);
      CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
      refetchItem();
    } catch (err) {
      CustomAlert.alert(t("staff_work_slot_detail.update_error"), err instanceof Error ? err.message : "", [{ text: t("common.close") }]);
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    if (!slot.ticketId?.trim()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);
    (isIssueSlot ? getIssueTicketById(slot.ticketId) : getJobById(slot.ticketId))
      .then(async (res) => {
        if (cancelled || !res?.success || !res?.data) return;
        if (isIssueSlot) {
          const issue = res.data as IssueTicketFromApi;
          setTicket(issue);
          setJob(null);
          if (issue.assetId?.trim()) {
            const asset = await getAssetItemById(issue.assetId);
            if (!cancelled) setAssetDisplayName(asset?.displayName ?? issue.assetId);
          } else if (!cancelled) {
            setAssetDisplayName("");
          }
        } else {
          setJob(res.data as JobFromApi);
          setTicket(null);
          setAssetDisplayName("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const status = err?.response?.status;
          const message =
            status === 404
              ? t("staff_work_slot_detail.job_not_found")
              : err instanceof Error
                ? err.message
                : t("staff_work_slot_detail.job_load_error");
          setError(message);
          setTicket(null);
          setJob(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isIssueSlot, slot.ticketId, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isIssueSlot || !ticket?.id) {
        setTicketImages([]);
        return;
      }

      setTicketImagesLoading(true);
      try {
        const imgs = await getIssueTicketImages(ticket.id);
        if (!cancelled) setTicketImages(imgs);
      } catch (e) {
        console.error("[WorkSlotDetail] load ticket images failed", e);
        if (!cancelled) setTicketImages([]);
      } finally {
        if (!cancelled) setTicketImagesLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isIssueSlot, ticket?.id]);

  const slotStatusLabel = isIssueSlot
    ? getIssueStatusLabel(slot.status, t)
    : getJobStatusLabel(slot.status, t);
  const itemStatusLabel = isIssueSlot
    ? getIssueStatusLabel(ticket?.status ?? slot.status, t)
    : getJobStatusLabel(job?.status ?? slot.status, t);

  // Tên căn nhà hiển thị ở phần chi tiết công việc: ưu tiên lấy từ houseId của job.
  const houseId = isIssueSlot ? ticket?.houseId : job?.houseId;
  const houseDisplayName = houseId
    ? houses.find((h) => h.id === houseId)?.name ?? houseId
    : "";
  const hasDetailItem = isIssueSlot ? !!ticket : !!job;
  const canShowActions = isIssueSlot
    ? !!ticket && (ticket.status === "SCHEDULED" || ticket.status === "IN_PROGRESS")
    : !!job && (job.status === "SCHEDULED" || job.status === "IN_PROGRESS");

  useFocusEffect(
    useCallback(() => {
      refetchItem();
      return undefined;
    }, [slot.ticketId, isIssueSlot])
  );

  return (
    <View style={staffWorkSlotStyles.container}>
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
              {t("staff_work_slot_detail.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <ScrollView
        contentContainerStyle={[
          staffWorkSlotStyles.scrollContent,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner
        <View style={staffWorkSlotStyles.heroBanner}>
          <Text style={staffWorkSlotStyles.heroTime}>{slot.timeRange}</Text>
          <Text style={staffWorkSlotStyles.heroDate}>{slot.date}</Text>
          <Text style={staffWorkSlotStyles.heroJobType}>
            {slot.taskKey ? t(slot.taskKey) : slot.task}
          </Text>
        </View> */}

        {/* Work Slot */}
        <View style={staffWorkSlotStyles.section}>
          <View style={staffWorkSlotStyles.sectionHeader}>
            <View style={iconStyles.workSlotSectionIconWrap}>
              <Icons.schedule size={20} color={neutral.iconMuted} />
            </View>
            <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.work_slot_section")}</Text>
          </View>
          <View style={staffWorkSlotStyles.card}>
            <InfoRow icon={<Icons.accessTime size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.time_range")} value={slot.timeRange} />
            <InfoRow icon={<Icons.calendar size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.date")} value={slot.date} />
            <InfoRow icon={<Icons.workOutline size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.job_type")} value={slot.taskKey ? t(slot.taskKey) : slot.task} />
            <InfoRow
              icon={<Icons.flag size={18} color={neutral.slate500} />}
              label={t("staff_work_slot_detail.status")}
              value={slotStatusLabel}
              isStatus
              statusRaw={slot.status}
            />
          </View>
        </View>

        {/* Job (từ API) */}
        <View style={staffWorkSlotStyles.section}>
          <View style={[staffWorkSlotStyles.sectionHeader, { borderBottomColor: brandTintBg }]}>
            <View style={[iconStyles.workSlotSectionIconWrap, iconStyles.workSlotSectionIconWrapJob]}>
              <Icons.assignment size={20} color={neutral.iconMuted} />
            </View>
            <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.job_section")}</Text>
          </View>
          {loading ? (
            <View style={staffWorkSlotStyles.loadingWrap}>
              <ActivityIndicator size="large" color={brandPrimary} />
              <Text style={staffWorkSlotStyles.loadingText}>{t("common.loading")}</Text>
            </View>
          ) : error ? (
            <View style={staffWorkSlotStyles.errorCard}>
              <Text style={staffWorkSlotStyles.errorText}>{error}</Text>
            </View>
          ) : hasDetailItem ? (
            <View style={staffWorkSlotStyles.card}>
              <InfoRow
                icon={<Icons.home size={18} color={neutral.slate500} />}
                label={isIssueSlot ? t("staff_ticket_detail.building") : t("staff_work_slot_detail.house_id")}
                value={houseDisplayName}
              />
              {isIssueSlot ? (
                <>
                  <InfoRow
                    icon={<Icons.assignment size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.title_label")}
                    value={ticket?.title ?? ""}
                  />
                  <InfoRow
                    icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.description")}
                    value={ticket?.description ?? ""}
                  />
                  <InfoRow
                    icon={<Icons.tag size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.device")}
                    value={assetDisplayName || ticket?.assetId || ""}
                  />
                  <InfoRow
                    icon={<Icons.calendar size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.created_at")}
                    value={ticket?.createdAt ? formatViTicketCreatedAt(new Date(ticket.createdAt)) : ""}
                  />

                  <View style={{ marginTop: 6 }}>
                    <Text style={staffWorkSlotStyles.imageSectionTitle}>
                      {t("staff_ticket_detail.images_label")}
                    </Text>
                    {ticketImagesLoading ? (
                      <View style={staffWorkSlotStyles.imageLoadingRow}>
                        <ActivityIndicator size="small" color={neutral.iconMuted} />
                        <Text style={staffWorkSlotStyles.imageEmptyText}>{t("common.loading")}</Text>
                      </View>
                    ) : ticketImages.length > 0 ? (
                      <View style={staffWorkSlotStyles.ticketImagesGrid}>
                        {ticketImages.map((img) => (
                          <TouchableOpacity
                            key={img.id}
                            style={staffWorkSlotStyles.ticketImageThumb}
                            activeOpacity={0.85}
                            onPress={() => setActiveImageUrl(img.url)}
                          >
                            <Image source={{ uri: img.url }} style={staffWorkSlotStyles.ticketImage} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={staffWorkSlotStyles.imageEmptyText}>{t("staff_ticket_detail.images_empty")}</Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <InfoRow icon={<Icons.event size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.period_start")} value={job?.periodStartDate ?? ""} />
                  <InfoRow icon={<Icons.calendar size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.due_date")} value={job?.dueDate ? formatIsoDueDateVi(job.dueDate) : ""} />
                </>
              )}
              <InfoRow
                icon={<Icons.flag size={18} color={neutral.slate500} />}
                label={isIssueSlot ? t("staff_ticket_detail.status") : t("staff_work_slot_detail.job_status")}
                value={itemStatusLabel}
                isStatus
                statusRaw={isIssueSlot ? ticket?.status ?? slot.status : job?.status ?? slot.status}
              />
              {canShowActions ? (
                <View style={[staffWorkSlotStyles.actionRow, { marginTop: 16 }]}>
                  {((isIssueSlot && ticket?.status === "SCHEDULED")
                    || (!isIssueSlot && job?.status === "SCHEDULED")) && (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnPrimary, { marginRight: 6 }]}
                      onPress={handleStartWork}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color={neutral.surface} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {isIssueSlot
                            ? t("staff_work_slot_detail.btn_start_issue")
                            : t("staff_work_slot_detail.btn_start_maintenance")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {((isIssueSlot && ticket?.status === "IN_PROGRESS")
                    || (!isIssueSlot && job?.status === "IN_PROGRESS")) && (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={() => {
                        if (isIssueSlot && ticket?.id && ticket.houseId && ticket.assetId) {
                          navigation.navigate("StaffIssueNote", {
                            issueId: ticket.id,
                            houseId: ticket.houseId,
                            assetId: ticket.assetId,
                          });
                          return;
                        }
                        if (isIssueSlot) {
                          CustomAlert.alert(
                            t("common.error"),
                            "Thiếu thông tin issue để ghi nhận sửa chữa.",
                            [{ text: t("common.close") }]
                          );
                          return;
                        }
                        void handleStartWork();
                      }}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color={neutral.surface} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {isIssueSlot ? "Đang sửa chữa" : t("staff_work_slot_detail.btn_complete")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={staffWorkSlotStyles.emptyCard}>
              <Text style={staffWorkSlotStyles.emptyText}>{t("staff_work_slot_detail.no_job")}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={activeImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageUrl(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={staffWorkSlotStyles.imageModalBackdrop}
          onPress={() => setActiveImageUrl(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => {
              e.stopPropagation();
            }}
            style={staffWorkSlotStyles.imageModalContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={staffWorkSlotStyles.imageModalClose}
              onPress={() => setActiveImageUrl(null)}
            >
              <Text style={staffWorkSlotStyles.imageModalCloseText}>×</Text>
            </TouchableOpacity>

            {activeImageUrl && (
              <Image
                source={{ uri: activeImageUrl }}
                style={staffWorkSlotStyles.imageModalImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function InfoRow({
  label,
  value,
  mono,
  valueStyle,
  icon,
  isStatus,
  statusRaw,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueStyle?: object;
  icon?: React.ReactNode;
  isStatus?: boolean;
  statusRaw?: string;
}) {
  const colors = isStatus ? getStatusColors(statusRaw) : undefined;
  const valueStyles = isStatus && colors
    ? [staffWorkSlotStyles.statusBadge, staffWorkSlotStyles.statusText, { backgroundColor: colors.bg, color: colors.text }]
    : valueStyle;
  return (
    <View style={staffWorkSlotStyles.row}>
      {icon ? (
        <View style={iconStyles.workSlotRowIconWrap}>{icon}</View>
      ) : null}
      <View style={staffWorkSlotStyles.rowContent}>
        <Text style={staffWorkSlotStyles.label}>{label}</Text>
        <Text
          style={[
            staffWorkSlotStyles.value,
            mono && staffWorkSlotStyles.valueMono,
            valueStyles,
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
