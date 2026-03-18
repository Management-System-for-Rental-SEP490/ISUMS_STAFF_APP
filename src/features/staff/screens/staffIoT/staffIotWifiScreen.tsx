import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Icons from "../../../../shared/theme/icon";
import type { RootStackParamList } from "../../../../shared/types";
import { staffIotStyles as s } from "./staffIotStyles";
import { CustomAlert } from "../../../../shared/components/alert";

type RouteT = RouteProp<RootStackParamList, "StaffIotWifi">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotWifi">;

type WifiNetwork = { SSID: string; level: number };

function SignalBars({ level }: { level: number }) {
  const strength = level >= -50 ? 4 : level >= -65 ? 3 : level >= -75 ? 2 : 1;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 }}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={{
            width: 4,
            height: 4 + bar * 3,
            borderRadius: 1,
            backgroundColor: bar <= strength ? "#2563EB" : "rgba(100,116,139,0.35)",
          }}
        />
      ))}
    </View>
  );
}

export default function StaffIotWifiScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind, areaId, areaName, deviceId } = route.params;

  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [manualSsid, setManualSsid] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    scanWifi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scanWifi() {
    setLoading(true);
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLoading(false);
          CustomAlert.alert(t("common.error"), t("staff_iot.wifi_permission_required"), [{ text: t("common.close") }], {
            type: "warning",
          });
          return;
        }
      }
      const list = await WifiManager.loadWifiList();
      const seen = new Set<string>();
      const deduped = (list as WifiNetwork[])
        .filter((n) => {
          if (!n.SSID || seen.has(n.SSID)) return false;
          seen.add(n.SSID);
          return true;
        })
        .sort((a, b) => b.level - a.level);
      setNetworks(deduped);
    } catch (e) {
      console.log("[StaffIotWifi] scan failed:", e);
      CustomAlert.alert(t("common.error"), t("staff_iot.wifi_scan_failed"), [{ text: t("common.close") }], { type: "error" });
    }
    setLoading(false);
  }

  const onConfirmWifi = () => {
    const ssid = showManual ? manualSsid.trim() : (selected ?? "");
    if (!ssid) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_iot.wifi_select_required"),
        [{ text: t("common.close") }],
        { type: "warning" }
      );
      return;
    }
    navigation.navigate("StaffIotWifiPassword", {
      houseId,
      houseName,
      kind,
      areaId,
      areaName,
      deviceId,
      wifiSsid: ssid,
    });
  };

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
          {t("staff_iot.wifi_title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.flowScroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.flowHouseCard}>
          <Text style={s.flowHouseLabel}>{t("staff_iot.house_label")}</Text>
          <Text style={s.flowHouseName} numberOfLines={2}>
            {houseName}
          </Text>
        </View>

        <View style={s.flowSection}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.flowSectionTitle}>{t("staff_iot.wifi_pick_title")}</Text>
              <Text style={s.flowSectionSub}>{t("staff_iot.wifi_pick_subtitle")}</Text>
            </View>
            <TouchableOpacity
              style={[s.chip, { backgroundColor: "#F9FAFB" }]}
              onPress={scanWifi}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t("staff_iot.wifi_rescan")}
            >
              <Text style={[s.chipText, { color: "#2563EB" }]}>{loading ? "..." : t("staff_iot.wifi_rescan")}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.flowLoadingRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={s.flowLoadingText}>{t("staff_iot.wifi_scanning")}</Text>
            </View>
          ) : (
            <ScrollView
              style={s.wifiListBox}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {networks.map((net) => (
                <TouchableOpacity
                  key={net.SSID}
                  style={[
                    s.deviceCard,
                    selected === net.SSID && !showManual && { borderColor: "#2563EB" },
                  ]}
                  onPress={() => {
                    setSelected(net.SSID);
                    setShowManual(false);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={s.deviceInfo}>
                    <Text style={s.deviceName} numberOfLines={1}>
                      {net.SSID}
                    </Text>
                  </View>
                  <View style={[s.deviceRight, { gap: 12 }]}>
                    <SignalBars level={net.level} />
                    {selected === net.SSID && !showManual ? (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB" }} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[s.deviceCard, showManual && { borderColor: "#2563EB" }]}
                onPress={() => {
                  setShowManual(true);
                  setSelected(null);
                }}
                activeOpacity={0.85}
              >
                <View style={s.deviceInfo}>
                  <Text style={s.deviceName}>{t("staff_iot.wifi_manual")}</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          )}

          {showManual ? (
            <View style={{ marginTop: 12 }}>
              <Text style={s.flowSectionSub}>{t("staff_iot.wifi_ssid_label")}</Text>
              <TextInput
                value={manualSsid}
                onChangeText={setManualSsid}
                placeholder={t("staff_iot.wifi_ssid_placeholder")}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                style={[s.deviceCard, { paddingVertical: 10 }]}
              />
            </View>
          ) : null}

          {/* Bước 1: đã chọn WiFi nhưng CHƯA confirm -> hiện nút OK */}
          {(showManual ? manualSsid.trim() : selected) ? (
            <TouchableOpacity
              style={s.flowPrimaryBtn}
              onPress={onConfirmWifi}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={s.flowPrimaryBtnText}>{t("staff_iot.wifi_ok")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

