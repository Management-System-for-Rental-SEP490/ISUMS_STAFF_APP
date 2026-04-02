import { Linking, Platform } from "react-native";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import { AuthPayload, UserRole } from "../types";
import { useAuthStore } from "../../store/useAuthStore";
import { CustomAlert } from "../components/alert";
import i18n from "../i18n";

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

// Helper export để các screen khác (ví dụ LoginScreen dùng WebView)
// có thể lấy đúng redirectUri khi cần so khớp URL trong WebView.
export const getKeycloakRedirectUri = (): string => {
  return KEYCLOAK_CONFIG.redirectUri;
};

type PendingKeycloakInApp = {
  resolve: () => void;
  onAppRedirect?: (url: string) => Promise<void>;
  allowManualClose: boolean;
};

let pendingKeycloakInApp: PendingKeycloakInApp | null = null;

export function beginKeycloakInAppSession(
  initialUrl: string,
  options?: { allowManualClose?: boolean; onAppRedirect?: (url: string) => Promise<void> }
): Promise<void> {
  return new Promise((resolve) => {
    if (pendingKeycloakInApp) {
      const old = pendingKeycloakInApp;
      pendingKeycloakInApp = null;
      useAuthStore.getState().setKeycloakInAppSession(null);
      old.resolve();
    }
    pendingKeycloakInApp = {
      resolve,
      onAppRedirect: options?.onAppRedirect,
      allowManualClose: options?.allowManualClose ?? false,
    };
    useAuthStore.getState().setKeycloakInAppSession({
      url: initialUrl,
      allowManualClose: options?.allowManualClose ?? false,
    });
  });
}

export async function keycloakInAppNotifyAppRedirect(url: string): Promise<void> {
  const redirectUri = getKeycloakRedirectUri();
  if (!url.startsWith(redirectUri)) return;
  const p = pendingKeycloakInApp;
  if (!p) return;

  pendingKeycloakInApp = null;
  useAuthStore.getState().setKeycloakInAppSession(null);

  try {
    if (p.onAppRedirect) {
      await p.onAppRedirect(url);
    }
  } finally {
    p.resolve();
  }
}

export function keycloakInAppUserDismissed(): void {
  const p = pendingKeycloakInApp;
  if (!p) return;
  pendingKeycloakInApp = null;
  useAuthStore.getState().setKeycloakInAppSession(null);
  p.resolve();
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

// Tạo URL authorization để chuyển hướng đến Keycloak login - tạo link và mở trình duyệt
export const getKeycloakAuthUrl = (locale?: string): string => {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    redirect_uri: KEYCLOAK_CONFIG.redirectUri,
    response_type: "code",
    scope: "openid email profile",
  });

  if (locale) {
    params.append('kc_locale', locale); // Tham số riêng của Keycloak để ép ngôn ngữ
    params.append('ui_locales', locale); // Tham số chuẩn OIDC (dự phòng)
  }

  return `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/auth?${params.toString()}`;
};

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
    const role = determineUserRole(userInfo, access_token);
    
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
// ... (giữ nguyên getUserInfo, decodeJWT, determineUserRole) ...

// ... (giữ nguyên openKeycloakLogin, handleKeycloakCallback, openAccountManagement) ...


// Lấy thông tin user từ Keycloak userinfo endpoint
//Giống API get user
const getUserInfo = async (accessToken: string) => {
  const userInfoUrl = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/userinfo`;
  const response = await axios.get(userInfoUrl, {
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
// Xác định role của user từ token hoặc userInfo
const determineUserRole = (userInfo: any, accessToken: string): UserRole => { //hàm bắt buộc phải trả về kiểu UserRole.
  const tokenClaims = decodeJWT(accessToken);
  
  if (tokenClaims) {
    // Kiểm tra realm_access.roles trong token
    const realmRoles = tokenClaims.realm_access?.roles || []; //roles là các quyền của user trong realm.
    if (realmRoles.includes("technical")) return "technical";
    // if (realmRoles.includes("landlord")) return "landlord";
    // if (realmRoles.includes("manager")) return "manager";
    if (realmRoles.includes("tenant")) return "tenant";
    
    // Kiểm tra resource_access nếu có
    const resourceRoles = tokenClaims.resource_access?.["mobile-app"]?.roles || [];
    if (resourceRoles.includes("technical")) return "technical";
    // if (resourceRoles.includes("landlord")) return "landlord";
    // if (resourceRoles.includes("manager")) return "manager";
    if (resourceRoles.includes("tenant")) return "tenant";

    // --- MỚI: Kiểm tra Group từ Keycloak ---
    // Yêu cầu: Cấu hình Mapper "Group Membership" trong Keycloak -> Token Claim Name: "groups"
    const groups = tokenClaims.groups || userInfo.groups || [];
    if (Array.isArray(groups)) {
      // Group trong Keycloak thường có dạng path: "/technical Group" hoặc "technical Group"
      if (groups.some((g: string) => g.toLowerCase().includes("technical") || g.toLowerCase().includes("staff"))) {
        return "technical";
      }
      if (groups.some((g: string) => g.toLowerCase().includes("tenant") || g.toLowerCase().includes("resident"))) {
        return "tenant";
      }
    }
// hàm dưới có thể sai
    // --- MỚI: Kiểm tra Attributes tùy chỉnh ---
    // Ví dụ: user có attribute "user_type": "technical"
    const attributes = userInfo.attributes || tokenClaims.attributes || {};
    if (attributes.user_type === "technical" || (Array.isArray(attributes.user_type) && attributes.user_type.includes("technical"))) {
      return "technical";
    }
  }
  
  // Fallback: kiểm tra từ username
  const username = userInfo.preferred_username?.toLowerCase() || "";
  if (username.includes("technical") || username.includes("admin")) return "technical";
  // if (username.includes("landlord")) return "landlord";
  // if (username.includes("manager")) return "manager";
  return "tenant";
};

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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token: new_refresh_token, id_token } = response.data;
    const userInfo = await getUserInfo(access_token);
    const role = determineUserRole(userInfo, access_token);

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
// Mở trang đổi mật khẩu trực tiếp (Sử dụng luồng UPDATE_PASSWORD của Keycloak)
export const openChangePasswordPage = async () => {
  try {
    const authUrl = `${getKeycloakAuthUrl()}&kc_action=UPDATE_PASSWORD`;

    if (Platform.OS === "web") {
      window.open(authUrl, "_blank");
      return;
    }

    await beginKeycloakInAppSession(authUrl, {
      onAppRedirect: async (url) => {
        const code = handleKeycloakCallback(url);
        if (!code) return;
        const authPayload = await exchangeCodeForToken(code);
        if (authPayload.role === "tenant") {
          const idTok = authPayload.idToken;
          await beginKeycloakInAppSession(buildLogoutUrl(idTok));
          useAuthStore.getState().logout();
          CustomAlert.alert(
            i18n.t("tenant_blocked_title"),
            i18n.t("tenant_blocked_message"),
            [{ text: i18n.t("common.close") }]
          );
          return;
        }
        useAuthStore.getState().login(authPayload);
      },
    });
  } catch (error: any) {
    if (error.message && error.message.includes("User canceled")) {
      return;
    }
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

    await beginKeycloakInAppSession(accountUrl, { allowManualClose: true });
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
      await beginKeycloakInAppSession(logoutUrl);
    } else {
      window.location.href = logoutUrl;
    }
  } catch (error) {
    console.error("Lỗi khi logout Keycloak:", error);
  }
};
