import { Linking, Platform } from "react-native";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import InAppBrowser from "react-native-inappbrowser-reborn";
import { AuthPayload, UserRole } from "../types";
import { useAuthStore } from "../../store/useAuthStore";
import { CustomAlert } from "../components/alert";
import i18n from "../i18n";
import type { GetUserProfileOptions } from "./userProfileDirectApi";
import { getUserProfileWithAccessToken } from "./userProfileDirectApi";
import {
  AUTH_PROFILE_FETCH_TIMEOUT_MS,
  KEYCLOAK_HTTP_TIMEOUT_MS,
} from "../api/config";

// Đảm bảo WebBrowser hoạt động đúng trên Web
WebBrowser.maybeCompleteAuthSession();

// Lấy base URL Keycloak - ưu tiên biến môi trường cho mọi nền tảng
const getKeycloakBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_KEYCLOAK_BASE_URL) {
    return process.env.EXPO_PUBLIC_KEYCLOAK_BASE_URL;
  }
  if (Platform.OS === "web") {
    return "http://localhost:8080";
  }
  return "https://sso.isums.pro";
};

// Cấu hình Keycloak
const KEYCLOAK_CONFIG = {
  get baseUrl() {
    return getKeycloakBaseUrl();
  },
  //realm: "isums-realm",
  realm: process.env.EXPO_PUBLIC_KEYCLOAK_REALM || "isums",
  clientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || "mobile-staff-app",
  get redirectUri() {
    if (Platform.OS === 'web') {
      return process.env.EXPO_PUBLIC_KEYCLOAK_REDIRECT_WEB || "http://localhost/callback";
    }
    return process.env.EXPO_PUBLIC_KEYCLOAK_REDIRECT_NATIVE || "isumsstaff://callback";
  },
};

// Helper export để so khớp redirect URI với callback (deep link / InAppBrowser.openAuth).
export const getKeycloakRedirectUri = (): string => {
  return KEYCLOAK_CONFIG.redirectUri;
};

export const KEYCLOAK_WEBVIEW_ANDROID_KEYBOARD_SYNC_JS =
  "(function(){try{var r=document.documentElement;var inset=0;if(window.visualViewport){var vv=window.visualViewport;inset=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));}r.style.setProperty('--isums-keyboard-inset',inset+'px');if(typeof window.__isumsSyncKeyboardInset==='function')window.__isumsSyncKeyboardInset();window.dispatchEvent(new Event('resize'));void document.body.offsetHeight;window.scrollTo(window.scrollX,window.scrollY+1);window.scrollTo(window.scrollX,window.scrollY-1);}catch(e){}})();true;";

export const KEYCLOAK_WEBVIEW_HITBOX_REPAINT_JS =
  "(function(){try{window.scrollTo(window.scrollX,window.scrollY+1);window.scrollTo(window.scrollX,window.scrollY-1);}catch(e){}})();true;";

export const KEYCLOAK_WEBVIEW_VIEWPORT_HEIGHT_RESET_JS =
  "(function(){try{document.documentElement.style.height='100.1%';setTimeout(function(){document.documentElement.style.height='100%';},50);}catch(e){}})();true;";

export type KeycloakInAppBrowserMode = "oauth" | "browse";

export const KEYCLOAK_IN_APP_BROWSER_OPTIONS = {
  showTitle: false,
  enableUrlBarHiding: true,
  enableDefaultShare: false,
  showInRecents: false,
  dismissButtonStyle: "close" as const,
  ephemeralWebSession: false,
  enableBarCollapsing: true,
  forceCloseOnRedirection: true,
};

function dismissInAppBrowser(): void {
  try {
    InAppBrowser.close();
    InAppBrowser.closeAuth();
  } catch {
    /* noop */
  }
}

export async function beginKeycloakInAppSession(
  initialUrl: string,
  options?: {
    allowManualClose?: boolean;
    onAppRedirect?: (url: string) => Promise<void>;
    browserMode?: KeycloakInAppBrowserMode;
  }
): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.open(initialUrl, "_blank", "noopener,noreferrer");
    }
    return;
  }

  dismissInAppBrowser();

  const available = await InAppBrowser.isAvailable();
  if (!available) {
    const can = await Linking.canOpenURL(initialUrl);
    if (can) await Linking.openURL(initialUrl);
    return;
  }

  const browserMode = options?.browserMode ?? "oauth";

  if (browserMode === "browse") {
    await InAppBrowser.open(initialUrl, { ...KEYCLOAK_IN_APP_BROWSER_OPTIONS });
    return;
  }

  const redirectUri = getKeycloakRedirectUri();
  const result = await InAppBrowser.openAuth(initialUrl, redirectUri, KEYCLOAK_IN_APP_BROWSER_OPTIONS);

  if (result.type === "success" && result.url.startsWith(redirectUri) && options?.onAppRedirect) {
    await options.onAppRedirect(result.url);
  }
}

export function keycloakInAppUserDismissed(): void {
  dismissInAppBrowser();
}

function buildLogoutUrl(idToken?: string | null): string {
  const base = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/logout`;
  const params = new URLSearchParams();
  params.append("post_logout_redirect_uri", KEYCLOAK_CONFIG.redirectUri);
  if (idToken) {
    params.append("id_token_hint", idToken);
  } else {
    params.append("client_id", KEYCLOAK_CONFIG.clientId);
  }
  return `${base}?${params.toString()}`;
}

/** Keycloak chỉ khớp theme khi dùng mã ngắn vi | en | ja (vd. vi-VN → vi). */
export function normalizeKeycloakLocale(locale?: string | null): "vi" | "en" | "ja" {
  const raw = locale != null ? String(locale).trim().toLowerCase() : "";
  if (!raw) return "vi";
  if (raw.startsWith("vi")) return "vi";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("en")) return "en";
  return "vi";
}

export function getKeycloakAcceptLanguageHeader(locale?: string | null): string {
  const k = normalizeKeycloakLocale(locale);
  if (k === "vi") return "vi,vi-VN;q=0.95,en;q=0.35";
  if (k === "ja") return "ja,ja-JP;q=0.95,en;q=0.35";
  return "en,vi;q=0.4";
}

// Tạo URL authorization để chuyển hướng đến Keycloak login - tạo link và mở trình duyệt
export const getKeycloakAuthUrl = (locale?: string): string => {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    redirect_uri: KEYCLOAK_CONFIG.redirectUri,
    response_type: "code",
    scope: "openid email profile",
  });

  const resolvedLocale = normalizeKeycloakLocale(locale);
  params.append("kc_locale", resolvedLocale);
  params.append("ui_locales", resolvedLocale);

  return `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/auth?${params.toString()}`;
};

export const KEYCLOAK_STORAGE_REMEMBER_ME = "isums_keycloak_remember_me";
export const KEYCLOAK_STORAGE_LAST_USERNAME = "isums_keycloak_last_username";

export function appendKeycloakAuthLoginHint(authUrl: string, loginHint?: string | null): string {
  const hint = loginHint?.trim();
  if (!hint) return authUrl;
  try {
    const u = new URL(authUrl);
    if (!u.searchParams.has("login_hint")) {
      u.searchParams.set("login_hint", hint);
    }
    return u.toString();
  } catch {
    return authUrl;
  }
}

export async function openKeycloakAuthorizationInAppBrowser(locale?: string) {
  const authUrl = getKeycloakAuthUrl(locale);
  const redirectUri = getKeycloakRedirectUri();
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.open(authUrl, "_blank", "noopener,noreferrer");
    }
    return { type: "dismiss" as const };
  }

  dismissInAppBrowser();
  const available = await InAppBrowser.isAvailable();
  if (!available) {
    const can = await Linking.canOpenURL(authUrl);
    if (can) await Linking.openURL(authUrl);
    return { type: "dismiss" as const };
  }

  return InAppBrowser.openAuth(authUrl, redirectUri, KEYCLOAK_IN_APP_BROWSER_OPTIONS);
}

// Trao đổi authorization code lấy access token
export const exchangeCodeForToken = async (code: string): Promise<AuthPayload> => {
  const tokenUrl = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;

  console.log("[Keycloak] Đổi code lấy token - URL:", tokenUrl);
  console.log("[Keycloak] Redirect URI:", KEYCLOAK_CONFIG.redirectUri);

  try {
    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KEYCLOAK_CONFIG.clientId,
        code: code,
        redirect_uri: KEYCLOAK_CONFIG.redirectUri,
      }),
      {
        timeout: KEYCLOAK_HTTP_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, id_token } = response.data; // Lấy thêm id_token

    // --- DEBUG LOG ---
    console.log("====== KEYCLOAK TOKEN DEBUG ======");
    console.log("Access Token nhận được từ App:", access_token);
    const debugClaims = decodeJWT(access_token);
    console.log("Token Issuer (iss):", debugClaims?.iss);
    console.log("Token Audience (aud):", debugClaims?.aud);
    console.log("User config IP:", getKeycloakBaseUrl());
    console.log("==================================");
    // -----------------

    const userInfo = await getUserInfo(access_token);
    const role = await resolveStaffAppRoleFromBackend(access_token, {
      timeoutMs: AUTH_PROFILE_FETCH_TIMEOUT_MS,
    });

    // Extract houseId from attributes (Keycloak usually returns attributes as arrays)
    let houseId: string | undefined;
    const rawHouseId = userInfo.attributes?.houseId || userInfo.houseId;
    if (Array.isArray(rawHouseId)) {
      houseId = rawHouseId[0];
    } else if (typeof rawHouseId === "string") {
      houseId = rawHouseId;
    }

    return {
      username: userInfo.preferred_username || userInfo.name || "user",
      role: role,
      token: access_token,
      refreshToken: refresh_token,
      idToken: id_token, // Trả về idToken
      houseId: houseId,
    };
  } catch (error: any) {
    console.error("[Keycloak] Lỗi exchangeCodeForToken:", error?.response?.data || error?.message || error);
    const errorMessage = error.response?.data?.error_description 
      || error.response?.data?.error 
      || error.message 
      || "Không thể lấy token từ Keycloak";
    throw new Error(`Lỗi đăng nhập: ${errorMessage}`);
  }
};
// ... getUserInfo, decodeJWT (debug), resolveStaffAppRoleFromBackend ...

// ... openKeycloakLogin, handleKeycloakCallback, openAccountManagement ...


// Lấy thông tin user từ Keycloak userinfo endpoint
//Giống API get user
const getUserInfo = async (accessToken: string) => {
  const userInfoUrl = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/userinfo`;
  const response = await axios.get(userInfoUrl, {
    timeout: KEYCLOAK_HTTP_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

// Decode JWT token (không verify signature, chỉ để lấy claims)
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];//split là hàm để tách chuỗi thành một mảng các chuỗi con, dấu chấm là dấu phân tách.
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); //JWT gồm 3 phần tách bởi dấu chấm (header.payload.signature). Ta lấy phần giữa là payload.
    const jsonPayload = decodeURIComponent(
      atob(base64) //Chuyển đổi từ định dạng Base64Url (dùng trong URL) về Base64 chuẩn.
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};
// Chi tiết từng phần nhỏ:
// .map((c) => ...): Duyệt qua từng ký tự c trong chuỗi đã giải mã từ atob.
// c.charCodeAt(0): Lấy mã ASCII/Unicode của ký tự đó (số nguyên).
// .toString(16): Chuyển mã số đó sang hệ thập lục phân (hex). Vd: 65 -> "41".
// '00' + ...: Thêm số 0 vào đầu để đảm bảo luôn đủ độ dài (padding).
// .slice(-2): Cắt lấy 2 ký tự cuối cùng.
// Ví dụ: Nếu mã hex là a, nối thành 00a, cắt đuôi được 0a.
// Ví dụ: Nếu mã hex là 41, nối thành 0041, cắt đuôi được 41.
// => Đảm bảo luôn là chuỗi hex 2 ký tự (byte).
// '%' + ...: Thêm dấu % vào trước. Kết quả có dạng %41, %C3, %A9...
/** Chuẩn hóa tên role từ BE (GET /api/users/me). */
function normalizeRoleId(raw: string): string {
  return String(raw).trim().toUpperCase().replace(/-/g, "_").replace(/\//g, "_");
}

/**
 * Có quyền staff app (thợ/kỹ thuật) theo mảng `roles` từ BE. Không đọc JWT Keycloak.
 * Tránh false positive kiểu "NOT_TECHNICAL".
 */
function impliesStaffAppTechnicalRole(roleNames: string[]): boolean {
  return roleNames.some((raw) => {
    const u = normalizeRoleId(raw);
    if (u === "TENANT") return false;
    return (
      u === "TECHNICAL_STAFF" ||
      u === "TECHNICAL" ||
      u.startsWith("TECHNICAL_") ||
      u.endsWith("_TECHNICAL") ||
      u.includes("_TECHNICAL_")
    );
  });
}

/**
 * Role ứng dụng staff: chỉ từ GET /api/users/me — không dùng realm_access / resource_access / groups Keycloak.
 */
async function resolveStaffAppRoleFromBackend(
  accessToken: string,
  profileOptions?: Pick<GetUserProfileOptions, "apiBase" | "timeoutMs">
): Promise<UserRole> {
  const profile = await getUserProfileWithAccessToken(accessToken, profileOptions);
  if (!profile) {
    throw new Error(
      "Không lấy được hồ sơ người dùng (GET /api/users/me). Kiểm tra mạng, URL API và token."
    );
  }
  const beRoles = profile.roles;
  if (beRoles?.length && impliesStaffAppTechnicalRole(beRoles)) {
    return "technical";
  }
  return "tenant";
}

// Làm mới token bằng refresh token
export const refreshAccessToken = async (refreshToken: string): Promise<AuthPayload> => {
  try {
    const tokenUrl = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;

    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: KEYCLOAK_CONFIG.clientId,
        refresh_token: refreshToken,
      }),
      {
        timeout: KEYCLOAK_HTTP_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token: new_refresh_token, id_token } = response.data;
    const userInfo = await getUserInfo(access_token);
    const role = await resolveStaffAppRoleFromBackend(access_token, {
      timeoutMs: AUTH_PROFILE_FETCH_TIMEOUT_MS,
    });

    // Extract houseId
    let houseId: string | undefined;
    const rawHouseId = userInfo.attributes?.houseId || userInfo.houseId;
    if (Array.isArray(rawHouseId)) {
      houseId = rawHouseId[0];
    } else if (typeof rawHouseId === "string") {
      houseId = rawHouseId;
    }

    return {
      username: userInfo.preferred_username || userInfo.name || "user",
      role: role,
      token: access_token,
      // Keycloak có thể trả về refresh token mới hoặc không (nếu cấu hình Refresh Token Rotation)
      // Nếu không có mới, dùng lại cái cũ
      refreshToken: new_refresh_token || refreshToken,
      idToken: id_token,
      houseId: houseId,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.error_description
      || error.response?.data?.error
      || error.message
      || "Không thể làm mới token";
    throw new Error(`Lỗi làm mới token: ${errorMessage}`);
  }
};

// Mở Keycloak login page trong browser
export const openKeycloakLogin = async (locale?: string): Promise<WebBrowser.WebBrowserAuthSessionResult | null> => {
  try {
    const authUrl = getKeycloakAuthUrl(locale);
    const redirectUrl = KEYCLOAK_CONFIG.redirectUri;

    // Trên web, mở trong tab mới
    if (Platform.OS === 'web') {
      window.open(authUrl, '_blank');
      return null;
    }
    
    // Trên mobile, dùng expo-web-browser
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    return result;

  } catch (error: any) {
    throw new Error(`Không thể mở trang đăng nhập: ${error.message || error}`);
  }
};

// Xử lý callback URL từ Keycloak
export const handleKeycloakCallback = (url: string): string | null => {
  try {
    // Xử lý cả string và object
    let urlString = url;
    if (typeof url === 'object' && 'url' in url && typeof (url as any).url === 'string') {
      urlString = (url as any).url;
    }
    
    const parsedUrl = new URL(urlString);
    const code = parsedUrl.searchParams.get("code");
    const error = parsedUrl.searchParams.get("error");
    
    if (error) {
      return null;
    }
    
    return code || null;
  } catch (error) {
    return null;
  }
};
/**
 * Xử lý redirect OAuth sau khi user hoàn tất đổi mật khẩu trong WebView (staff app chặn role tenant).
 */
export async function finalizeChangePasswordOAuthRedirect(callbackUrl: string): Promise<void> {
  const code = handleKeycloakCallback(callbackUrl);
  if (!code) {
    try {
      const u = new URL(callbackUrl);
      const error = u.searchParams.get("error");
      const errorDescription = u.searchParams.get("error_description");
      if (error) {
        CustomAlert.alert(
          i18n.t("common.error"),
          errorDescription || error,
          [{ text: i18n.t("common.close") }]
        );
      }
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const authPayload = await exchangeCodeForToken(code);
    if (authPayload.role === "tenant") {
      await logoutKeycloak(authPayload.idToken);
      useAuthStore.getState().logout();
      CustomAlert.alert(
        i18n.t("tenant_blocked_title"),
        i18n.t("tenant_blocked_message"),
        [{ text: i18n.t("common.close") }]
      );
      return;
    }
    useAuthStore.getState().logout();
    CustomAlert.alert(
      i18n.t("profile.change_password_success_title"),
      i18n.t("profile.change_password_success_message"),
      [{ text: i18n.t("common.close") }]
    );
  } catch (e) {
    CustomAlert.alert(
      i18n.t("common.error"),
      e instanceof Error ? e.message : String(e),
      [{ text: i18n.t("common.close") }]
    );
  }
}

/**
 * Trang info success không redirect về redirect_uri — theme postMessage; đồng bộ UX với OAuth thành công.
 */
export function finalizeChangePasswordFromInfoPageSuccess(): void {
  useAuthStore.getState().logout();
  CustomAlert.alert(
    i18n.t("profile.change_password_success_title"),
    i18n.t("profile.change_password_success_message"),
    [{ text: i18n.t("common.close") }]
  );
}

// Mở trang đổi mật khẩu (UPDATE_PASSWORD) — native dùng WebView overlay toàn cục, giống màn Login.
export const openChangePasswordPage = async () => {
  try {
    const authUrl = `${getKeycloakAuthUrl(i18n.language)}&kc_action=UPDATE_PASSWORD`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.open(authUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    useAuthStore.getState().setKeycloakInAppSession({
      flow: "change_password",
      url: authUrl,
    });
  } catch (error: any) {
    throw new Error(`Không thể mở trang đổi mật khẩu: ${error.message || error}`);
  }
};

// mở tài khoản để đổi mật khẩu
export const openAccountManagement = async () => {
  try {
    const accountUrl = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/account`;

    if (Platform.OS === "web") {
      const canOpen = await Linking.canOpenURL(accountUrl);
      if (canOpen) {
        await Linking.openURL(accountUrl);
      } else {
        throw new Error("Không thể mở trình duyệt");
      }
      return;
    }

    await beginKeycloakInAppSession(accountUrl, { allowManualClose: true, browserMode: "browse" });
  } catch (error: any) {
    throw new Error(`Không thể mở trang quản lý tài khoản: ${error.message || error}`);
  }
};

/**
 * Đăng xuất khỏi Keycloak (Xóa session trên server)
 * - idToken: ID Token để gợi ý Keycloak logout đúng user (BẮT BUỘC để tránh lỗi 500/confirm page)
 */
export const logoutKeycloak = async (idToken?: string | null) => {
  try {
    const logoutUrl = buildLogoutUrl(idToken);
    if (Platform.OS !== "web") {
      await beginKeycloakInAppSession(logoutUrl, { allowManualClose: true });
    } else {
      window.location.href = logoutUrl;
    }
  } catch (error) {
    console.error("Lỗi khi logout Keycloak:", error);
  }
};
