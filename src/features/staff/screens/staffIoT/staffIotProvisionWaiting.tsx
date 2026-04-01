import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, Text, TouchableOpacity, View } from "react-native";
import { RouteProp, StackActions, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Buffer } from "buffer";
import { BleManager, Device } from "react-native-ble-plx";
import type { RootStackParamList } from "../../../../shared/types";
import {
  useIotControllerByHouseId,
  useIotProvisionToken,
  useProvisionIotControllerByHouseId,
  useProvisionIotNodeByHouseId,
} from "../../../../shared/hooks";
import { CustomAlert } from "../../../../shared/components/alert";
import { staffIotStyles as s } from "./staffIotStyles";
import { StaffIotFlowScreenHeader } from "./staffIotFlowScreenHeader";
import { brandPrimary } from "../../../../shared/theme/color";
import { iotProvSeqFail, iotProvSeqLog } from "./iotProvisionSequenceLog";

type RouteT = RouteProp<RootStackParamList, "StaffIotProvisionWaiting">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotProvisionWaiting">;

export default function StaffIotProvisionWaitingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind, areaId, areaName, deviceId, wifiSsid, wifiPass } = route.params;

  const provisionCtrlMutation = useProvisionIotControllerByHouseId(houseId);
  const provisionNodeMutation = useProvisionIotNodeByHouseId(houseId);
  const tokenMutation = useIotProvisionToken();
  const controllerMutation = useIotControllerByHouseId(houseId);

  const [phase, setPhase] = useState<
    | "starting"
    | "provisioning_aws"
    | "fetching_token"
    | "scanning_ble"
    | "connecting"
    | "sending"
    | "finalizing"
  >("starting");

  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);

  const bleManager = useMemo(() => new BleManager(), []);

  const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc"; 
  const CHAR_UUID = "abcd1234-ab12-ab12-ab12-abcdef123456";
  const CHUNK_SIZE = 400;

  const cancelRequestedRef = useRef(false);
  const activeBleDeviceRef = useRef<Device | null>(null);
  const throwIfCancelled = () => {
    if (cancelRequestedRef.current) throw new Error("__CANCELLED__");
  };

  const title = kind === "controller" ? t("staff_iot.provision_wait_controller_title") : t("staff_iot.provision_wait_node_title");

  const steps = useMemo(() => {
    if (kind === "controller") {
      return [
        { key: "scanning_ble", label: t("staff_iot.ctrl_step_scanning_ble") },
        { key: "connecting", label: t("staff_iot.ctrl_step_connecting") },
        { key: "provisioning_aws", label: t("staff_iot.ctrl_step_provisioning_aws") },
        { key: "sending", label: t("staff_iot.ctrl_step_sending") },
        { key: "finalizing", label: t("staff_iot.provision_wait_step_finalize") },
      ] as const;
    }
    return [
      { key: "fetching_token", label: t("staff_iot.node_step_fetching_token") },
      { key: "scanning_ble", label: t("staff_iot.node_step_scanning_ble") },
      { key: "connecting", label: t("staff_iot.node_step_connecting") },
      { key: "sending", label: t("staff_iot.node_step_sending") },
      { key: "finalizing", label: t("staff_iot.provision_wait_step_finalize") },
    ] as const;
  }, [kind, t]);

  async function requestBlePermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(grants).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }

  const getPhaseUi = (p: typeof phase): { title: string; sub: string } => {
    switch (p) {
      case "scanning_ble":
        return {
          title: t("staff_iot.wait_phase_scan_title"),
          sub: t("staff_iot.wait_phase_scan_sub"),
        };
      case "connecting":
        return {
          title: t("staff_iot.wait_phase_connect_title"),
          sub: t("staff_iot.wait_phase_connect_sub"),
        };
      case "provisioning_aws":
        return {
          title: t("staff_iot.wait_phase_aws_title"),
          sub: t("staff_iot.wait_phase_aws_sub"),
        };
      case "sending":
        return {
          title: t("staff_iot.wait_phase_send_title"),
          sub: t("staff_iot.wait_phase_send_sub"),
        };
      case "fetching_token":
        return {
          title: t("staff_iot.wait_phase_token_title"),
          sub: t("staff_iot.wait_phase_token_sub"),
        };
      case "finalizing":
        return {
          title: t("staff_iot.wait_phase_finalize_title"),
          sub: t("staff_iot.wait_phase_finalize_sub"),
        };
      case "starting":
      default:
        return {
          title: t("staff_iot.provision_waiting_title"),
          sub: t("staff_iot.provision_waiting_sub"),
        };
    }
  };

  const describeError = (p: typeof phase, err: any): string => {
    const status = err?.response?.status ?? err?.status;
    const rawFromResponse =
      typeof err?.response?.data?.message === "string"
        ? err.response.data.message
        : typeof err?.response?.data === "string"
          ? err.response.data
          : undefined;
    const raw = rawFromResponse ?? (err?.message ? String(err.message) : "");

    const technicalLines: string[] = [];
    technicalLines.push(`${t("staff_iot.wait_error_technical_phase")}: ${p}`);
    if (typeof status === "number") {
      technicalLines.push(`${t("staff_iot.wait_error_technical_status")}: ${status}`);
    }
    if (raw) {
      technicalLines.push(`${t("staff_iot.wait_error_technical_raw")}: ${raw}`);
    }
    const technicalBlock = technicalLines.length
      ? `\n\n${t("staff_iot.wait_error_details")}\n${technicalLines.join("\n")}`
      : "";

    if (status === 409) {
      return `${t("staff_iot.wait_error_409")}${technicalBlock}`;
    }

    switch (p) {
      case "scanning_ble":
        return `${t("staff_iot.wait_error_ble_scan")}${technicalBlock}`;
      case "connecting":
        return `${t("staff_iot.wait_error_ble_connect")}${technicalBlock}`;
      case "provisioning_aws":
        return `${t("staff_iot.wait_error_aws")}${technicalBlock}`;
      case "sending":
        return `${t("staff_iot.wait_error_send")}${technicalBlock}`;
      case "fetching_token":
        return `${t("staff_iot.wait_error_token")}${technicalBlock}`;
      case "finalizing":
        return `${t("staff_iot.wait_error_finalize")}${technicalBlock}`;
      default:
        return `${t("staff_iot.provision_failed_message")}${technicalBlock}`;
    }
  };

  async function scanForDevice(match: (d: Device) => boolean): Promise<Device> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        bleManager.stopDeviceScan();
        reject(new Error(t("staff_iot.ble_not_found")));
      }, 15000);

      bleManager.startDeviceScan([SERVICE_UUID], { allowDuplicates: false }, (err, dev) => {
        if (settled) return;
        if (cancelRequestedRef.current) {
          settled = true;
          bleManager.stopDeviceScan();
          reject(new Error("__CANCELLED__"));
          return;
        }
        if (err) {
          settled = true;
          clearTimeout(timeout);
          bleManager.stopDeviceScan();
          reject(err);
          return;
        }
        if (dev && match(dev)) {
          settled = true;
          clearTimeout(timeout);
          bleManager.stopDeviceScan();
          resolve(dev);
        }
      });
    });
  }

  async function sendChunked(device: Device, payload: string) {
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      throwIfCancelled();
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const encoded = Buffer.from(chunk).toString("base64");
      await device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, encoded);
      await new Promise((r) => setTimeout(r, 50));
    }
    throwIfCancelled();
    const endMarker = Buffer.from("<<END>>").toString("base64");
    await device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, endMarker).catch(() => {});
  }

  const start = async () => {
    console.log("[StaffIotProvisionWaiting] start:", { houseId, kind, areaId, areaName, deviceId, wifiSsid });
    cancelRequestedRef.current = false;
    const hasBlePerm = await requestBlePermissions();
    if (!hasBlePerm) {
      CustomAlert.alert(t("common.error"), t("staff_iot.wait_error_ble_permission"), [{ text: t("common.close") }], {
        type: "warning",
      });
      return;
    }

    let lastPhase: typeof phase = "starting";
    /** Bước log (1-based) để map lỗi — controller 5 bước chính, node 6 bước */
    let seqStep = 0;
    const CTRL_STEPS = 5;
    const NODE_STEPS = 6;

    try {
      if (kind === "controller") {
        const ssid = typeof wifiSsid === "string" ? wifiSsid.trim() : "";
        const pass = typeof wifiPass === "string" ? wifiPass : "";
        if (!ssid) throw new Error(t("staff_iot.wifi_required"));
        if (!String(deviceId ?? "").trim()) throw new Error(t("staff_iot.provision_qr_required"));

        seqStep = 1;
        lastPhase = "scanning_ble";
        setPhase("scanning_ble");
        iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 1: ĐK đủ — đã có SSID/pass từ màn WiFi; quét BLE tìm ISUMS-CTRL-*", {
          ssid,
          passLength: pass.length,
          deviceId: String(deviceId).slice(0, 12),
        });
        const dev = await scanForDevice((d) => Boolean(d?.name?.startsWith("ISUMS-CTRL-")));
        throwIfCancelled();
        setBleDeviceName(dev.name ?? null);
        iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 1 xong: đã tìm thấy controller", { name: dev.name });

        seqStep = 2;
        lastPhase = "connecting";
        setPhase("connecting");
        iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 2: kết nối BLE + discover services/characteristics");
        const bleHandle = await dev.connect();
        activeBleDeviceRef.current = bleHandle;
        throwIfCancelled();
        await bleHandle.discoverAllServicesAndCharacteristics();
        throwIfCancelled();
        const bleOk = await bleHandle.isConnected();
        if (!bleOk) {
          throw new Error(t("staff_iot.wait_error_ble_connect"));
        }
        iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 2 xong: BLE đã kết nối (isConnected=true)");

        try {
          seqStep = 3;
          lastPhase = "provisioning_aws";
          setPhase("provisioning_aws");
          iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 3: CHỈ BÂY GIỜ mới gọi API AWS provision — sau bước 1–2 và đã có SSID/pass", {
            ssid,
          });
          const res = await provisionCtrlMutation.mutateAsync({ deviceId, areaId });
          throwIfCancelled();
          const { thingName, certificatePem, privateKey } = res.data;
          if (!thingName || !certificatePem || !privateKey) throw new Error(t("staff_iot.provision_invalid_response"));
          iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 3 xong: AWS đã trả thing_name + cert + private_key");

          seqStep = 4;
          lastPhase = "sending";
          setPhase("sending");
          iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 4: gửi payload (wifi + cert) xuống thiết bị qua BLE");
          const payload = JSON.stringify({
            wifi_ssid: ssid,
            wifi_pass: pass,
            thing_name: thingName,
            cert: String(certificatePem).replace(/\n/g, "\\n"),
            private_key: String(privateKey).replace(/\n/g, "\\n"),
          });
          await sendChunked(bleHandle, payload);
          iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 4 xong: đã gửi xong payload BLE");
        } finally {
          await bleHandle.cancelConnection().catch(() => {});
          if (activeBleDeviceRef.current === bleHandle) activeBleDeviceRef.current = null;
        }

        seqStep = 5;
        lastPhase = "finalizing";
        setPhase("finalizing");
        iotProvSeqLog("controller", seqStep, CTRL_STEPS, "Bước 5: hoàn tất UI / quay lại danh sách");
        CustomAlert.alert(
          t("staff_iot.provision_success_title"),
          t("staff_iot.provision_success_message"),
          [{ text: t("common.close") }],
          { type: "success" }
        );
        activeBleDeviceRef.current = null;
        navigation.dispatch(StackActions.pop(3));
        return;
      }

      // kind === "node" — token + ctrl_mac cần trước để build payload BLE; API đăng ký node chỉ sau khi gửi BLE xong
      if (!String(deviceId ?? "").trim()) throw new Error(t("staff_iot.provision_qr_required"));

      seqStep = 1;
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 1: kiểm tra serial/nodeId, quyền BLE đã có");
      lastPhase = "fetching_token";
      setPhase("fetching_token");
      seqStep = 2;
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 2: lấy token từ server (chuẩn bị payload — CHƯA đăng ký node lên AWS/backend)");
      const tokenRes = await tokenMutation.mutateAsync({ serial: deviceId });
      throwIfCancelled();
      const token = tokenRes.data.token;
      if (!token) throw new Error(t("staff_iot.node_token_missing"));
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 2 xong: đã có token");

      seqStep = 3;
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 3: lấy deviceId controller (ctrl_mac) từ server");
      const ctrlRes = await controllerMutation.mutateAsync();
      throwIfCancelled();
      const ctrlMac = ctrlRes.data.deviceId;
      if (!ctrlMac) throw new Error(t("staff_iot.node_controller_missing"));
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 3 xong: đã có ctrl_mac", { ctrlMac: String(ctrlMac).slice(0, 12) });

      seqStep = 4;
      lastPhase = "scanning_ble";
      setPhase("scanning_ble");
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 4: quét BLE, tìm node ISUMS-* (không phải CTRL)");
      const dev = await scanForDevice((d) => Boolean(d?.name?.startsWith("ISUMS-") && !d.name?.startsWith("ISUMS-CTRL-")));
      throwIfCancelled();
      setBleDeviceName(dev.name ?? null);
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 4 xong: đã tìm thấy node", { name: dev.name });

      seqStep = 5;
      lastPhase = "connecting";
      setPhase("connecting");
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 5: kết nối BLE + discover");
      const connected = await dev.connect();
      activeBleDeviceRef.current = connected;
      throwIfCancelled();
      await connected.discoverAllServicesAndCharacteristics();
      throwIfCancelled();
      if (!(await connected.isConnected())) {
        throw new Error(t("staff_iot.wait_error_ble_connect"));
      }
      iotProvSeqLog("node", seqStep, NODE_STEPS, "Bước 5 xong: BLE đã kết nối");

      lastPhase = "sending";
      setPhase("sending");
      iotProvSeqLog("node", 6, NODE_STEPS, "Bước 6a: ghi payload (serial, token, ctrl_mac) xuống thiết bị qua BLE");
      const payload = JSON.stringify({
        serial: deviceId,
        token,
        ctrl_mac: ctrlMac,
        ap_ssid: "isums-ctrl",
      });
      const encoded = Buffer.from(payload).toString("base64");
      let bleWriteOk = false;
      try {
        try {
          await connected.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, encoded);
          throwIfCancelled();
          bleWriteOk = true;
        } catch (e: any) {
          if (e?.message?.includes("write failed") || e?.message?.includes("disconnect")) {
            console.log("[IOT_PROV_SEQ] [node] Bước 6a: write lỗi do reboot — coi như đã gửi xong");
            bleWriteOk = true;
          } else {
            throw e;
          }
        }
        if (!bleWriteOk) {
          throw new Error(t("staff_iot.wait_error_send"));
        }
        iotProvSeqLog("node", 6, NODE_STEPS, "Bước 6a xong: payload BLE đã xử lý xong");
      } finally {
        await connected.cancelConnection().catch(() => {});
        if (activeBleDeviceRef.current === connected) activeBleDeviceRef.current = null;
      }

      lastPhase = "finalizing";
      setPhase("finalizing");
      iotProvSeqLog("node", 6, NODE_STEPS, "Bước 6b: CHỈ BÂY GIỜ mới gọi API đăng ký / đồng bộ node lên server (sau BLE)");
      throwIfCancelled();
      await provisionNodeMutation.mutateAsync({ serial: deviceId, token, areaId });
      iotProvSeqLog("node", 6, NODE_STEPS, "Bước 6b xong: server đã nhận provision node");

      CustomAlert.alert(
        t("staff_iot.provision_success_title"),
        t("staff_iot.provision_success_message"),
        [{ text: t("common.close") }],
        { type: "success" }
      );
      activeBleDeviceRef.current = null;
      navigation.dispatch(StackActions.pop(2));
    } catch (err: any) {
      console.log("[StaffIotProvisionWaiting] error:", err);
      if (cancelRequestedRef.current || err?.message === "__CANCELLED__") {
        return;
      }
      if (kind === "controller") {
        iotProvSeqFail("controller", seqStep, CTRL_STEPS, lastPhase, err);
      } else {
        iotProvSeqFail("node", seqStep, NODE_STEPS, lastPhase, err);
      }
      const msg = describeError(lastPhase, err);
      CustomAlert.alert(
        t("staff_iot.provision_failed_title"),
        msg,
        [{ text: t("common.close") }],
        { type: "error" }
      );
    }
  };

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    cancelRequestedRef.current = true;
    bleManager.stopDeviceScan();
    activeBleDeviceRef.current?.cancelConnection().catch(() => {});
    activeBleDeviceRef.current = null;
    navigation.navigate("StaffIotList", { houseId, houseName });
  };

  return (
    <View style={s.container}>
      <StaffIotFlowScreenHeader title={title} onBack={() => navigation.goBack()} />

      <View style={s.waitInfoCard}>
        <View style={s.waitRowBetween}>
          <Text style={s.waitLabel}>{t("staff_iot.provision_wait_house")}</Text>
          <Text style={s.waitValue} numberOfLines={1}>
            {houseName}
          </Text>
        </View>
        <View style={s.waitRowBetween}>
          <Text style={s.waitLabel}>{t("staff_iot.provision_wait_area")}</Text>
          <Text style={s.waitValue} numberOfLines={1}>
            {areaName}
          </Text>
        </View>
        {bleDeviceName ? (
          <View style={s.waitRowBetween}>
            <Text style={s.waitLabel}>{t("staff_iot.ble_device_label")}</Text>
            <Text style={s.waitValue} numberOfLines={1}>
              {bleDeviceName}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={s.waitWrap}>
        <ActivityIndicator size="large" color={brandPrimary} />
        <Text style={s.waitTitle}>{getPhaseUi(phase).title}</Text>
        <Text style={s.waitSub}>{getPhaseUi(phase).sub}</Text>

        <View style={s.waitStepList}>
          {steps.map((step) => {
            const idx = steps.findIndex((x) => x.key === step.key);
            const activeIdx = steps.findIndex((x) => x.key === phase);
            const done = activeIdx > idx;
            const active = phase === step.key;
            return (
              <View key={step.key} style={s.waitStepRow}>
                <View
                  style={[
                    s.waitStepDot,
                    done && { backgroundColor: brandPrimary },
                    active && { backgroundColor: brandPrimary },
                  ]}
                />
                <Text style={[s.waitStepText, (done || active) && s.waitStepTextActive]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {!provisionCtrlMutation.isError && !provisionNodeMutation.isError ? (
          <TouchableOpacity
            style={s.waitCancelBtn}
            onPress={handleCancel}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.waitCancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        ) : null}

        {(provisionCtrlMutation.isError || provisionNodeMutation.isError) ? (
          <TouchableOpacity
            style={s.waitRetryBtn}
            onPress={() => start()}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.waitRetryText}>{t("common.try_again")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
