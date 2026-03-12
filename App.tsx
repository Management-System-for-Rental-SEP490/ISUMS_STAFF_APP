import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./src/shared/i18n";
import Navigation from "./src/navigation/navigation";
import { GlobalAlert } from "./src/shared/components/alert";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
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
