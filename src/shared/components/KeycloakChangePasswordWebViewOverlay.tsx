import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  BackHandler,
  Platform,
  Keyboard,
  StatusBar,
  Linking,
} from "react-native";
import WebView, { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/useAuthStore";
import loginStyles from "../../features/screens/authentication/loginStyles";
import {
  getKeycloakRedirectUri,
  getKeycloakAcceptLanguageHeader,
  KEYCLOAK_WEBVIEW_HITBOX_REPAINT_JS,
  KEYCLOAK_WEBVIEW_VIEWPORT_HEIGHT_RESET_JS,
  finalizeChangePasswordOAuthRedirect,
  finalizeChangePasswordFromInfoPageSuccess,
} from "../services/keycloakAuth";
import { RefreshLogoOverlay } from "./RefreshLogoOverlay";
import { useAndroidKeycloakWebViewSystemUi } from "../hooks/useAndroidKeycloakWebViewSystemUi";

function normalizeAuthCallbackUrl(rawUrl: string): string {
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
}

/**
 * WebView toàn màn cho luồng đổi mật khẩu Keycloak (`kc_action=UPDATE_PASSWORD`), đồng bộ với LoginScreen.
 */
const KeycloakChangePasswordWebViewOverlay = () => {
  const { t, i18n } = useTranslation();
  const session = useAuthStore((s) => s.keycloakInAppSession);
  const setKeycloakInAppSession = useAuthStore((s) => s.setKeycloakInAppSession);

  const [webViewPageLoading, setWebViewPageLoading] = useState(true);
  const [bottomPadding, setBottomPadding] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const hardResetPaddingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRedirect = useRef(false);
  const infoPageSuccessHandled = useRef(false);

  const active =
    session != null && session.flow === "change_password" && Platform.OS !== "web";

  useAndroidKeycloakWebViewSystemUi(Boolean(active));

  useEffect(() => {
    if (active) {
      setWebViewPageLoading(true);
      infoPageSuccessHandled.current = false;
    }
  }, [active, session?.url]);

  const webViewSource = useMemo(() => {
    if (!session || session.flow !== "change_password") return undefined;
    return {
      uri: session.url,
      headers: {
        "Accept-Language": getKeycloakAcceptLanguageHeader(i18n.language),
      },
    };
  }, [session, i18n.language]);

  const closeWebViewOnRedirect = useCallback(
    (rawUrl: string) => {
      const redirectUri = getKeycloakRedirectUri();
      if (!rawUrl.startsWith(redirectUri)) {
        return false;
      }
      if (isProcessingRedirect.current) {
        return true;
      }
      isProcessingRedirect.current = true;
      const normalizedUrl = normalizeAuthCallbackUrl(rawUrl);
      setKeycloakInAppSession(null);
      void finalizeChangePasswordOAuthRedirect(normalizedUrl).finally(() => {
        isProcessingRedirect.current = false;
      });
      return true;
    },
    [setKeycloakInAppSession]
  );

  useEffect(() => {
    if (!active) return;

    const onUrl = (event: { url: string }) => {
      if (!useAuthStore.getState().keycloakInAppSession) return;
      const redirectUri = getKeycloakRedirectUri();
      const normalized = normalizeAuthCallbackUrl(event.url);
      if (normalized.startsWith(redirectUri)) {
        closeWebViewOnRedirect(normalized);
      }
    };

    const sub = Linking.addEventListener("url", onUrl);
    return () => sub.remove();
  }, [active, closeWebViewOnRedirect]);

  useEffect(() => {
    if (!active) {
      if (hardResetPaddingTimerRef.current) {
        clearTimeout(hardResetPaddingTimerRef.current);
        hardResetPaddingTimerRef.current = null;
      }
      setBottomPadding(0);
    }
  }, [active]);

  useEffect(() => {
    if (!active || Platform.OS !== "android") return;

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
  }, [active]);

  useEffect(() => {
    if (!active || Platform.OS !== "android") return;
    const onHardwareBack = () => {
      setKeycloakInAppSession(null);
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => subscription.remove();
  }, [active, setKeycloakInAppSession]);

  const handleWebViewRequest = useCallback(
    (request: { url: string }) => {
      const handled = closeWebViewOnRedirect(request.url);
      return !handled;
    },
    [closeWebViewOnRedirect]
  );

  const handleNavStateChange = useCallback(
    (navState: WebViewNavigation) => {
      closeWebViewOnRedirect(navState.url);
    },
    [closeWebViewOnRedirect]
  );

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (!useAuthStore.getState().keycloakInAppSession || infoPageSuccessHandled.current) return;
      try {
        const data = JSON.parse(event.nativeEvent.data) as { type?: string };
        if (data?.type !== "isums_kc_info_success") return;
        infoPageSuccessHandled.current = true;
        setKeycloakInAppSession(null);
        finalizeChangePasswordFromInfoPageSuccess();
      } catch {
        /* ignore */
      }
    },
    [setKeycloakInAppSession]
  );

  if (!active || !webViewSource) {
    return null;
  }

  return (
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
          onNavigationStateChange={handleNavStateChange}
          onMessage={handleWebViewMessage}
          onLoadStart={() => setWebViewPageLoading(true)}
          onLoadEnd={() => setWebViewPageLoading(false)}
          startInLoadingState={false}
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          scrollEnabled
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
          scalesPageToFit={false}
          androidLayerType="hardware"
          overScrollMode="never"
        />
        {webViewPageLoading ? (
          <View style={loginStyles.webViewLoadingOverlay} pointerEvents="none">
            <RefreshLogoOverlay visible mode="page" />
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default KeycloakChangePasswordWebViewOverlay;
