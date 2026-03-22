import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { RootStackParamList } from "../../../../shared/types";
import { staffIotStyles as s } from "./staffIotStyles";
import { StaffIotFlowScreenHeader } from "./staffIotFlowScreenHeader";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { neutral } from "../../../../shared/theme/color";

type RouteT = RouteProp<RootStackParamList, "StaffIotWifiPassword">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotWifiPassword">;

export default function StaffIotWifiPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind, areaId, areaName, deviceId, wifiSsid } = route.params;

  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    console.log("[StaffIotWifiPassword] ssid:", wifiSsid);
  }, [wifiSsid]);

  const onContinue = () => {
    navigation.replace("StaffIotProvisionWaiting", {
      houseId,
      houseName,
      kind,
      areaId,
      areaName,
      deviceId,
      wifiSsid,
      wifiPass: pass,
    });
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StaffIotFlowScreenHeader
        title={t("staff_iot.wifi_password_title")}
        onBack={() => navigation.goBack()}
      />

      <View style={[s.flowSection, { marginTop: 12 }]}>
        <Text style={s.flowSectionTitle}>{t("staff_iot.wifi_password_heading")}</Text>
        <Text style={s.flowSectionSub}>{t("staff_iot.wifi_password_for", { ssid: wifiSsid })}</Text>

        <View style={{ marginTop: 12 }}>
          <View style={[s.wifiPasswordInputWrap, { paddingVertical: 10 }]}>
            <TextInput
              value={pass}
              onChangeText={setPass}
              placeholder={t("staff_iot.wifi_password_placeholder")}
              placeholderTextColor={neutral.textMuted}
              autoCapitalize="none"
              secureTextEntry={!showPass}
              style={s.wifiPasswordInput}
              autoFocus
            />

            <TouchableOpacity
              onPress={() => setShowPass((v) => !v)}
              style={s.wifiPasswordToggleBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t(
                showPass ? "staff_iot.wifi_password_hide" : "staff_iot.wifi_password_show"
              )}
            >
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={neutral.iconMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={s.flowPrimaryBtn}
          onPress={onContinue}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.flowPrimaryBtnText}>{t("staff_iot.wifi_continue")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

