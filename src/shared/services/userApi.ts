import axiosClient from "../api/axiosClient";
import { USER_API_BASE } from "../api/config";
import type { ApiResponse, UserProfileResponse } from "../types/api";

/**
 * Lấy thông tin chi tiết user hiện tại (GET /api/users/me).
 * Sử dụng USER_API_BASE riêng biệt.
 */
export const getUserProfile = async (): Promise<UserProfileResponse | null> => {
  const url = `${USER_API_BASE}/users/me`;
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
