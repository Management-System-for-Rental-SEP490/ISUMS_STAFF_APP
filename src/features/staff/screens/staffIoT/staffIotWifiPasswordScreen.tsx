import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Icons from "../../../../shared/theme/icon";
import type { RootStackParamList } from "../../../../shared/types";
import { staffIotStyles as s } from "./staffIotStyles";

type RouteT = RouteProp<RootStackParamList, "StaffIotWifiPassword">;
type NavT = NativeStackNavigationProp<RootStackParamList, "StaffIotWifiPassword">;

export default function StaffIotWifiPasswordScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { houseId, houseName, kind, areaId, areaName, deviceId, wifiSsid } = route.params;

  const [pass, setPass] = useState("");

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
          {t("staff_iot.wifi_password_title")}
        </Text>
      </View>

      <View style={[s.flowSection, { marginTop: 12 }]}>
        <Text style={s.flowSectionTitle}>{t("staff_iot.wifi_password_heading")}</Text>
        <Text style={s.flowSectionSub}>{t("staff_iot.wifi_password_for", { ssid: wifiSsid })}</Text>

        <View style={{ marginTop: 12 }}>
          <TextInput
            value={pass}
            onChangeText={setPass}
            placeholder={t("staff_iot.wifi_password_placeholder")}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            secureTextEntry
            style={[s.deviceCard, { paddingVertical: 10 }]}
            autoFocus
          />
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

