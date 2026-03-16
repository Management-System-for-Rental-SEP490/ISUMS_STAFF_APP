/**
 * Màn hình Chi tiết Work Slot của Staff.
 * Hiển thị đầy đủ thông tin work slot và job (lấy từ API GET /api/maintenances/jobs/{jobId}).
 * jobId lấy từ work slot API: GET /api/schedules/work_slots/staff/{staffId}.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import { getJobById, updateJobStatus } from "../../../../shared/services/maintenanceApi";
import { CustomAlert } from "../../../../shared/components/alert";
import type { JobFromApi } from "../../../../shared/types/api";
import Icons from "../../../../shared/theme/icon";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import { staffWorkSlotStyles, STATUS_COLORS } from "./staffWorkSlotStyles";

const JOB_STATUS_KEYS = new Set([
  "CREATED", "SCHEDULED", "NEED_RESCHEDULE", "IN_PROGRESS", "COMPLETED",
  "FAILED", "CANCELLED", "OVERDUE", "AVAILABLE", "BOOKED",
]);

function getJobStatusKey(status: string | undefined): string {
  if (!status) return "staff_calendar.job_status_OTHER";
  const key = `staff_calendar.job_status_${status.toUpperCase()}`;
  return JOB_STATUS_KEYS.has(status.toUpperCase()) ? key : "staff_calendar.job_status_OTHER";
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

  const [job, setJob] = useState<JobFromApi | null>(null);
  const [loading, setLoading] = useState(!!slot.ticketId);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const refetchJob = () => {
    if (!slot.ticketId?.trim()) return;
    getJobById(slot.ticketId)
      .then((res) => { if (res.success && res.data) setJob(res.data); })
      .catch(() => {});
  };

  const handleUpdateStatus = async (newStatus: "IN_PROGRESS" | "COMPLETED") => {
    if (!job?.id || !slot.ticketId) return;
    const current = (job.status ?? "").toUpperCase();
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
      refetchJob();
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
    getJobById(slot.ticketId)
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setJob(res.data);
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
          setJob(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slot.ticketId, t]);

  const jobStatusKey = getJobStatusKey(slot.status);
  const slotStatusKey = getJobStatusKey(job?.status ?? slot.status);

  return (
    <View style={staffWorkSlotStyles.container}>
      <View style={[staffWorkSlotStyles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={staffWorkSlotStyles.backBtn} onPress={() => navigation.goBack()}>
          <Icons.chevronBack size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={staffWorkSlotStyles.topBarTitle} numberOfLines={1}>
          {t("staff_work_slot_detail.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={staffWorkSlotStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <View style={staffWorkSlotStyles.heroBanner}>
          <Text style={staffWorkSlotStyles.heroTime}>{slot.timeRange}</Text>
          <Text style={staffWorkSlotStyles.heroDate}>{slot.date}</Text>
          <Text style={staffWorkSlotStyles.heroJobType}>
            {slot.taskKey ? t(slot.taskKey) : slot.task}
          </Text>
        </View>

        {/* Work Slot */}
        <View style={staffWorkSlotStyles.section}>
          <View style={staffWorkSlotStyles.sectionHeader}>
            <View style={iconStyles.workSlotSectionIconWrap}>
              <Icons.schedule size={20} color="#4F46E5" />
            </View>
            <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.work_slot_section")}</Text>
          </View>
          <View style={staffWorkSlotStyles.card}>
            <InfoRow icon={<Icons.accessTime size={18} color="#64748b" />} label={t("staff_work_slot_detail.time_range")} value={slot.timeRange} />
            <InfoRow icon={<Icons.calendar size={18} color="#64748b" />} label={t("staff_work_slot_detail.date")} value={slot.date} />
            <InfoRow icon={<Icons.workOutline size={18} color="#64748b" />} label={t("staff_work_slot_detail.job_type")} value={slot.taskKey ? t(slot.taskKey) : slot.task} />
            <InfoRow
              icon={<Icons.flag size={18} color="#64748b" />}
              label={t("staff_work_slot_detail.status")}
              value={t(jobStatusKey)}
              isStatus
              statusRaw={slot.status}
            />
          </View>
        </View>

        {/* Job (từ API) */}
        <View style={staffWorkSlotStyles.section}>
          <View style={[staffWorkSlotStyles.sectionHeader, { borderBottomColor: "#D1FAE5" }]}>
            <View style={[iconStyles.workSlotSectionIconWrap, iconStyles.workSlotSectionIconWrapJob]}>
              <Icons.assignment size={20} color="#059669" />
            </View>
            <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.job_section")}</Text>
          </View>
          {loading ? (
            <View style={staffWorkSlotStyles.loadingWrap}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={staffWorkSlotStyles.loadingText}>{t("common.loading")}</Text>
            </View>
          ) : error ? (
            <View style={staffWorkSlotStyles.errorCard}>
              <Text style={staffWorkSlotStyles.errorText}>{error}</Text>
            </View>
          ) : job ? (
            <View style={staffWorkSlotStyles.card}>
              <InfoRow icon={<Icons.tag size={18} color="#64748b" />} label={t("staff_work_slot_detail.job_id")} value={job.id} mono />
              <InfoRow icon={<Icons.folder size={18} color="#64748b" />} label={t("staff_work_slot_detail.plan_id")} value={job.planId} mono />
              <InfoRow icon={<Icons.home size={18} color="#64748b" />} label={t("staff_work_slot_detail.house_id")} value={job.houseId} mono />
              <InfoRow icon={<Icons.event size={18} color="#64748b" />} label={t("staff_work_slot_detail.period_start")} value={job.periodStartDate} />
              <InfoRow icon={<Icons.calendar size={18} color="#64748b" />} label={t("staff_work_slot_detail.due_date")} value={formatDueDate(job.dueDate)} />
              <InfoRow
                icon={<Icons.flag size={18} color="#64748b" />}
                label={t("staff_work_slot_detail.job_status")}
                value={t(slotStatusKey)}
                isStatus
                statusRaw={job?.status ?? slot.status}
              />
              {/* Nút cập nhật: SCHEDULED → Bắt đầu (IN_PROGRESS), IN_PROGRESS → Hoàn thành (COMPLETED) */}
              {(job.status === "SCHEDULED" || job.status === "IN_PROGRESS") && (
                <View style={[staffWorkSlotStyles.actionRow, { marginTop: 16 }]}>
                  {job.status === "SCHEDULED" && (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnPrimary, { marginRight: 6 }]}
                      onPress={() => handleUpdateStatus("IN_PROGRESS")}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>{t("staff_work_slot_detail.btn_start_maintenance")}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {job.status === "IN_PROGRESS" && (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={() => handleUpdateStatus("COMPLETED")}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>{t("staff_work_slot_detail.btn_complete")}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={staffWorkSlotStyles.emptyCard}>
              <Text style={staffWorkSlotStyles.emptyText}>{t("staff_work_slot_detail.no_job")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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

function formatDueDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
