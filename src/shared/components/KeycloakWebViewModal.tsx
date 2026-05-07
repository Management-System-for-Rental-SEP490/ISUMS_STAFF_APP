import React, { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import type { WebViewNavigation, ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { useKeycloakWebViewStore } from "../../store/useKeycloakWebViewStore";

const HANDLED_SCHEMES = ["isumstenant://", "isumsstaff://"];

const EXTERNAL_AUTH_HOSTS = [
  "accounts.google.com",
  "accounts.youtube.com",
  "appleid.apple.com",
  "www.facebook.com",
  "m.facebook.com",
  "github.com",
  "login.microsoftonline.com",
  "login.live.com",
];

function shouldHandleRedirect(url: string, redirectUri: string): boolean {
  if (!url) return false;
  const lc = url.toLowerCase();
  if (lc.startsWith(redirectUri.toLowerCase())) return true;
  for (const scheme of HANDLED_SCHEMES) {
    if (lc.startsWith(scheme)) return true;
  }
  return false;
}

function isExternalAuthHost(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return EXTERNAL_AUTH_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

export function KeycloakWebViewModal() {
  const request = useKeycloakWebViewStore((s) => s.request);
  const finish = useKeycloakWebViewStore((s) => s.finish);
  const cancel = useKeycloakWebViewStore((s) => s.cancel);
  const webRef = useRef<WebView>(null);
  const completedRef = useRef(false);

  const handleClose = useCallback(() => {
    cancel();
  }, [cancel]);

  React.useEffect(() => {
    if (!request) {
      completedRef.current = false;
      return;
    }
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [request, handleClose]);

  const onShouldStartLoadWithRequest = useCallback(
    (req: ShouldStartLoadRequest): boolean => {
      if (!request) return true;
      if (shouldHandleRedirect(req.url, request.redirectUri)) {
        if (!completedRef.current) {
          completedRef.current = true;
          finish({ type: "success", url: req.url });
        }
        return false;
      }
      // Federated IdP (Google/Apple/Facebook/Microsoft) chặn embedded WebView vì security
      // → Mở system browser để user đăng nhập, sau đó IdP redirect ngược về
      // Keycloak (sso.isums.pro), Keycloak redirect tiếp về isumstenant://callback,
      // app's deep link handler nhận và hoàn tất auth.
      if (isExternalAuthHost(req.url)) {
        Linking.openURL(req.url).catch(() => {});
        // Đóng modal vì user giờ đang ở Chrome thật
        if (!completedRef.current) {
          completedRef.current = true;
          finish({ type: "dismiss" });
        }
        return false;
      }
      return true;
    },
    [request, finish],
  );

  const onNavigationStateChange = useCallback(
    (state: WebViewNavigation) => {
      if (!request) return;
      if (shouldHandleRedirect(state.url, request.redirectUri)) {
        if (!completedRef.current) {
          completedRef.current = true;
          finish({ type: "success", url: state.url });
        }
      }
    },
    [request, finish],
  );

  return (
    <Modal
      visible={request != null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.headerBar}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Đóng">
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>ISUMS</Text>
          <View style={styles.closeBtn} />
        </View>
        {request ? (
          <WebView
            ref={webRef}
            source={{ uri: request.url }}
            originWhitelist={["https://*", "http://*", "isumstenant://*", "isumsstaff://*"]}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onNavigationStateChange={onNavigationStateChange}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#3bb582" />
              </View>
            )}
            style={styles.webview}
            androidLayerType="hardware"
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  headerBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  closeIcon: { fontSize: 20, color: "#475569" },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  webview: { flex: 1, backgroundColor: "#ffffff" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});
