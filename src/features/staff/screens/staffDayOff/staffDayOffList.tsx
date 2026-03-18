/**
 * Màn danh sách yêu cầu nghỉ của staff. Dữ liệu lấy từ API GET /api/schedules/leave/staff/{staffId}.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../../../../shared/components/header";
import { CustomAlert } from "../../../../shared/components/alert";
import { getStaffIdForSchedule } from "../../../../shared/services/scheduleApi";
import type { LeaveRequestFromApi } from "../../../../shared/types/api";
import { useLeaveRequests, useUpdateLeaveRequestStatus } from "../../../../shared/hooks";
import { staffDayOffStyles } from "./staffDayOffStyles";

function formatLeaveDate(leaveDate: string): string {
  const d = new Date(leaveDate);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function getStatusStyle(status: string) {
  const u = status.toUpperCase();
  if (u === "PENDING") return "Pending";
  if (u === "APPROVED") return "Approved";
  if (u === "REJECTED") return "Rejected";
  if (u === "CANCELLED") return "Cancelled";
  return "Other";
}

export default function StaffDayOffListScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LeaveRequestFromApi[]>([]);

  // React Query: lấy danh sách yêu cầu nghỉ, dữ liệu nền tảng cho màn hình.
  const { data: leaveData, isLoading: queryLoading, refetch } = useLeaveRequests();
  const updateStatusMutation = useUpdateLeaveRequestStatus();

  const fetchData = useCallback(
    async (cacheBust?: number) => {
      const staffId = getStaffIdForSchedule();
      try {
        // Kết hợp dữ liệu từ React Query với refetch thủ công để đảm bảo luôn mới.
        const res = await refetch();
        const apiData = res.data?.data ?? leaveData?.data ?? [];
        const data = Array.isArray(apiData) ? apiData : [];
        setItems(data);
        setError(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("staff_day_off.load_error");
        setError(msg);
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, leaveData, refetch]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
      const interval = setInterval(() => fetchData(), 20000);
      return () => clearInterval(interval);
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCancelRequest = (item: LeaveRequestFromApi) => {
    CustomAlert.alert(
      t("staff_day_off.cancel_confirm_title"),
      t("staff_day_off.cancel_confirm_message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("staff_day_off.cancel_btn"),
          style: "destructive",
          onPress: async () => {
            setCancellingId(item.id);
            try {
              // Refetch để lấy trạng thái mới nhất (manager có thể đã duyệt/từ chối)
              const staffId = getStaffIdForSchedule();
              const res = await refetch();
              const latestList = res.data?.data ?? [];
              const latest = latestList.find((r) => r.id === item.id);
              if (latest && latest.status?.toUpperCase() !== "PENDING") {
                setCancellingId(null);
                CustomAlert.alert(
                  t("staff_day_off.cancel_already_processed_title"),
                  t("staff_day_off.cancel_already_processed_message"),
                  [{ text: t("common.close") }],
                  { type: "info" }
                );
                fetchData();
                return;
              }
              const apiRes = await updateStatusMutation.mutateAsync({
                id: item.id,
              });
              const updated = apiRes.data;
              if (updated?.status?.toUpperCase() === "CANCELLED") {
                setItems((prev) =>
                  prev.map((x) => (x.id === item.id && updated ? updated : x))
                );
                CustomAlert.alert(
                  t("common.success"),
                  t("staff_day_off.cancel_success"),
                  [{ text: t("common.close") }],
                  { type: "success" }
                );
              } else {
                fetchData();
                CustomAlert.alert(
                  t("staff_day_off.cancel_already_processed_title"),
                  t("staff_day_off.cancel_already_processed_message"),
                  [{ text: t("common.close") }],
                  { type: "info" }
                );
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : t("staff_day_off.cancel_error");
              CustomAlert.alert(t("common.error"), msg, undefined, { type: "error" });
              fetchData();
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
      { type: "warning" }
    );
  };

  if (loading && items.length === 0) {
    return (
      <View style={staffDayOffStyles.container}>
        <Header variant="default" />
        <View style={staffDayOffStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  return (
    <View style={staffDayOffStyles.container}>
      <Header variant="default" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          staffDayOffStyles.list,
          items.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366f1"]}
          />
        }
        ListEmptyComponent={
          error ? (
            <View style={staffDayOffStyles.emptyContainer}>
              <Text style={staffDayOffStyles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={onRefresh}
                style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: "#6366f1", fontWeight: "600" }}>
                  {t("common.try_again")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={staffDayOffStyles.emptyContainer}>
              <Text style={staffDayOffStyles.emptyText}>
                {t("staff_day_off.no_requests")}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          const statusKey = `staff_day_off.status_${statusStyle.toLowerCase()}`;
          const badgeStyle =
            statusStyle === "Pending"
              ? staffDayOffStyles.statusBadgePending
              : statusStyle === "Approved"
                ? staffDayOffStyles.statusBadgeApproved
                : statusStyle === "Rejected"
                  ? staffDayOffStyles.statusBadgeRejected
                  : statusStyle === "Cancelled"
                    ? staffDayOffStyles.statusBadgeCancelled
                    : staffDayOffStyles.statusBadgeOther;
          const textStyle =
            statusStyle === "Pending"
              ? staffDayOffStyles.statusTextPending
              : statusStyle === "Approved"
                ? staffDayOffStyles.statusTextApproved
                : statusStyle === "Rejected"
                  ? staffDayOffStyles.statusTextRejected
                  : statusStyle === "Cancelled"
                    ? staffDayOffStyles.statusTextCancelled
                    : staffDayOffStyles.statusTextOther;
          return (
            <View style={staffDayOffStyles.card}>
              <View style={staffDayOffStyles.cardHeader}>
                <Text style={staffDayOffStyles.dateRange}>
                  {formatLeaveDate(item.leaveDate)}
                </Text>
                <View style={[staffDayOffStyles.statusBadge, badgeStyle]}>
                  <Text style={[staffDayOffStyles.statusText, textStyle]}>
                    {t(statusKey)}
                  </Text>
                </View>
              </View>
              {item.note ? (
                <Text style={staffDayOffStyles.reason} numberOfLines={2}>
                  {item.note}
                </Text>
              ) : null}
              {statusStyle === "Pending" ? (
                <TouchableOpacity
                  onPress={() => handleCancelRequest(item)}
                  disabled={cancellingId === item.id}
                  style={staffDayOffStyles.cancelBtn}
                  activeOpacity={0.8}
                >
                  {cancellingId === item.id ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <Text style={staffDayOffStyles.cancelBtnText}>
                      {t("staff_day_off.cancel_btn")}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}
