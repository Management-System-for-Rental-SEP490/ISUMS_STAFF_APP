import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { CustomAlert as Alert } from "../../../shared/components/alert";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import loginStyles from "./loginStyles";
import { RootStackParamList } from "../../../shared/types";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  KEYCLOAK_CONFIG,
  signInWithDirectGrant,
  logoutKeycloak,
} from "../../../shared/services/keycloakAuth";
import { signInWithAppAuth } from "../../../shared/services/keycloakAppAuth";
import { brandGradient, brandSecondary, neutral } from "../../../shared/theme/color";
import { RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";

type LoginFormNavigationProp = NativeStackNavigationProp<RootStackParamList, "AuthLoginForm">;

const LoginFormScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<LoginFormNavigationProp>();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (submitting || googleLoading) return;
    setErrorMsg("");
    if (!username.trim() || !password) {
      setErrorMsg(t("login_validation_required"));
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const payload = await signInWithDirectGrant(username, password, i18n.language);
      if (payload.role !== "technical") {
        await logoutKeycloak(payload.idToken);
        Alert.alert(
          t("non_technical_blocked_title"),
          t("non_technical_blocked_message"),
          [{ text: t("common.close"), onPress: () => {} }],
          { type: "error" },
        );
        return;
      }
      useAuthStore.getState().login(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("login_failed");
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (submitting || googleLoading) return;
    setErrorMsg("");
    Keyboard.dismiss();
    setGoogleLoading(true);
    try {
      const payload = await signInWithAppAuth(i18n.language, "google");
      if (payload.role !== "technical") {
        await logoutKeycloak(payload.idToken);
        Alert.alert(
          t("non_technical_blocked_title"),
          t("non_technical_blocked_message"),
          [{ text: t("common.close"), onPress: () => {} }],
          { type: "error" },
        );
        return;
      }
      useAuthStore.getState().login(payload);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (!/cancel|denied|user.*close/i.test(raw)) {
        setErrorMsg(raw || t("login_failed"));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const url = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/login-actions/reset-credentials?client_id=${encodeURIComponent(
      KEYCLOAK_CONFIG.clientId,
    )}&kc_locale=${encodeURIComponent(i18n.language || "vi")}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("common.error"), t("cannot_open_link"));
    }
  };

  if (submitting) {
    return (
      <View style={{ flex: 1, position: "relative", backgroundColor: "#fff" }}>
        <RefreshLogoOverlay visible mode="page" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...brandGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[loginStyles.container, { flex: 1, paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            loginFormStyles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={loginFormStyles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={loginFormStyles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={t("common.back")}
            >
              <Ionicons name="chevron-back" size={26} color={neutral.surface} />
            </TouchableOpacity>
          </View>

          <View style={loginFormStyles.brandRow}>
            <View style={loginFormStyles.smallLogoWrap}>
              <Image
                source={require("../../../../assets/logob.png")}
                style={loginFormStyles.smallLogo}
                accessibilityLabel="ISUMS logo"
              />
            </View>
            <Text style={loginStyles.brandTitle}>ISUMS</Text>
          </View>

          <View style={loginStyles.form}>
            <Text style={loginStyles.title}>{t("login_btn")}</Text>
            <Text style={loginStyles.description}>{t("description")}</Text>

            <View style={loginFormStyles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={20}
                color={neutral.slate500}
                style={loginFormStyles.leftIcon}
              />
              <TextInput
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder={t("username_placeholder")}
                placeholderTextColor={neutral.slate500}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={loginFormStyles.input}
                editable={!submitting && !googleLoading}
              />
            </View>

            <View style={loginFormStyles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={neutral.slate500}
                style={loginFormStyles.leftIcon}
              />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder={t("password_placeholder")}
                placeholderTextColor={neutral.slate500}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={[loginFormStyles.input, { paddingRight: 48 }]}
                editable={!submitting && !googleLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={loginFormStyles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={showPassword ? t("hide_password") : t("show_password")}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={neutral.slate500}
                />
              </TouchableOpacity>
            </View>

            {errorMsg ? <Text style={loginFormStyles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={[loginStyles.button, (submitting || googleLoading) && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting || googleLoading}
            >
              {submitting ? (
                <ActivityIndicator color={neutral.surface} />
              ) : (
                <Text style={loginStyles.buttonText}>{t("login_btn_short")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={loginFormStyles.forgotBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={loginFormStyles.forgotText}>{t("forgot_password")}</Text>
            </TouchableOpacity>

            <View style={loginFormStyles.divider}>
              <View style={loginFormStyles.dividerLine} />
              <Text style={loginFormStyles.dividerText}>{t("or")}</Text>
              <View style={loginFormStyles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[loginFormStyles.googleBtn, (submitting || googleLoading) && { opacity: 0.7 }]}
              onPress={handleGoogleLogin}
              activeOpacity={0.85}
              disabled={submitting || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={brandSecondary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#1E2D28" />
                  <Text style={loginFormStyles.googleBtnText}>{t("login_with_google")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const loginFormStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  brandRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  smallLogoWrap: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: neutral.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  smallLogo: {
    width: 64,
    height: 64,
    resizeMode: "contain",
  },
  inputWrap: {
    width: "100%",
    position: "relative",
    marginBottom: 16,
  },
  leftIcon: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    height: 60,
    textAlignVertical: "center",
    zIndex: 1,
  },
  input: {
    width: "100%",
    height: 60,
    paddingLeft: 48,
    paddingRight: 16,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: neutral.slate200,
    color: neutral.slate900,
    fontSize: 16,
    fontWeight: "500",
  },
  eyeBtn: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    height: 60,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "500",
    marginTop: -4,
    marginBottom: 10,
    textAlign: "center",
  },
  forgotBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 4,
  },
  forgotText: {
    color: brandSecondary,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  divider: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: neutral.slate200,
  },
  dividerText: {
    color: neutral.slate500,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  googleBtn: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    backgroundColor: neutral.surface,
    borderWidth: 1.5,
    borderColor: neutral.slate200,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  googleBtnText: {
    color: "#1E2D28",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default LoginFormScreen;
