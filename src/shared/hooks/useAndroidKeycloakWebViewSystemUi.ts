import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import type { NavigationBarButtonStyle, NavigationBarPosition } from "expo-navigation-bar";
import { isEdgeToEdge } from "react-native-is-edge-to-edge";

type SavedChrome = {
  position: NavigationBarPosition;
  backgroundColor: string;
  buttonStyle: NavigationBarButtonStyle;
};

/**
 * Android: để WebView Keycloak vẽ phía sau thanh điều hướng (edge-to-edge), tránh viền trắng.
 * Khôi phục trạng thái khi đóng WebView.
 */
export function useAndroidKeycloakWebViewSystemUi(active: boolean) {
  const savedRef = useRef<SavedChrome | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android" || !active) return;

    if (isEdgeToEdge()) {
      try {
        NavigationBar.setStyle("dark");
      } catch {
        /* ignore */
      }
      return () => {
        try {
          NavigationBar.setStyle("auto");
        } catch {
          /* ignore */
        }
      };
    }

    let cancelled = false;

    void (async () => {
      try {
        const [position, backgroundColor, buttonStyle] = await Promise.all([
          NavigationBar.unstable_getPositionAsync(),
          NavigationBar.getBackgroundColorAsync(),
          NavigationBar.getButtonStyleAsync(),
        ]);
        if (cancelled) return;
        savedRef.current = { position, backgroundColor, buttonStyle };

        await NavigationBar.setPositionAsync("absolute");
        await NavigationBar.setBackgroundColorAsync("#00000000");
        await NavigationBar.setButtonStyleAsync("light");
        try {
          NavigationBar.setStyle("dark");
        } catch {
          /* thiết bị không hỗ trợ setStyle */
        }
      } catch {
        /* Expo Go hoặc API không khả dụng */
      }
    })();

    return () => {
      cancelled = true;
      const saved = savedRef.current;
      savedRef.current = null;
      if (!saved) return;
      void (async () => {
        try {
          await NavigationBar.setPositionAsync(saved.position);
          await NavigationBar.setBackgroundColorAsync(saved.backgroundColor);
          await NavigationBar.setButtonStyleAsync(saved.buttonStyle);
        } catch {
          /* ignore */
        }
      })();
    };
  }, [active]);
}
