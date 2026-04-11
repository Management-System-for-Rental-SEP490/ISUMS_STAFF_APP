import axios from "axios";
import { DATA_LOAD_TIMEOUT_MS, BACKEND_API_BASE } from "../api/config";
import type { ApiResponse, UserProfileResponse } from "../types/api";

export type GetUserProfileOptions = {
  /** Mặc định `BACKEND_API_BASE`; truyền base khác khi /users/me chỉ có trên BE dev/ngrok. */
  apiBase?: string;
};

/**
 * GET /api/users/me với Bearer cụ thể (axios trần — không qua `axiosClient` để tránh vòng import với keycloak).
 */
export async function getUserProfileWithAccessToken(
  accessToken: string,
  options?: GetUserProfileOptions
): Promise<UserProfileResponse | null> {
  const base = (options?.apiBase ?? BACKEND_API_BASE).replace(/\/$/, "");
  const url = `${base}/users/me`;
  //const url = `https://unrestrictable-lan-syzygial.ngrok-free.dev/api/users/me`;
  try {
    const response = await axios.get<ApiResponse<UserProfileResponse>>(url, {
      timeout: DATA_LOAD_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "*/*",
      },
    });
    if (response.data?.success && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error(`[UserProfile] Lỗi gọi API ${url} (Bearer trực tiếp):`);
    if (error.response) {
      console.error(`- Status:`, error.response.status);
      console.error(`- Data:`, error.response.data);
    } else if (error.request) {
      console.error("- Không nhận được phản hồi từ server");
    } else {
      console.error("- Lỗi request:", error.message);
    }
    return null;
  }
}
