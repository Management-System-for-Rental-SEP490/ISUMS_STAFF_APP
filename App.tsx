import React from "react";
import { Modal, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./src/shared/i18n";
import Navigation from "./src/navigation/navigation";
import { GlobalAlert } from "./src/shared/components/alert";
import { useAuthStore } from "./src/store/useAuthStore";
import { RefreshLogoOverlay } from "./src/shared/components/RefreshLogoOverlay";
import { neutral } from "./src/shared/theme/color";
import { KeycloakWebViewModal } from "./src/shared/components/KeycloakWebViewModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnReconnect: true,
      /** Tắt refetch mỗi lần app lên foreground — giảm tải mạng và cảm giác “lag” khi chuyển app. */
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const logoutCoverStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.background },
});

/** Modal native full-screen — che Navigator trong lúc đăng xuất SSO (logoutUiLocked). */
function LogoutRouteCoverPortal() {
  const logoutUiLocked = useAuthStore(
    (s) => Boolean((s as Record<string, unknown>)["logoutUiLocked"])
  );
  return (
    <Modal
      visible={logoutUiLocked}
      animationType="none"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <View style={logoutCoverStyles.root}>
        <RefreshLogoOverlay visible mode="page" />
      </View>
    </Modal>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Navigation />
          <GlobalAlert />
          <LogoutRouteCoverPortal />
          <KeycloakWebViewModal />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
