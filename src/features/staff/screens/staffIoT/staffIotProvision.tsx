import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Icons from "../../../../shared/theme/icon";
import type { RootStackParamList } from "../../../../shared/types";
import type { FunctionalAreaFromApi } from "../../../../shared/types/api";
import { useFunctionalAreasByHouseId, useIotDevicesByHouseId } from "../../../../shared/hooks";
import { CustomAlert } from "../../../../shared/components/alert";
import { staffIotStyles as s } from "./staffIotStyles";

type RouteT = RouteProp<RootStackParamList, "StaffIotProvision">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotProvision">;

export default function StaffIotProvisionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind } = route.params;

  const [selectedArea, setSelectedArea] = useState<FunctionalAreaFromApi | null>(null);

  const { data: areasResp, isLoading: areasLoading } = useFunctionalAreasByHouseId(houseId);
  const areas: FunctionalAreaFromApi[] = areasResp?.data ?? [];

  const { data: iotResp } = useIotDevicesByHouseId(houseId);
  const controller = iotResp?.data;
  const activeController = controller && controller.status !== "DEPROVISIONED" ? controller : null;
  const activeNodes = (controller?.devices ?? []).filter((d) => d.status !== "DEPROVISIONED");

  const usedAreaNames = useMemo(() => {
    const set = new Set<string>();
    if (activeController?.areaName) set.add(activeController.areaName.trim());
    for (const n of activeNodes) {
      if (n.areaName) set.add(n.areaName.trim());
    }
    return set;
  }, [activeController?.areaName, activeNodes]);

  const sortedAreas = useMemo(() => {
    const normalize = (s: string) => s.trim().toLowerCase();
    const isUsed = (a: FunctionalAreaFromApi) => {
      const name = (a.name ?? "").trim();
      if (!name) return false;
      for (const used of usedAreaNames) {
        if (normalize(used) === normalize(name)) return true;
      }
      return false;
    };

    const copy = areas.slice();
    copy.sort((a, b) => {
      const au = isUsed(a);
      const bu = isUsed(b);
      if (au === bu) return a.name.localeCompare(b.name);
      return au ? 1 : -1; // unused first
    });
    return copy;
  }, [areas, usedAreaNames]);

  const title = kind === "controller" ? t("staff_iot.provision_controller_title") : t("staff_iot.provision_node_title");

  return (
    <View style={s.container}>
      <View style={[s.flowTopBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.flowBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Icons.chevronBack size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={s.flowTopTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          s.flowScroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.flowHouseCard}>
          <Text style={s.flowHouseLabel}>{t("staff_iot.house_label")}</Text>
          <Text style={s.flowHouseName} numberOfLines={2}>
            {houseName}
          </Text>
        </View>

        <View style={s.flowSection}>
          <Text style={s.flowSectionTitle}>{t("staff_iot.provision_step_area_title")}</Text>
          <Text style={s.flowSectionSub}>{t("staff_iot.provision_step_area_sub")}</Text>

          {areasLoading ? (
            <View style={s.flowLoadingRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={s.flowLoadingText}>{t("common.loading")}</Text>
            </View>
          ) : sortedAreas.length === 0 ? (
            <View style={s.flowEmptyCard}>
              <Text style={s.flowEmptyTitle}>{t("staff_iot.areas_empty")}</Text>
            </View>
          ) : (
            <View style={s.flowAreaGrid}>
              {sortedAreas.map((a) => {
                const isSelected = selectedArea?.id === a.id;
                const isSuggested = !usedAreaNames.has(a.name.trim());
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      s.flowAreaChip,
                      isSelected && s.flowAreaChipActive,
                    ]}
                    onPress={() => setSelectedArea(a)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        s.flowAreaChipText,
                        isSelected && s.flowAreaChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {a.name}
                    </Text>
                    {isSuggested ? (
                      <Text style={s.flowAreaChipHint} numberOfLines={1}>
                        {t("staff_iot.provision_area_suggested")}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={s.flowPrimaryBtn}
            onPress={() => {
              if (!selectedArea) {
                CustomAlert.alert(
                  t("common.error"),
                  t("staff_iot.provision_select_area_required"),
                  [{ text: t("common.close") }],
                  { type: "warning" }
                );
                return;
              }
              navigation.navigate("StaffIotQrScan", {
                houseId,
                houseName,
                kind,
                areaId: selectedArea.id,
                areaName: selectedArea.name,
              });
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.flowPrimaryBtnText}>{t("staff_iot.provision_open_camera")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
