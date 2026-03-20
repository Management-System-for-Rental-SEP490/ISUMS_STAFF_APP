import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./src/shared/i18n";
import Navigation from "./src/navigation/navigation";
import { GlobalAlert } from "./src/shared/components/alert";

const queryClient = new QueryClient({ /* cấu hình defaultOptions cho tất cả queries */
  defaultOptions: {
    queries: {
      retry: 2, /* retry 2 lần nếu request thất bại */
      staleTime: 1000 * 60 * 5, /* 5 phút */
      refetchOnReconnect: true, /* refetch khi mạng trở lại */
      refetchOnWindowFocus: true, /* refetch khi app active */
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Navigation />
        <GlobalAlert />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
