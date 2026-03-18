import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import Icons from "../../../../shared/theme/icon";
import type { RootStackParamList } from "../../../../shared/types";
import { staffIotStyles as s } from "./staffIotStyles";
import { CustomAlert } from "../../../../shared/components/alert";

type RouteT = RouteProp<RootStackParamList, "StaffIotQrScan">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotQrScan">;

export default function StaffIotQrScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind, areaId, areaName } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    console.log("[StaffIotQrScan] params:", { houseId, houseName, kind, areaId, areaName });
  }, [houseId, houseName, kind, areaId, areaName]);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onQrScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    const raw = data ?? "";
    const trimmed = raw.trim();
    console.log("[StaffIotQrScan] scanned raw:", raw);
    console.log("[StaffIotQrScan] scanned trimmed:", trimmed);

    if (!trimmed) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_iot.provision_qr_required"),
        [{ text: t("common.close"), onPress: () => setScanned(false) }],
        { type: "warning" }
      );
      return;
    }

    // TestApp: Node QR thường là JSON { serial: "..." }
    // Controller QR thường là chuỗi deviceId/MAC; một số trường hợp cũng có thể là JSON.
    let parsedDeviceId = trimmed;
    try {
      const obj = JSON.parse(trimmed);
      const candidate =
        obj?.deviceId || obj?.device_id || obj?.mac || obj?.serial || obj?.Serial || obj?.SERIAL;
      if (typeof candidate === "string" && candidate.trim()) {
        parsedDeviceId = candidate.trim();
      }
      console.log("[StaffIotQrScan] parsed JSON:", obj);
      console.log("[StaffIotQrScan] parsed deviceId:", parsedDeviceId);
    } catch {
      // not JSON: keep raw trimmed
    }

    setScanned(true);
    if (kind === "controller") {
      navigation.replace("StaffIotWifi", {
        houseId,
        houseName,
        kind: "controller",
        areaId,
        areaName,
        deviceId: parsedDeviceId,
      });
      return;
    }

    navigation.replace("StaffIotProvisionWaiting", {
      houseId,
      houseName,
      kind,
      areaId,
      areaName,
      deviceId: parsedDeviceId,
    });
  };

  return (
    <View style={s.qrContainer}>
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
          {t("staff_iot.provision_scan_qr_title")}
        </Text>
      </View>

      {permission && !permission.granted ? (
        <View style={s.qrPermissionWrap}>
          <Text style={s.qrPermissionText}>{t("camera.no_permission")}</Text>
          <TouchableOpacity
            style={s.flowPrimaryBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.flowPrimaryBtnText}>{t("camera.grant_permission")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={scanned ? undefined : onQrScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={s.qrOverlay}>
            <View style={s.qrCard}>
              <Text style={s.qrCardTitle}>{t("staff_iot.provision_scan_qr_title")}</Text>
              <Text style={s.qrCardSub} numberOfLines={2}>
                {t("staff_iot.provision_scan_qr_sub")}
              </Text>
            </View>
            <TouchableOpacity
              style={s.qrCancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={s.qrCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
