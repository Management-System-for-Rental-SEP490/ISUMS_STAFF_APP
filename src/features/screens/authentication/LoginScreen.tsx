import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
  BackHandler,
  Platform,
  Keyboard,
  StatusBar,
} from "react-native";
import WebView, { WebViewNavigation } from "react-native-webview";
import { CustomAlert as Alert } from "../../../shared/components/alert";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import loginStyles from "./loginStyles";
import { RootStackParamList } from "../../../shared/types";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  getKeycloakAuthUrl,
  getKeycloakRedirectUri,
  handleKeycloakCallback,
  exchangeCodeForToken,
  logoutKeycloak,
  getKeycloakAcceptLanguageHeader,
  KEYCLOAK_WEBVIEW_HITBOX_REPAINT_JS,
  KEYCLOAK_WEBVIEW_VIEWPORT_HEIGHT_RESET_JS,
} from "../../../shared/services/keycloakAuth";
import { brandGradient, brandPrimary } from "../../../shared/theme/color";
import { useTranslation } from "react-i18next";
import { useAndroidKeycloakWebViewSystemUi } from "../../../shared/hooks/useAndroidKeycloakWebViewSystemUi";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "AuthLogin">;

const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<LoginNavigationProp>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [webViewPageLoading, setWebViewPageLoading] = useState(true);
  /** Hard reset layout/hitbox sau IME trên Android (không dùng KeyboardAvoidingView — chỉ adjustResize). */
  const [bottomPadding, setBottomPadding] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const hardResetPaddingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessing = useRef(false);

  useAndroidKeycloakWebViewSystemUi(showWebView && Platform.OS === "android");

  useFocusEffect(
    useCallback(() => {
      isProcessing.current = false;
      setIsLoading(false);
      setWebViewPageLoading(true);
    }, [])
  );

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleDeepLink = async (event: { url: string }) => {
    const normalizeAuthCallbackUrl = (rawUrl: string): string => {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.pathname.includes("expo-development-client")) {
          const nestedUrl = parsed.searchParams.get("url");
          if (nestedUrl) {
            return decodeURIComponent(nestedUrl);
          }
        }
      } catch {
        return rawUrl;
      }
      return rawUrl;
    };

    const normalizedUrl = normalizeAuthCallbackUrl(event.url);

    if (isProcessing.current) {
      return;
    }

    const code = handleKeycloakCallback(normalizedUrl);

    if (code) {
      isProcessing.current = true;
      setIsLoading(true);
      setShowWebView(false);

      const timeoutId = setTimeout(() => {
        if (isProcessing.current) {
          isProcessing.current = false;
          setIsLoading(false);
          Alert.alert("Lỗi", "Quá thời gian đăng nhập. Vui lòng thử lại.");
        }
      }, 15000);

      try {
        const payload = await exchangeCodeForToken(code);
        clearTimeout(timeoutId);
        if (payload.role !== "technical") {
          setIsLoading(false);
          isProcessing.current = false;
          await logoutKeycloak(payload.idToken);
          Alert.alert(
            t("tenant_blocked_title"),
            t("tenant_blocked_message"),
            [{ text: t("common.close"), onPress: () => {} }],
            { type: "error" }
          );
          return;
        }
        useAuthStore.getState().login(payload);
      } catch (error) {
        clearTimeout(timeoutId);
        setIsLoading(false);
        isProcessing.current = false;
        Alert.alert(
          "Đăng nhập thất bại",
          error instanceof Error ? error.message : "Có lỗi xảy ra"
        );
      }
    } else {
      try {
        const url = new URL(normalizedUrl);
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        if (error) {
          Alert.alert("Lỗi đăng nhập", errorDescription || error);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  };

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      handleDeepLink(event);
    };

    const subscription = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  useEffect(() => {
    if (!showWebView) {
      if (hardResetPaddingTimerRef.current) {
        clearTimeout(hardResetPaddingTimerRef.current);
        hardResetPaddingTimerRef.current = null;
      }
      setBottomPadding(0);
    }
  }, [showWebView]);

  useEffect(() => {
    if (!showWebView || Platform.OS !== "android") return;

    const onKeyboardDidHide = () => {
      if (hardResetPaddingTimerRef.current) {
        clearTimeout(hardResetPaddingTimerRef.current);
        hardResetPaddingTimerRef.current = null;
      }

      webViewRef.current?.injectJavaScript(KEYCLOAK_WEBVIEW_VIEWPORT_HEIGHT_RESET_JS);
      webViewRef.current?.injectJavaScript(KEYCLOAK_WEBVIEW_HITBOX_REPAINT_JS);

      setBottomPadding(1);
      hardResetPaddingTimerRef.current = setTimeout(() => {
        setBottomPadding(0);
        hardResetPaddingTimerRef.current = null;
      }, 50);
    };

    const sub = Keyboard.addListener("keyboardDidHide", onKeyboardDidHide);
    return () => {
      sub.remove();
      if (hardResetPaddingTimerRef.current) {
        clearTimeout(hardResetPaddingTimerRef.current);
        hardResetPaddingTimerRef.current = null;
      }
    };
  }, [showWebView]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onHardwareBack = () => {
      if (showWebView) {
        setShowWebView(false);
        setAuthUrl(null);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => subscription.remove();
  }, [showWebView]);

  const webViewSource = useMemo(() => {
    if (!authUrl) return undefined;
    return {
      uri: authUrl,
      headers: {
        "Accept-Language": getKeycloakAcceptLanguageHeader(i18n.language),
      },
    };
  }, [authUrl, i18n.language]);

  const closeWebViewOnRedirect = useCallback(
    (url: string) => {
      const redirectUri = getKeycloakRedirectUri();
      if (!url.startsWith(redirectUri)) return false;
      handleDeepLink({ url });
      setShowWebView(false);
      setAuthUrl(null);
      return true;
    },
    [handleDeepLink]
  );

  const handleWebViewRequest = useCallback(
    (request: { url: string }) => {
      const handled = closeWebViewOnRedirect(request.url);
      return !handled;
    },
    [closeWebViewOnRedirect]
  );

  const handleLoginWebViewNavStateChange = useCallback(
    (navState: WebViewNavigation) => {
      closeWebViewOnRedirect(navState.url);
    },
    [closeWebViewOnRedirect]
  );

  const handleKeycloakLogin = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.open(getKeycloakAuthUrl(i18n.language), "_blank", "noopener,noreferrer");
      }
      return;
    }
    setWebViewPageLoading(true);
    setAuthUrl(getKeycloakAuthUrl(i18n.language));
    setShowWebView(true);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color={brandPrimary} />
        <Text style={{ color: "#666", textAlign: "center", marginTop: 10 }}>
          {t("common.loading")}
        </Text>
      </View>
    );
  }

  const languages = [
    { code: "vi", label: "Tiếng Việt" },
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
  ];

  return (
    <LinearGradient
      colors={[...brandGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[loginStyles.container, { flex: 1, paddingTop: insets.top }]}
    >
      <View style={[loginStyles.content, { flex: 1 }]}>
        <View style={loginStyles.logoContainer}>
          <View style={loginStyles.logoWrapper}>
            <Image
              source={require("../../../../assets/logob.png")}
              style={loginStyles.logoImage}
              accessibilityLabel="ISUMS logo"
            />
          </View>
          <Text style={loginStyles.brandTitle}>ISUMS</Text>
          <Text style={loginStyles.subtitle}>Hệ thống quản lý điều hành trực tuyến</Text>
        </View>

        <View style={loginStyles.languageContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                loginStyles.languageButton,
                i18n.language === lang.code && loginStyles.languageButtonActive,
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text
                style={[
                  loginStyles.languageText,
                  i18n.language === lang.code && loginStyles.languageTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={loginStyles.form}>
          <Text style={loginStyles.title}>{t("welcome")}</Text>
          <Text style={loginStyles.description}>{t("description")}</Text>

          <TouchableOpacity style={loginStyles.button} onPress={handleKeycloakLogin} activeOpacity={0.8}>
            <Text style={loginStyles.buttonText}>{t("login_btn")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showWebView && authUrl && webViewSource ? (
        <View style={loginStyles.webViewOverlay} collapsable={false}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <View
            style={{
              flex: 1,
              overflow: "hidden",
              paddingBottom: bottomPadding,
            }}
          >
            <WebView
              ref={webViewRef}
              style={{ flex: 1, backgroundColor: "transparent" }}
              containerStyle={{ flex: 1, backgroundColor: "transparent" }}
              contentInsetAdjustmentBehavior="never"
              source={webViewSource}
              onShouldStartLoadWithRequest={handleWebViewRequest}
              onNavigationStateChange={handleLoginWebViewNavStateChange}
              onLoadStart={() => setWebViewPageLoading(true)}
              onLoadEnd={() => setWebViewPageLoading(false)}
              startInLoadingState={false}
              setSupportMultipleWindows={false}
              nestedScrollEnabled={true}
              scrollEnabled
              keyboardDisplayRequiresUserAction={false}
              hideKeyboardAccessoryView
              scalesPageToFit={false}
              androidLayerType="hardware"
              overScrollMode="never"
            />
            {webViewPageLoading ? (
              <View style={loginStyles.webViewLoadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={brandPrimary} />
                <Text style={{ color: "#666", textAlign: "center", marginTop: 10 }}>{t("common.loading")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
};

export default LoginScreen;
