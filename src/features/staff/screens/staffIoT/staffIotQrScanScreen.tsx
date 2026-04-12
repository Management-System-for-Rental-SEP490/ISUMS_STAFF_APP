import React, { useEffect, useMemo, useState } from "react";
import { StatusBar, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import Icons from "../../../../shared/theme/icon";
import type { RootStackParamList } from "../../../../shared/types";
import { staffIotStyles as s } from "./staffIotStyles";
import { CustomAlert } from "../../../../shared/components/alert";
import { useCameraPinchZoom } from "../../../../shared/hooks/useCameraPinchZoom";

type RouteT = RouteProp<RootStackParamList, "StaffIotQrScan">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotQrScan">;

type IotQrFlowKind = "controller" | "node";

function firstNonEmptyString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

/**
 * QR JSON: `type` = CONTROLLER / controller / ctrl → controller; NODE / node → node.
 * Không có `type` (hoặc rỗng) → mặc định **node** (QR node thường không gửi type).
 * QR không phải object JSON (MAC thuần, v.v.) → cũng coi là **node**.
 */
function normalizeQrDeclaredKind(typeRaw: unknown): "controller" | "node" | "absent" | "unknown" {
  if (typeof typeRaw !== "string" || !typeRaw.trim()) return "absent";
  const n = typeRaw.trim().toLowerCase();
  if (n === "controller" || n === "ctrl") return "controller";
  if (n === "node") return "node";
  return "unknown";
}

function mismatchKindMessage(expectedKind: IotQrFlowKind): ParseStaffIotQrResult {
  if (expectedKind === "controller") {
    return { ok: false, messageKey: "provision_qr_wrong_kind_need_controller" };
  }
  return { ok: false, messageKey: "provision_qr_wrong_kind_need_node" };
}

type ParseStaffIotQrResult =
  | { ok: true; deviceId: string }
  | {
      ok: false;
      messageKey:
        | "provision_qr_required"
        | "provision_qr_wrong_kind_need_controller"
        | "provision_qr_wrong_kind_need_node"
        | "provision_qr_type_unknown";
      messageParams?: Record<string, string>;
    };

function parseStaffIotQrPayload(trimmed: string, expectedKind: IotQrFlowKind): ParseStaffIotQrResult {
  if (!trimmed) {
    return { ok: false, messageKey: "provision_qr_required" };
  }

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const deviceId = firstNonEmptyString(
        obj.id,
        obj.deviceId,
        obj.device_id,
        obj.mac,
        obj.serial,
        obj.Serial,
        obj.SERIAL
      );

      const typeSource = obj.type ?? obj.deviceType ?? obj.device_type;
      const declared = normalizeQrDeclaredKind(typeSource);

      if (declared === "unknown") {
        const label =
          typeof typeSource === "string" && typeSource.trim()
            ? typeSource.trim()
            : String(typeSource ?? "?");
        return {
          ok: false,
          messageKey: "provision_qr_type_unknown",
          messageParams: { type: label },
        };
      }

      const inferredKind: IotQrFlowKind = declared === "absent" ? "node" : declared;

      if (inferredKind !== expectedKind) {
        return mismatchKindMessage(expectedKind);
      }

      if (!deviceId) {
        return { ok: false, messageKey: "provision_qr_required" };
      }

      return { ok: true, deviceId };
    }
  } catch {
    // Không parse được JSON → coi như node (MAC/serial thuần).
  }

  if (expectedKind === "controller") {
    return mismatchKindMessage("controller");
  }

  return { ok: true, deviceId: trimmed };
}

export default function StaffIotQrScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind, areaId, areaName } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const { zoom, pinchGesture } = useCameraPinchZoom();
  const [scanned, setScanned] = useState(false);

  const frameLayout = useMemo(() => {
    const maxSide = Math.min(winW, winH);
    const squareSize = Math.round(Math.min(maxSide * 0.72, 320));
    const left = Math.round((winW - squareSize) / 2);
    const bottomReserved = 72 + Math.max(insets.bottom, 16);
    const topReserved = insets.top + 52;
    const verticalSpace = winH - topReserved - bottomReserved - squareSize;
    const top = Math.round(topReserved + Math.max(0, verticalSpace / 2));
    return { squareSize, left, top };
  }, [winW, winH, insets.top, insets.bottom]);

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

    const parsed = parseStaffIotQrPayload(trimmed, kind);
    if (!parsed.ok) {
      CustomAlert.alert(
        t("common.error"),
        parsed.messageParams
          ? t(`staff_iot.${parsed.messageKey}`, parsed.messageParams)
          : t(`staff_iot.${parsed.messageKey}`),
        [{ text: t("common.close"), onPress: () => setScanned(false) }],
        { type: "warning" }
      );
      return;
    }

    const parsedDeviceId = parsed.deviceId;
    console.log("[StaffIotQrScan] deviceId:", parsedDeviceId, "flow:", kind);

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

  const { squareSize, left, top } = frameLayout;
  const cancelBottomPad = Math.max(insets.bottom, 12) + 12;

  return (
    <View style={s.qrContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {permission && !permission.granted ? (
        <View style={[s.qrPermissionWrap, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12 }}>
            <TouchableOpacity
              style={s.qrBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
            >
              <Icons.chevronBack size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
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
        </View>
      ) : (
        <>
          <GestureDetector gesture={pinchGesture}>
            <View style={{ flex: 1 }}>
              <CameraView
                style={{ flex: 1 }}
                zoom={zoom}
                onBarcodeScanned={scanned ? undefined : onQrScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              />
            </View>
          </GestureDetector>

          <View style={s.qrScanMaskRoot} pointerEvents="box-none">
            <View
              pointerEvents="none"
              style={[s.qrDimLayer, { left: 0, right: 0, top: 0, height: top }]}
            />
            <View
              pointerEvents="none"
              style={[
                s.qrDimLayer,
                {
                  left: 0,
                  right: 0,
                  top: top + squareSize,
                  bottom: 0,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[s.qrDimLayer, { left: 0, width: left, top, height: squareSize }]}
            />
            <View
              pointerEvents="none"
              style={[
                s.qrDimLayer,
                {
                  left: left + squareSize,
                  right: 0,
                  top,
                  height: squareSize,
                },
              ]}
            />
            <View
              style={[
                s.qrFrameOutline,
                {
                  left,
                  top,
                  width: squareSize,
                  height: squareSize,
                },
              ]}
              pointerEvents="none"
            />
          </View>

          <View style={[s.qrTopBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <TouchableOpacity
              style={s.qrBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
            >
              <Icons.chevronBack size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={[s.qrBottomBar, { paddingBottom: cancelBottomPad }]} pointerEvents="box-none">
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
