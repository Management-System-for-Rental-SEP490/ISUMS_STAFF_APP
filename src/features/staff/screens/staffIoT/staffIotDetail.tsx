/**
 * Chi tiết Controller hoặc Node IoT — hiển thị đầy đủ trường từ API (đã dịch nhãn).
 * Dữ liệu lấy lại qua useIotDevicesByHouseId(houseId).
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../../../../shared/types";
import type { IotControllerHouseDataFromApi, IotNodeDeviceFromApi } from "../../../../shared/types/api";
import { useIotDevicesByHouseId } from "../../../../shared/hooks";
import Icons from "../../../../shared/theme/icon";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import { staffIotStyles as s } from "./staffIotStyles";
import { formatLocaleIsoDateTime } from "../../../../shared/utils";
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

type StaffIotDetailRouteProp = RouteProp<RootStackParamList, "StaffIotDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "StaffIotDetail">;

function translateIotStatus(t: (k: string) => string, raw: string): string {
  const u = (raw ?? "").toUpperCase();
  if (u === "ACTIVE") return t("staff_iot.status_ACTIVE");
  if (u === "OFFLINE") return t("staff_iot.status_OFFLINE");
  if (u === "PENDING") return t("staff_iot.status_PENDING");
  if (u === "IN_USE") return t("staff_iot.node_status_IN_USE");
  if (u === "DEPROVISIONED") return t("staff_iot.status_DEPROVISIONED");
  return raw || "—";
}

function DetailField({
  labelKey,
  value,
  last,
  t,
}: {
  labelKey: string;
  value: string;
  last?: boolean;
  t: (k: string) => string;
}) {
  const v = value?.trim();
  if (!v) return null;
  return (
    <View style={[s.detailRow, last && s.detailRowLast]}>
      <Text style={s.detailLabel}>{t(labelKey)}</Text>
      <Text style={s.detailValue} selectable>
        {v}
      </Text>
    </View>
  );
}

export default function StaffIotDetailScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<StaffIotDetailRouteProp>();
  const { houseId, houseName, kind, nodeId } = route.params;

  const locale = useMemo(() => {
    const lang = String(i18n.language || "").toLowerCase();
    if (lang.startsWith("en")) return "en-US";
    if (lang.startsWith("ja")) return "ja-JP";
    return "vi-VN";
  }, [i18n.language]);

  const { data: iotResp, isLoading } = useIotDevicesByHouseId(houseId);
  const controller: IotControllerHouseDataFromApi | undefined = iotResp?.data;
  const activeController =
    controller && controller.status !== "DEPROVISIONED" ? controller : null;

  const node: IotNodeDeviceFromApi | undefined = useMemo(() => {
    if (kind !== "node" || !nodeId || !activeController?.devices) return undefined;
    return activeController.devices.find((d) => d.id === nodeId && d.status !== "DEPROVISIONED");
  }, [kind, nodeId, activeController]);

  const title =
    kind === "controller"
      ? t("staff_iot.detail_title_controller")
      : t("staff_iot.detail_title_node");

  const headerRow = (
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
          <StackScreenTitleBadge numberOfLines={1}>{title}</StackScreenTitleBadge>
        </View>
        <StackScreenTitleBarBalance />
      </View>
    </StackScreenTitleHeaderStrip>
  );

  if (isLoading) {
    return (
      <View style={s.container}>
        {headerRow}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={brandPrimary} />
        </View>
      </View>
    );
  }

  if (kind === "controller") {
    if (!activeController) {
      return (
        <View style={s.container}>
          {headerRow}
          <Text style={s.detailEmpty}>{t("staff_iot.detail_not_found")}</Text>
        </View>
      );
    }
    const c = activeController;
    const nodeCount = (c.devices ?? []).filter((d) => d.status !== "DEPROVISIONED").length;
    return (
      <View style={s.container}>
        {headerRow}
        <ScrollView
          contentContainerStyle={[s.detailScroll, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.detailCard}>
            <DetailField
              labelKey="staff_iot.detail_field_house_name"
              value={houseName}
              t={t}
            />
            <DetailField labelKey="staff_iot.detail_field_id" value={c.id} t={t} />
            <DetailField labelKey="staff_iot.detail_field_thing_name" value={c.thingName} t={t} />
            <DetailField labelKey="staff_iot.detail_field_device_id" value={c.deviceId} t={t} />
            <DetailField
              labelKey="staff_iot.detail_field_status"
              value={translateIotStatus(t, c.status)}
              t={t}
            />
            <DetailField
              labelKey="staff_iot.detail_field_area_name"
              value={c.areaName ?? t("staff_iot.area_unassigned")}
              t={t}
            />
            <DetailField
              labelKey="staff_iot.detail_field_created_at"
              value={formatLocaleIsoDateTime(c.createdAt, locale)}
              t={t}
            />
            <DetailField
              labelKey="staff_iot.detail_field_activated_at"
              value={formatLocaleIsoDateTime(c.activatedAt, locale)}
              t={t}
            />
            <DetailField
              labelKey="staff_iot.detail_field_nodes_count"
              value={String(nodeCount)}
              last
              t={t}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!node) {
    return (
      <View style={s.container}>
        {headerRow}
        <Text style={s.detailEmpty}>{t("staff_iot.detail_not_found")}</Text>
      </View>
    );
  }

  const n = node;
  return (
    <View style={s.container}>
      {headerRow}
      <ScrollView
        contentContainerStyle={[s.detailScroll, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.detailCard}>
          <DetailField
            labelKey="staff_iot.detail_field_house_name"
            value={houseName}
            t={t}
          />
          <DetailField labelKey="staff_iot.detail_field_id" value={n.id} t={t} />
          <DetailField labelKey="staff_iot.detail_field_display_name" value={n.displayName} t={t} />
          <DetailField labelKey="staff_iot.detail_field_asset_id" value={n.assetId} t={t} />
          <DetailField labelKey="staff_iot.detail_field_category_code" value={n.categoryCode} t={t} />
          <DetailField labelKey="staff_iot.detail_field_serial_number" value={n.serialNumber} t={t} />
          <DetailField labelKey="staff_iot.detail_field_thing" value={n.thing} t={t} />
          <DetailField
            labelKey="staff_iot.detail_field_status"
            value={translateIotStatus(t, n.status)}
            t={t}
          />
          <DetailField
            labelKey="staff_iot.detail_field_area_name"
            value={n.areaName ?? t("staff_iot.area_unassigned")}
            last
            t={t}
          />
        </View>
      </ScrollView>
    </View>
  );
}
