import { Platform } from "react-native";
import { authorize, refresh, AuthConfiguration, AuthorizeResult } from "react-native-app-auth";
import {
  KEYCLOAK_CONFIG,
  getUserInfo,
  resolveStaffAppRoleFromBackend,
} from "./keycloakAuth";
import type { AuthPayload } from "../types";

function normalizeLocale(locale?: string | null): "vi" | "en" | "ja" {
  const raw = locale != null ? String(locale).trim().toLowerCase() : "";
  if (!raw) return "vi";
  if (raw.startsWith("vi")) return "vi";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("en")) return "en";
  return "vi";
}

function buildAppAuthConfig(locale?: string, idpHint?: string): AuthConfiguration {
  const lc = normalizeLocale(locale);
  const additionalParameters: Record<string, string> = {
    kc_locale: lc,
    ui_locales: lc,
  };
  if (idpHint) {
    additionalParameters.kc_idp_hint = idpHint;
  }
  return {
    issuer: `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}`,
    clientId: KEYCLOAK_CONFIG.clientId,
    redirectUrl: KEYCLOAK_CONFIG.redirectUri,
    scopes: ["openid", "profile", "email"],
    additionalParameters,
    usePKCE: true,
    skipCodeExchange: false,
    dangerouslyAllowInsecureHttpRequests: false,
  };
}

/**
 * Đăng nhập Keycloak qua react-native-app-auth (production-grade).
 * Android: Chrome Custom Tabs + AppAuth-Android (PKCE + native intent redirect).
 * iOS: ASWebAuthenticationSession (system-grade isolation, biometric autofill).
 * Role staff resolve qua backend /api/users/me (KHÔNG dùng realm_access từ JWT — nghiệp vụ riêng staff app).
 */
export async function signInWithAppAuth(locale?: string, idpHint?: string): Promise<AuthPayload> {
  if (Platform.OS === "web") {
    throw new Error("signInWithAppAuth không hỗ trợ web; dùng openKeycloakLogin redirect flow");
  }

  const result: AuthorizeResult = await authorize(buildAppAuthConfig(locale, idpHint));

  const userInfo = await getUserInfo(result.accessToken);
  const role = await resolveStaffAppRoleFromBackend(result.accessToken);

  let houseId: string | undefined;
  const rawHouseId = userInfo.attributes?.houseId || userInfo.houseId;
  if (Array.isArray(rawHouseId)) {
    houseId = rawHouseId[0];
  } else if (typeof rawHouseId === "string") {
    houseId = rawHouseId;
  }

  return {
    username: userInfo.preferred_username || userInfo.name || "user",
    role: role.role,
    token: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    idToken: result.idToken ?? undefined,
    houseId,
  };
}

export async function refreshAppAuthToken(
  refreshToken: string,
  locale?: string,
): Promise<{ accessToken: string; refreshToken?: string; idToken?: string; accessTokenExpirationDate: string }> {
  const r = await refresh(buildAppAuthConfig(locale), { refreshToken });
  return {
    accessToken: r.accessToken,
    refreshToken: r.refreshToken ?? refreshToken,
    idToken: r.idToken ?? undefined,
    accessTokenExpirationDate: r.accessTokenExpirationDate,
  };
}
