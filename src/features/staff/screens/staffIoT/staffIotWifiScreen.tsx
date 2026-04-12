import React, { useCallback, useState } from "react";
import {
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type Permission,
} from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { RootStackParamList } from "../../../../shared/types";
import { staffIotStyles as s } from "./staffIotStyles";
import { StaffIotFlowScreenHeader } from "./staffIotFlowScreenHeader";
import { brandPrimary } from "../../../../shared/theme/color";
import { CustomAlert } from "../../../../shared/components/alert";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";

type RouteT = RouteProp<RootStackParamList, "StaffIotWifi">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotWifi">;

type WifiNetwork = {
  SSID: string;
  level: number;
  /**
   * react-native-wifi-reborn thường có thêm `frequency` (MHz) và `capabilities`,
   * nhưng type dự án hiện không khai báo nên mình bổ sung để lọc 2.4G chuẩn hơn.
   */
  frequency?: number;
  capabilities?: string;
};

function isAndroidWifiNativeLinked(): boolean {
  if (Platform.OS !== "android") return false;
  return (
    WifiManager != null &&
    typeof WifiManager.reScanAndLoadWifiList === "function" &&
    typeof WifiManager.loadWifiList === "function"
  );
}

function isAndroidWifiNativeBridgeError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /reScanAndLoadWifiList/.test(msg) || /Cannot read propert(?:y|ies).*of null/i.test(msg);
}

function dedupeSortNetworks(list: WifiNetwork[]): WifiNetwork[] {
  const seen = new Set<string>();
  return list
    .filter((n) => {
      const id = n.SSID?.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => b.level - a.level);
}

function is24GNetwork(n: WifiNetwork): boolean {
  // 2.4G thường nằm trong khoảng ~2400-2500 MHz.
  if (typeof n.frequency === "number" && Number.isFinite(n.frequency)) {
    return n.frequency >= 2400 && n.frequency <= 2500;
  }

  // Fallback: cố gắng đoán từ SSID/capabilities.
  const ssid = String(n.SSID ?? "").toLowerCase();
  const caps = String(n.capabilities ?? "").toLowerCase();

  // Nếu có dấu hiệu 5G rõ ràng thì loại.
  const looks5g =
    /\b5g\b/.test(ssid) ||
    ssid.includes("5ghz") ||
    ssid.includes("5g") ||
    caps.includes("5g") ||
    caps.includes("5ghz");
  if (looks5g) return false;

  // Nếu có dấu hiệu 2.4G rõ ràng thì giữ.
  const looks24g =
    ssid.includes("2.4") ||
    ssid.includes("24g") ||
    ssid.includes("2g") ||
    ssid.includes("2.4ghz") ||
    caps.includes("2.4") ||
    caps.includes("24g");
  if (looks24g) return true;

  // Nếu không đủ thông tin để phân biệt thì loại để đảm bảo đúng 2.4G.
  return false;
}

/**
 * Android: quét WiFi bắt buộc ACCESS_FINE_LOCATION (thư viện native kiểm tra fine, không đủ coarse).
 * Xin kèm COARSE (Android 12+) để hộp thoại hệ thống đầy đủ; xác nhận bằng `check(FINE)` vì `requestMultiple` đôi khi lệch OEM.
 * API 33+: thêm NEARBY_WIFI_DEVICES (từ chối nearby vẫn có thể quét nếu đã có fine).
 */
async function ensureAndroidWifiScanPermissions(): Promise<boolean> {
  const api =
    typeof Platform.Version === "number"
      ? Platform.Version
      : parseInt(String(Platform.Version), 10) || 0;

  const fineP = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarseP = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const nearbyP = PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES;

  if (await PermissionsAndroid.check(fineP)) {
    if (api >= 33) {
      await PermissionsAndroid.request(nearbyP);
    }
    return true;
  }

  const perms: Permission[] = [fineP, coarseP];
  if (api >= 33) {
    perms.push(nearbyP);
  }

  await PermissionsAndroid.requestMultiple(perms);

  if (await PermissionsAndroid.check(fineP)) {
    return true;
  }

  const second = await PermissionsAndroid.request(fineP);
  if (second === PermissionsAndroid.RESULTS.GRANTED || (await PermissionsAndroid.check(fineP))) {
    return true;
  }

  return false;
}

/**
 * Android: `reScanAndLoadWifiList` gọi startScan() rồi đợi kết quả — phù hợp khi SSID đổi tên.
 * Nếu hệ thống từ chối quét mới (giới hạn Android 9+), fallback `loadWifiList` (cache).
 */
async function androidFetchWifiList(): Promise<WifiNetwork[]> {
  const rawUnknown: unknown = await WifiManager.reScanAndLoadWifiList();
  if (typeof rawUnknown === "string") {
    const cached = (await WifiManager.loadWifiList()) as WifiNetwork[];
    const filtered = cached.filter(is24GNetwork);
    return dedupeSortNetworks(filtered);
  }
  const list = rawUnknown as WifiNetwork[];
  const filtered = list.filter(is24GNetwork);
  return dedupeSortNetworks(filtered);
}

function isAndroidLocationServicesOffError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code ?? "") : "";
  const msg = e instanceof Error ? e.message : String(e);
  return (
    code === "locationServicesOff" ||
    /location service/i.test(msg) ||
    /turned off/i.test(msg)
  );
}

function isAndroidLocationPermissionMissingError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code ?? "") : "";
  const msg = e instanceof Error ? e.message : String(e);
  return (
    code === "locationPermissionMissing" ||
    /ACCESS_FINE_LOCATION|not granted|location permission/i.test(msg)
  );
}

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
            backgroundColor: bar <= strength ? brandPrimary : "rgba(100,116,139,0.35)",
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

  /** Mỗi lần vào màn (kể cả instance cũ trong stack) đều quét lại → SSID đổi tên (ABC→DEF) dễ thấy đúng. */
  useFocusEffect(
    useCallback(() => {
      scanWifi();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- scanWifi dùng setter + t ổn định cho màn này
    }, [])
  );

  async function scanWifi() {
    setLoading(true);
    try {
      if (Platform.OS === "android") {
        if (!isAndroidWifiNativeLinked()) {
          setLoading(false);
          CustomAlert.alert(
            t("common.error"),
            t("staff_iot.wifi_native_module_missing"),
            [{ text: t("common.close") }],
            { type: "error" }
          );
          return;
        }
        const granted = await ensureAndroidWifiScanPermissions();
        if (!granted) {
          /**
           * Đôi khi Cài đặt đã bật "Vị trí chính xác" nhưng PermissionsAndroid.check/request vẫn báo chưa đủ.
           * Thử quét qua native (cùng kiểm tra với react-native-wifi-reborn) — nếu thành công thì không hiện lỗi giả.
           */
          try {
            const deduped = await androidFetchWifiList();
            setNetworks(deduped);
            setSelected((prev) => {
              if (prev == null) return null;
              return deduped.some((n) => n.SSID === prev) ? prev : null;
            });
          } catch (e) {
            console.log("[StaffIotWifi] scan after JS permission check failed:", e);
            setLoading(false);
            if (isAndroidLocationServicesOffError(e)) {
              CustomAlert.alert(
                t("common.error"),
                t("staff_iot.wifi_location_services_required"),
                [{ text: t("common.close") }],
                { type: "error" }
              );
            } else if (isAndroidLocationPermissionMissingError(e)) {
              CustomAlert.alert(
                t("common.error"),
                t("staff_iot.wifi_permission_required"),
                [
                  { text: t("common.close") },
                  {
                    text: t("staff_iot.wifi_open_app_settings"),
                    onPress: () => {
                      void Linking.openSettings();
                    },
                  },
                ],
                { type: "warning" }
              );
            } else {
              CustomAlert.alert(
                t("common.error"),
                t("staff_iot.wifi_scan_failed"),
                [{ text: t("common.close") }],
                { type: "error" }
              );
            }
            return;
          }
          setLoading(false);
          return;
        }
        const deduped = await androidFetchWifiList();
        setNetworks(deduped);
        setSelected((prev) => {
          if (prev == null) return null;
          return deduped.some((n) => n.SSID === prev) ? prev : null;
        });
      } else {
        setNetworks([]);
      }
    } catch (e) {
      console.log("[StaffIotWifi] scan failed:", e);
      const body = isAndroidLocationServicesOffError(e)
        ? t("staff_iot.wifi_location_services_required")
        : Platform.OS === "android" && isAndroidWifiNativeBridgeError(e)
          ? t("staff_iot.wifi_native_module_missing")
          : t("staff_iot.wifi_scan_failed");
      CustomAlert.alert(t("common.error"), body, [{ text: t("common.close") }], { type: "error" });
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
      <StaffIotFlowScreenHeader
        title={t("staff_iot.wifi_title")}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          s.flowScroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.flowHouseCard}>
          
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
              <Text style={[s.chipText, { color: brandPrimary }]}>{loading ? "..." : t("staff_iot.wifi_rescan")}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.flowLoadingRow}>
              <RefreshLogoInline logoPx={20} />
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
                    selected === net.SSID && !showManual && { borderColor: brandPrimary },
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
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brandPrimary }} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[s.deviceCard, showManual && { borderColor: brandPrimary }]}
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

