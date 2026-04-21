import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./src/shared/i18n";
import Navigation from "./src/navigation/navigation";
import { GlobalAlert } from "./src/shared/components/alert";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnReconnect: true,
      /** Tắt refetch mỗi lần app lên foreground — giảm tải mạng và cảm giác “lag” khi chuyển app. */
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Navigation />
          <GlobalAlert />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
