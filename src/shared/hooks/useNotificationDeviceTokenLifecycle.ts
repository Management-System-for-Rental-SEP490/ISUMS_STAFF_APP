/**
 * Khi `enabled` (staff đăng nhập): đăng ký push token nếu flag bật; khi logout — DELETE token BE.
 * Non-blocking; không chặn splash.
 */
import { useEffect } from "react";
import {
  registerNotificationDeviceTokenIfEnabled,
  subscribeExpoPushTokenRefresh,
  unregisterStoredNotificationDeviceToken,
} from "../services/notificationPush";

export function useNotificationDeviceTokenLifecycle(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      void unregisterStoredNotificationDeviceToken();
      return;
    }

    void registerNotificationDeviceTokenIfEnabled();

    const sub = subscribeExpoPushTokenRefresh(() => {
      void registerNotificationDeviceTokenIfEnabled();
    });

    return () => {
      sub.remove();
    };
  }, [enabled]);
}
