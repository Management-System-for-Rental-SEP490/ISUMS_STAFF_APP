/**
 * Đăng ký Expo push token lên BE (`POST /notifications/device-tokens`) khi
 * `EXPO_PUBLIC_NOTIFICATION_DEVICE_TOKEN_ENABLED=true`. Lỗi 404/501 → bỏ qua, không vòng lặp.
 * Logout: `unregisterStoredNotificationDeviceToken`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NOTIFICATION_DEVICE_TOKEN_ENABLED } from "../api/config";
import {
  registerNotificationDeviceToken,
  unregisterNotificationDeviceToken,
} from "./notificationApi";

const STORAGE_LAST_EXPO_PUSH = "@isums/notification-last-expo-push-token";

function platformPayload(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

export async function obtainExpoPushTokenString(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const projectIdStr = typeof projectId === "string" && projectId.length > 0 ? projectId : undefined;
    const res = await Notifications.getExpoPushTokenAsync(
      projectIdStr ? { projectId: projectIdStr } : undefined
    );
    const data = res?.data;
    return typeof data === "string" && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function registerNotificationDeviceTokenIfEnabled(): Promise<void> {
  if (!NOTIFICATION_DEVICE_TOKEN_ENABLED) return;
  if (Platform.OS === "web") return;

  const token = await obtainExpoPushTokenString();
  if (!token) return;

  const prev = await AsyncStorage.getItem(STORAGE_LAST_EXPO_PUSH);
  if (prev === token) return;

  const ok = await registerNotificationDeviceToken({
    token,
    platform: platformPayload(),
  });
  if (ok) {
    await AsyncStorage.setItem(STORAGE_LAST_EXPO_PUSH, token);
  }
}

export async function unregisterStoredNotificationDeviceToken(): Promise<void> {
  const token = await AsyncStorage.getItem(STORAGE_LAST_EXPO_PUSH);
  if (token) {
    await unregisterNotificationDeviceToken(token);
  }
  await AsyncStorage.removeItem(STORAGE_LAST_EXPO_PUSH);
}

export function subscribeExpoPushTokenRefresh(onRefresh: () => void): Notifications.EventSubscription {
  return Notifications.addPushTokenListener(() => {
    onRefresh();
  });
}
