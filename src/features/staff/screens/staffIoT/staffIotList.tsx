import React, { useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import type { FunctionalAreaFromApi, IotNodeDeviceFromApi } from "../../../../shared/types/api";
import Icons from "../../../../shared/theme/icon";
import {
  useFunctionalAreasByHouseId,
  useIotDevicesByHouseId,
  useDeprovisionIotControllerByHouseId,
} from "../../../../shared/hooks";
import { useTranslation } from "react-i18next";
import { staffIotStyles as s } from "./staffIotStyles";
import { CustomAlert } from "../../../../shared/components/alert";

type StaffIotListRouteProp = RouteProp<RootStackParamList, "StaffIotList">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "StaffIotList">;

type IotDeviceKind = "all" | "controller" | "node";

export default function StaffIotListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<StaffIotListRouteProp>();
  const { houseId, houseName } = route.params;

  const [activeKind, setActiveKind] = useState<IotDeviceKind>("all");
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const { data: areasResp, isLoading: areasLoading } = useFunctionalAreasByHouseId(houseId);
  const areas: FunctionalAreaFromApi[] = areasResp?.data ?? [];

  const { data: iotResp, isLoading: iotLoading, refetch: refetchIot } = useIotDevicesByHouseId(houseId);
  const controller = iotResp?.data;
  const activeController =
    controller && controller.status !== "DEPROVISIONED" ? controller : null;
  const nodes: IotNodeDeviceFromApi[] = (controller?.devices ?? []).filter(
    (d) => d.status !== "DEPROVISIONED"
  );
  const deprovisionControllerMutation = useDeprovisionIotControllerByHouseId(houseId);

  // Theo yêu cầu UI: bỏ lọc theo tầng, chỉ hiển thị danh sách khu vực.

  const nodesByArea = useMemo(() => {
    const map = new Map<string, IotNodeDeviceFromApi[]>();
    for (const n of nodes) {
      const key = (n.areaName ?? "").trim() || t("staff_building_detail.category_other");
      const list = map.get(key) ?? [];
      list.push(n);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([areaName, list]) => ({
      areaName,
      devices: list,
    }));
  }, [nodes, t]);

  const getControllerStatusUi = (statusRaw: string) => {
    const status = (statusRaw ?? "").toUpperCase();
    switch (status) {
      case "ACTIVE":
        return {
          label: t("staff_iot.status_ACTIVE"),
          dot: "#16A34A",
          cardBg: "rgba(22,163,74,0.06)",
          cardBorder: "rgba(22,163,74,0.25)",
          badgeBg: "rgba(22,163,74,0.10)",
          badgeBorder: "rgba(22,163,74,0.35)",
          text: "#166534",
        };
      case "OFFLINE":
        return {
          label: t("staff_iot.status_OFFLINE"),
          dot: "#DC2626",
          cardBg: "rgba(220,38,38,0.06)",
          cardBorder: "rgba(220,38,38,0.25)",
          badgeBg: "rgba(220,38,38,0.10)",
          badgeBorder: "rgba(220,38,38,0.35)",
          text: "#991B1B",
        };
      case "PENDING":
      default:
        return {
          label: status === "PENDING" ? t("staff_iot.status_PENDING") : statusRaw,
          dot: "#D97706",
          cardBg: "rgba(217,119,6,0.06)",
          cardBorder: "rgba(217,119,6,0.25)",
          badgeBg: "rgba(217,119,6,0.10)",
          badgeBorder: "rgba(217,119,6,0.35)",
          text: "#92400E",
        };
    }
  };

  const getNodeStatusUi = (statusRaw: string) => {
    const status = (statusRaw ?? "").toUpperCase();
    if (status === "ACTIVE") return getControllerStatusUi("ACTIVE");
    if (status === "OFFLINE") return getControllerStatusUi("OFFLINE");
    if (status === "PENDING") return getControllerStatusUi("PENDING");
    // Fallback cho các status khác của node (IN_USE, ...): coi như ACTIVE để dễ nhìn
    if (status === "IN_USE") return getControllerStatusUi("ACTIVE");
    return getControllerStatusUi(statusRaw);
  };

  const confirmDetach = (params: { kind: "controller" | "node"; name: string }) => {
    // Dùng CustomAlert theo rule (không dùng Alert.alert mặc định).
    CustomAlert.alert(
      t("staff_iot.detach_confirm_title"),
      t("staff_iot.detach_confirm_message", { name: params.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("staff_iot.detach_btn"),
          style: "destructive",
          onPress: () => {
            if (params.kind === "controller") {
              deprovisionControllerMutation.mutate(undefined, {
                onSuccess: () => {
                  // Đợi server cập nhật status DEPROVISIONED rồi mới refetch để UI biến mất ổn định.
                  setTimeout(() => {
                    refetchIot();
                  }, 1000);
                  CustomAlert.alert(
                    t("staff_iot.detach_requested_title"),
                    t("staff_iot.detach_requested_message"),
                    [{ text: t("common.close") }],
                    { type: "success" }
                  );
                },
                onError: () => {
                  CustomAlert.alert(
                    t("staff_iot.detach_failed_title"),
                    t("staff_iot.detach_failed_message"),
                    [{ text: t("common.close") }],
                    { type: "error" }
                  );
                },
              });
              return;
            }

            // TODO: bước sau sẽ làm API tháo node.
            CustomAlert.alert(
              t("staff_iot.detach_requested_title"),
              t("staff_iot.detach_requested_message"),
              [{ text: t("common.close") }],
              { type: "success" }
            );
          },
        },
      ],
      { type: "warning" }
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.chevronBack size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>
          {t("staff_iot.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.houseCard}>
          <Text style={s.houseLabel}>{t("staff_iot.house_label")}</Text>
          <Text style={s.houseName} numberOfLines={2}>
            {houseName}
          </Text>
        </View>

       

        <Text style={s.sectionTitlePlain}>{t("staff_iot.devices_title")}</Text>

        <View style={s.sectionHeaderRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            <TouchableOpacity
              style={[s.chip, activeKind === "all" && s.chipActive]}
              onPress={() => setActiveKind("all")}
              activeOpacity={0.85}
            >
              <Text style={[s.chipText, activeKind === "all" && s.chipTextActive]}>
                {t("staff_iot.kind_all")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.chip, activeKind === "controller" && s.chipActive]}
              onPress={() => setActiveKind("controller")}
              activeOpacity={0.85}
            >
              <Text style={[s.chipText, activeKind === "controller" && s.chipTextActive]}>
                {t("staff_iot.kind_controller")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.chip, activeKind === "node" && s.chipActive]}
              onPress={() => setActiveKind("node")}
              activeOpacity={0.85}
            >
              <Text style={[s.chipText, activeKind === "node" && s.chipTextActive]}>
                {t("staff_iot.kind_node")}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={s.addBtn}
            onPress={() => {
              // Mở menu chọn loại thiết bị cần thêm (Controller/Node).
              setAddMenuOpen(true);
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t("staff_iot.add_btn")}
          >
            <Icons.plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={addMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAddMenuOpen(false)}
        >
          {/* Backdrop: bấm ra ngoài để đóng */}
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddMenuOpen(false)}
          >
            {/* Chặn click xuyên xuống backdrop khi bấm vào sheet */}
            <TouchableOpacity
              style={[s.modalSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
              activeOpacity={1}
              onPress={() => {}}
            >
              <Text style={s.modalTitle}>{t("staff_iot.add_menu_title")}</Text>

              <TouchableOpacity
                style={s.modalItem}
                activeOpacity={0.85}
                onPress={() => {
                  setAddMenuOpen(false);
                  navigation.navigate("StaffIotProvision", { houseId, houseName, kind: "controller" });
                }}
                accessibilityRole="button"
                accessibilityLabel={t("staff_iot.add_controller")}
              >
                <View style={s.modalItemIcon}>
                  <Icons.electric size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.modalItemTitle}>{t("staff_iot.add_controller")}</Text>
                  <Text style={s.modalItemSub} numberOfLines={2}>
                    {t("staff_iot.add_controller_sub")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalItem}
                activeOpacity={0.85}
                onPress={() => {
                  setAddMenuOpen(false);
                  navigation.navigate("StaffIotProvision", { houseId, houseName, kind: "node" });
                }}
                accessibilityRole="button"
                accessibilityLabel={t("staff_iot.add_node")}
              >
                <View style={s.modalItemIcon}>
                  <Icons.water size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.modalItemTitle}>{t("staff_iot.add_node")}</Text>
                  <Text style={s.modalItemSub} numberOfLines={2}>
                    {t("staff_iot.add_node_sub")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalCancel}
                activeOpacity={0.85}
                onPress={() => setAddMenuOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={s.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {iotLoading ? (
          <View style={s.loadingRow}>
            <Text style={s.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : activeKind === "all" ? (
          <>
            {activeController ? (
              <View
                style={[
                  s.deviceCard,
                  {
                    backgroundColor: getControllerStatusUi(activeController.status).cardBg,
                    borderColor: getControllerStatusUi(activeController.status).cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    s.deviceLeftAccent,
                    { backgroundColor: getControllerStatusUi(activeController.status).dot },
                  ]}
                />
                <View style={s.deviceInfo}>
                  <Text style={s.deviceName} numberOfLines={1}>
                    {activeController.houseName}
                  </Text>
                  <Text style={s.deviceMeta} numberOfLines={1}>
                    {t("staff_iot.controller_thing_label", { thingName: activeController.thingName })}
                  </Text>
                  <Text style={s.deviceMeta} numberOfLines={1}>
                    {t("staff_iot.controller_device_id_label", { deviceId: activeController.deviceId })}
                  </Text>
                  <Text style={s.deviceMeta} numberOfLines={1}>
                    {t("staff_iot.area_label", {
                      areaName: activeController.areaName ?? t("staff_iot.area_unassigned"),
                    })}
                  </Text>
                  <Text style={s.deviceMeta} numberOfLines={1}>
                    {t("staff_iot.status_label", { status: getControllerStatusUi(activeController.status).label })}
                  </Text>
                </View>
                <View style={s.deviceRight}>
                  <TouchableOpacity
                    style={s.detachBtn}
                    activeOpacity={0.85}
                    onPress={() => confirmDetach({ kind: "controller", name: t("staff_iot.kind_controller") })}
                    accessibilityRole="button"
                    accessibilityLabel={t("staff_iot.detach_btn")}
                  >
                    <Text style={s.detachBtnText}>{t("staff_iot.detach_btn")}</Text>
                  </TouchableOpacity>
                  <Icons.chevronForward size={20} color="#64748b" />
                </View>
              </View>
            ) : null}

            {nodes.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>
                  {t("staff_iot.empty_title", { kind: t("staff_iot.kind_node") })}
                </Text>
                <Text style={s.emptySub}>{t("staff_iot.empty_subtitle")}</Text>
              </View>
            ) : (
              nodesByArea.map((g) => (
                <View key={g.areaName}>
                  <View style={s.groupHeader}>
                    <View style={s.groupDot} />
                    <Text style={s.groupTitle} numberOfLines={1}>
                      {g.areaName}
                    </Text>
                  </View>
                  {g.devices.map((d) => (
                    <View
                      key={d.id}
                      style={[
                        s.deviceCard,
                        {
                          backgroundColor: getNodeStatusUi(d.status).cardBg,
                          borderColor: getNodeStatusUi(d.status).cardBorder,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.deviceLeftAccent,
                          { backgroundColor: getNodeStatusUi(d.status).dot },
                        ]}
                      />
                      <View style={s.deviceInfo}>
                        <Text style={s.deviceName} numberOfLines={1}>
                          {d.displayName}
                        </Text>
                        <Text style={s.deviceMeta} numberOfLines={1}>
                          {t("staff_iot.node_thing_label", { thing: d.thing })}
                        </Text>
                        <Text style={s.deviceMeta} numberOfLines={1}>
                          {t("staff_iot.node_serial_label", { serialNumber: d.serialNumber })}
                        </Text>
                        <Text style={s.deviceMeta} numberOfLines={1}>
                          {t("staff_iot.status_label", { status: d.status })}
                        </Text>
                      </View>
                      <View style={s.deviceRight}>
                        <TouchableOpacity
                          style={s.detachBtn}
                          activeOpacity={0.85}
                          onPress={() => confirmDetach({ kind: "node", name: d.displayName })}
                          accessibilityRole="button"
                          accessibilityLabel={t("staff_iot.detach_btn")}
                        >
                          <Text style={s.detachBtnText}>{t("staff_iot.detach_btn")}</Text>
                        </TouchableOpacity>
                        <Icons.chevronForward size={20} color="#64748b" />
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </>
        ) : activeKind === "controller" ? (
          activeController ? (
            <View
              style={[
                s.deviceCard,
                {
                  backgroundColor: getControllerStatusUi(activeController.status).cardBg,
                  borderColor: getControllerStatusUi(activeController.status).cardBorder,
                },
              ]}
            >
              <View
                style={[
                  s.deviceLeftAccent,
                  { backgroundColor: getControllerStatusUi(activeController.status).dot },
                ]}
              />
              <View style={s.deviceInfo}>
                <Text style={s.deviceName} numberOfLines={1}>
                  {activeController.houseName}
                </Text>
                <Text style={s.deviceMeta} numberOfLines={1}>
                  {t("staff_iot.controller_thing_label", { thingName: activeController.thingName })}
                </Text>
                <Text style={s.deviceMeta} numberOfLines={1}>
                  {t("staff_iot.controller_device_id_label", { deviceId: activeController.deviceId })}
                </Text>
                <Text style={s.deviceMeta} numberOfLines={1}>
                  {t("staff_iot.area_label", { areaName: activeController.areaName ?? t("staff_iot.area_unassigned") })}
                </Text>
                <Text style={s.deviceMeta} numberOfLines={1}>
                  {t("staff_iot.status_label", { status: getControllerStatusUi(activeController.status).label })}
                </Text>
              </View>
              <View style={s.deviceRight}>
                <TouchableOpacity
                  style={s.detachBtn}
                  activeOpacity={0.85}
                  onPress={() => confirmDetach({ kind: "controller", name: t("staff_iot.kind_controller") })}
                  accessibilityRole="button"
                  accessibilityLabel={t("staff_iot.detach_btn")}
                >
                  <Text style={s.detachBtnText}>{t("staff_iot.detach_btn")}</Text>
                </TouchableOpacity>
                <Icons.chevronForward size={20} color="#64748b" />
              </View>
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>
                {t("staff_iot.empty_title", { kind: t("staff_iot.kind_controller") })}
              </Text>
              <Text style={s.emptySub}>{t("staff_iot.empty_subtitle")}</Text>
            </View>
          )
        ) : nodes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>
              {t("staff_iot.empty_title", {
                kind: t("staff_iot.kind_node"),
              })}
            </Text>
            <Text style={s.emptySub}>{t("staff_iot.empty_subtitle")}</Text>
          </View>
        ) : (
          nodesByArea.map((g) => (
            <View key={g.areaName}>
              <View style={s.groupHeader}>
                <View style={s.groupDot} />
                <Text style={s.groupTitle} numberOfLines={1}>
                  {g.areaName}
                </Text>
              </View>
              {g.devices.map((d) => (
                <View
                  key={d.id}
                  style={[
                    s.deviceCard,
                    {
                      backgroundColor: getNodeStatusUi(d.status).cardBg,
                      borderColor: getNodeStatusUi(d.status).cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.deviceLeftAccent,
                      { backgroundColor: getNodeStatusUi(d.status).dot },
                    ]}
                  />
                  <View style={s.deviceInfo}>
                    <Text style={s.deviceName} numberOfLines={1}>
                      {d.displayName}
                    </Text>
                    <Text style={s.deviceMeta} numberOfLines={1}>
                      {t("staff_iot.node_thing_label", { thing: d.thing })}
                    </Text>
                    <Text style={s.deviceMeta} numberOfLines={1}>
                      {t("staff_iot.node_serial_label", { serialNumber: d.serialNumber })}
                    </Text>
                    <Text style={s.deviceMeta} numberOfLines={1}>
                      {t("staff_iot.status_label", { status: d.status })}
                    </Text>
                  </View>
                  <View style={s.deviceRight}>
                    <TouchableOpacity
                      style={s.detachBtn}
                      activeOpacity={0.85}
                      onPress={() => confirmDetach({ kind: "node", name: d.displayName })}
                      accessibilityRole="button"
                      accessibilityLabel={t("staff_iot.detach_btn")}
                    >
                      <Text style={s.detachBtnText}>{t("staff_iot.detach_btn")}</Text>
                    </TouchableOpacity>
                    <Icons.chevronForward size={20} color="#64748b" />
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
