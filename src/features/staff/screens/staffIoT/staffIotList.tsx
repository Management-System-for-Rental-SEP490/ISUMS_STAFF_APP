import React, { useCallback, useMemo, useState } from "react";
import { Text, TouchableOpacity, View, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import type {
  FunctionalAreaFromApi,
  IotControllerHouseDataFromApi,
  IotNodeDeviceFromApi,
} from "../../../../shared/types/api";
import Icons from "../../../../shared/theme/icon";
import {
  useFunctionalAreasByHouseId,
  useIotDevicesByHouseId,
  useDeprovisionIotControllerByHouseId,
  useRefreshControlGate,
  refreshControlAndroidGateProps,
} from "../../../../shared/hooks";
import { useTranslation } from "react-i18next";
import { staffIotStyles as s } from "./staffIotStyles";
import { IotAddDeviceMenuModal } from "./modals/IotAddDeviceMenuModal";
import {
  BRAND_BLUE,
  BRAND_DANGER,
  BRAND_GREEN,
  brandPrimary,
  brandSecondary,
  iotOfflineLabelColor,
} from "../../../../shared/theme/color";
import { StaffScreenActionFab } from "../../../../shared/components/StaffScreenActionFab";
import { CustomAlert } from "../../../../shared/components/alert";
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

type StaffIotListRouteProp = RouteProp<RootStackParamList, "StaffIotList">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "StaffIotList">;

type IotDeviceKind = "all" | "controller" | "node";

type StatusUiStrip = { dot: string; cardBg: string; cardBorder: string };

function StaffIotControllerCard({
  controller,
  t,
  ui,
  onPress,
  onDetach,
}: {
  controller: IotControllerHouseDataFromApi;
  t: (key: string, opts?: Record<string, string | number>) => string;
  ui: StatusUiStrip;
  onPress: () => void;
  onDetach: () => void;
}) {
  const title =
    controller.thingName?.trim() || controller.deviceId?.trim() || "—";
  return (
    <View
      style={[
        s.deviceCard,
        { backgroundColor: ui.cardBg, borderColor: ui.cardBorder },
      ]}
    >
      <View style={[s.deviceLeftAccent, { backgroundColor: ui.dot }]} />
      <TouchableOpacity
        style={s.deviceRowPressable}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <View style={s.deviceInfo}>
          <Text style={s.deviceName} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.deviceHint} numberOfLines={2}>
            {t("staff_iot.list_hint_controller")}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={s.deviceRight}>
        <TouchableOpacity
          style={s.detachBtn}
          activeOpacity={0.85}
          onPress={onDetach}
          accessibilityRole="button"
          accessibilityLabel={t("staff_iot.detach_btn")}
        >
          <Text style={s.detachBtnText}>{t("staff_iot.detach_btn")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StaffIotNodeCard({
  node: d,
  t,
  ui,
  onPress,
  onDetach,
}: {
  node: IotNodeDeviceFromApi;
  t: (key: string, opts?: Record<string, string | number>) => string;
  ui: StatusUiStrip;
  onPress: () => void;
  onDetach: () => void;
}) {
  return (
    <View
      style={[
        s.deviceCard,
        { backgroundColor: ui.cardBg, borderColor: ui.cardBorder },
      ]}
    >
      <View style={[s.deviceLeftAccent, { backgroundColor: ui.dot }]} />
      <TouchableOpacity
        style={s.deviceRowPressable}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <View style={s.deviceInfo}>
          <Text style={s.deviceName} numberOfLines={1}>
            {d.displayName}
          </Text>
          <Text style={s.deviceHint} numberOfLines={2}>
            {t("staff_iot.list_hint_node")}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={s.deviceRight}>
        <TouchableOpacity
          style={s.detachBtn}
          activeOpacity={0.85}
          onPress={onDetach}
          accessibilityRole="button"
          accessibilityLabel={t("staff_iot.detach_btn")}
        >
          <Text style={s.detachBtnText}>{t("staff_iot.detach_btn")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StaffIotListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<StaffIotListRouteProp>();
  const { houseId, houseName } = route.params;

  const [activeKind, setActiveKind] = useState<IotDeviceKind>("all");
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const {
    data: areasResp,
    isLoading: areasLoading,
    refetch: refetchAreas,
    isRefetching: areasRefetching,
  } = useFunctionalAreasByHouseId(houseId);
  const areas: FunctionalAreaFromApi[] = areasResp?.data ?? [];

  const {
    data: iotResp,
    isLoading: iotLoading,
    refetch: refetchIot,
    isRefetching: iotRefetching,
  } = useIotDevicesByHouseId(houseId);
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
          dot: brandPrimary,
          cardBg: "rgba(59,181,130,0.08)",
          cardBorder: "rgba(59,181,130,0.28)",
          badgeBg: "rgba(59,181,130,0.12)",
          badgeBorder: "rgba(59,181,130,0.38)",
          text: BRAND_GREEN,
        };
      case "OFFLINE":
        return {
          label: t("staff_iot.status_OFFLINE"),
          dot: BRAND_DANGER,
          cardBg: "rgba(220,38,38,0.06)",
          cardBorder: "rgba(220,38,38,0.25)",
          badgeBg: "rgba(220,38,38,0.10)",
          badgeBorder: "rgba(220,38,38,0.35)",
          text: iotOfflineLabelColor,
        };
      case "PENDING":
      default:
        return {
          label: status === "PENDING" ? t("staff_iot.status_PENDING") : statusRaw,
          dot: brandSecondary,
          cardBg: "rgba(32,150,216,0.08)",
          cardBorder: "rgba(32,150,216,0.28)",
          badgeBg: "rgba(32,150,216,0.12)",
          badgeBorder: "rgba(32,150,216,0.38)",
          text: BRAND_BLUE,
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

  const listRefreshing = areasRefetching || iotRefetching;
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const onPullRefresh = useCallback(() => {
    return Promise.all([refetchAreas(), refetchIot()]);
  }, [refetchAreas, refetchIot]);

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
              {t("staff_iot.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 + 72 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScrollForRefreshGate}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={listRefreshing}
            onRefresh={onPullRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
            {...refreshControlAndroidGateProps(scrollAtTop, listRefreshing)}
          />
        }
      >
        <View style={s.houseCard}>
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
        </View>

        {iotLoading ? (
          <View style={s.loadingRow}>
            <Text style={s.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : activeKind === "all" ? (
          <>
            {activeController ? (
              <StaffIotControllerCard
                controller={activeController}
                t={t}
                ui={getControllerStatusUi(activeController.status)}
                onPress={() =>
                  navigation.navigate("StaffIotDetail", {
                    houseId,
                    houseName,
                    kind: "controller",
                  })
                }
                onDetach={() =>
                  confirmDetach({ kind: "controller", name: t("staff_iot.kind_controller") })
                }
              />
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
                    <StaffIotNodeCard
                      key={d.id}
                      node={d}
                      t={t}
                      ui={getNodeStatusUi(d.status)}
                      onPress={() =>
                        navigation.navigate("StaffIotDetail", {
                          houseId,
                          houseName,
                          kind: "node",
                          nodeId: d.id,
                        })
                      }
                      onDetach={() => confirmDetach({ kind: "node", name: d.displayName })}
                    />
                  ))}
                </View>
              ))
            )}
          </>
        ) : activeKind === "controller" ? (
          activeController ? (
            <StaffIotControllerCard
              controller={activeController}
              t={t}
              ui={getControllerStatusUi(activeController.status)}
              onPress={() =>
                navigation.navigate("StaffIotDetail", {
                  houseId,
                  houseName,
                  kind: "controller",
                })
              }
              onDetach={() =>
                confirmDetach({ kind: "controller", name: t("staff_iot.kind_controller") })
              }
            />
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
                <StaffIotNodeCard
                  key={d.id}
                  node={d}
                  t={t}
                  ui={getNodeStatusUi(d.status)}
                  onPress={() =>
                    navigation.navigate("StaffIotDetail", {
                      houseId,
                      houseName,
                      kind: "node",
                      nodeId: d.id,
                    })
                  }
                  onDetach={() => confirmDetach({ kind: "node", name: d.displayName })}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <StaffScreenActionFab
        onPress={() => setAddMenuOpen(true)}
        accessibilityLabel={t("staff_iot.add_btn")}
      />

      <IotAddDeviceMenuModal
        visible={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        onAddController={() => {
          setAddMenuOpen(false);
          navigation.navigate("StaffIotProvision", {
            houseId,
            houseName,
            kind: "controller",
          });
        }}
        onAddNode={() => {
          setAddMenuOpen(false);
          navigation.navigate("StaffIotProvision", { houseId, houseName, kind: "node" });
        }}
      />
    </View>
  );
}
