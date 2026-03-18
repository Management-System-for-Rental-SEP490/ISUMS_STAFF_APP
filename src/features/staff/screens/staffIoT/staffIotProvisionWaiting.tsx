import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, Text, TouchableOpacity, View } from "react-native";
import { RouteProp, StackActions, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Buffer } from "buffer";
import { BleManager, Device } from "react-native-ble-plx";
import Icons from "../../../../shared/theme/icon";
import type { RootStackParamList } from "../../../../shared/types";
import {
  useIotControllerByHouseId,
  useIotProvisionToken,
  useProvisionIotControllerByHouseId,
  useProvisionIotNodeByHouseId,
} from "../../../../shared/hooks";
import { CustomAlert } from "../../../../shared/components/alert";
import { staffIotStyles as s } from "./staffIotStyles";

type RouteT = RouteProp<RootStackParamList, "StaffIotProvisionWaiting">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotProvisionWaiting">;

export default function StaffIotProvisionWaitingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  const title = kind === "controller" ? t("staff_iot.provision_wait_controller_title") : t("staff_iot.provision_wait_node_title");

  const steps = useMemo(() => {
    if (kind === "controller") {
      return [
        { key: "provisioning_aws", label: t("staff_iot.ctrl_step_provisioning_aws") },
        { key: "scanning_ble", label: t("staff_iot.ctrl_step_scanning_ble") },
        { key: "connecting", label: t("staff_iot.ctrl_step_connecting") },
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

  async function scanForDevice(match: (d: Device) => boolean): Promise<Device> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bleManager.stopDeviceScan();
        reject(new Error(t("staff_iot.ble_not_found")));
      }, 15000);

      bleManager.startDeviceScan([SERVICE_UUID], { allowDuplicates: false }, (err, dev) => {
        if (err) {
          clearTimeout(timeout);
          bleManager.stopDeviceScan();
          reject(err);
          return;
        }
        if (dev && match(dev)) {
          clearTimeout(timeout);
          bleManager.stopDeviceScan();
          resolve(dev);
        }
      });
    });
  }

  async function sendChunked(device: Device, payload: string) {
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const encoded = Buffer.from(chunk).toString("base64");
      await device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, encoded);
      await new Promise((r) => setTimeout(r, 50));
    }
    const endMarker = Buffer.from("<<END>>").toString("base64");
    await device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, endMarker).catch(() => {});
  }

  const start = async () => {
    console.log("[StaffIotProvisionWaiting] start:", { houseId, kind, areaId, areaName, deviceId, wifiSsid });
    const hasBlePerm = await requestBlePermissions();
    if (!hasBlePerm) {
      CustomAlert.alert(t("common.error"), t("staff_iot.ble_permission_required"), [{ text: t("common.close") }], {
        type: "warning",
      });
      return;
    }

    try {
      if (kind === "controller") {
        if (!wifiSsid) throw new Error(t("staff_iot.wifi_required"));

        setPhase("provisioning_aws");
        const res = await provisionCtrlMutation.mutateAsync({ deviceId, areaId });
        const { thingName, certificatePem, privateKey } = res.data;
        if (!thingName || !certificatePem || !privateKey) throw new Error(t("staff_iot.provision_invalid_response"));

        setPhase("scanning_ble");
        const dev = await scanForDevice((d) => Boolean(d?.name?.startsWith("ISUMS-CTRL-")));
        setBleDeviceName(dev.name ?? null);

        setPhase("connecting");
        const connected = await dev.connect();
        await connected.discoverAllServicesAndCharacteristics();

        setPhase("sending");
        const payload = JSON.stringify({
          wifi_ssid: wifiSsid,
          wifi_pass: wifiPass ?? "",
          thing_name: thingName,
          cert: String(certificatePem).replace(/\n/g, "\\n"),
          private_key: String(privateKey).replace(/\n/g, "\\n"),
        });
        await sendChunked(connected, payload);
        await connected.cancelConnection().catch(() => {});

        setPhase("finalizing");
        CustomAlert.alert(
          t("staff_iot.provision_success_title"),
          t("staff_iot.provision_success_message"),
          [{ text: t("common.close") }],
          { type: "success" }
        );
        navigation.dispatch(StackActions.pop(3));
        return;
      }

      // kind === "node"
      setPhase("fetching_token");
      const tokenRes = await tokenMutation.mutateAsync({ serial: deviceId });
      const token = tokenRes.data.token;
      if (!token) throw new Error(t("staff_iot.node_token_missing"));

      const ctrlRes = await controllerMutation.mutateAsync();
      const ctrlMac = ctrlRes.data.deviceId;
      if (!ctrlMac) throw new Error(t("staff_iot.node_controller_missing"));

      setPhase("scanning_ble");
      const dev = await scanForDevice((d) => Boolean(d?.name?.startsWith("ISUMS-") && !d.name?.startsWith("ISUMS-CTRL-")));
      setBleDeviceName(dev.name ?? null);

      setPhase("connecting");
      const connected = await dev.connect();
      await connected.discoverAllServicesAndCharacteristics();

      setPhase("sending");
      const payload = JSON.stringify({
        serial: deviceId,
        token,
        ctrl_mac: ctrlMac,
        ap_ssid: "isums-ctrl",
      });
      const encoded = Buffer.from(payload).toString("base64");
      try {
        await connected.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, encoded);
      } catch (e: any) {
        // TestApp: node có thể reboot khiến write fail, coi như OK
        if (e?.message?.includes("write failed") || e?.message?.includes("disconnect")) {
          console.log("[PROV] node rebooting, assumed OK");
        } else {
          throw e;
        }
      }
      await connected.cancelConnection().catch(() => {});

      setPhase("finalizing");
      await provisionNodeMutation.mutateAsync({ serial: deviceId, token, areaId });

      CustomAlert.alert(
        t("staff_iot.provision_success_title"),
        t("staff_iot.provision_success_message"),
        [{ text: t("common.close") }],
        { type: "success" }
      );
      navigation.dispatch(StackActions.pop(2));
    } catch (err: any) {
      console.log("[StaffIotProvisionWaiting] error:", err);
      CustomAlert.alert(
        t("staff_iot.provision_failed_title"),
        err?.message ? String(err.message) : t("staff_iot.provision_failed_message"),
        [{ text: t("common.close") }],
        { type: "error" }
      );
    }
  };

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={s.waitTitle}>{t("staff_iot.provision_waiting_title")}</Text>
        <Text style={s.waitSub}>{t("staff_iot.provision_waiting_sub")}</Text>

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
                    done && { backgroundColor: "#16A34A" },
                    active && { backgroundColor: "#2563EB" },
                  ]}
                />
                <Text style={[s.waitStepText, (done || active) && s.waitStepTextActive]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

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
