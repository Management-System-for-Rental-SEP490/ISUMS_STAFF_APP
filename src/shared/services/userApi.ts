import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type { ApiResponse, UserProfileResponse } from "../types/api";

export type GetUserProfileOptions = {
  /** Mặc định `BACKEND_API_BASE`; truyền `FALLBACK_BACKEND_URL` khi /users/me chỉ có trên BE dev/ngrok. */
  apiBase?: string;
};

/**
 * Lấy thông tin chi tiết user hiện tại (GET /api/users/me).
 * Mặc định dùng `BACKEND_API_BASE`; luồng staff/region có thể truyền `apiBase` khác.
 */
export const getUserProfile = async (
  options?: GetUserProfileOptions
): Promise<UserProfileResponse | null> => {
  const base = (options?.apiBase ?? BACKEND_API_BASE).replace(/\/$/, "");
  const url = `${base}/users/me`;
  try {
    const response = await axiosClient.get<ApiResponse<UserProfileResponse>>(url);
    
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    // Log chi tiết để debug
    console.error(`[UserProfile] Lỗi gọi API ${url}:`);
    if (error.response) {
        // Server trả về response lỗi (4xx, 5xx)
        console.error(`- Status: ${error.response.status}`);
        console.error(`- Data:`, error.response.data);
    } else if (error.request) {
        // Không nhận được response (Network Error)
        console.error("- Không nhận được phản hồi từ server (Network Error hoặc Server Down)");
    } else {
        console.error("- Lỗi setup request:", error.message);
    }
    return null;
  }
};
