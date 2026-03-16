/**
 * API lấy danh sách nhà (houses) từ Backend chung.
 * Dùng axiosClient để tự động gắn Bearer token (từ useAuthStore)
 * và xử lý refresh token khi 401.
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type { HousesApiResponse } from "../types/api";

/** Chuẩn hóa response từ BE — hỗ trợ nhiều format: { data: [...] } hoặc mảng trực tiếp. */
function normalizeHousesResponse(body: unknown): HousesApiResponse {
  if (Array.isArray(body)) {
    return { data: body, message: "OK", statusCode: 200, success: true };
  }
  if (body && typeof body === "object" && "data" in body) {
    const d = (body as any).data;
    if (Array.isArray(d)) return body as HousesApiResponse;
    // Một số BE bọc thêm: { data: { data: [...], message, statusCode, success } }
    if (d && typeof d === "object" && Array.isArray(d.data)) {
      return { data: d.data, message: d.message ?? "OK", statusCode: d.statusCode ?? 200, success: d.success ?? true };
    }
  }
  if (body && typeof body === "object" && "houses" in body && Array.isArray((body as any).houses)) {
    const b = body as any;
    return { data: b.houses, message: b.message ?? "OK", statusCode: b.statusCode ?? 200, success: b.success ?? true };
  }
  if (body && typeof body === "object" && "result" in body) {
    const result = (body as any).result;
    if (Array.isArray(result?.data)) {
      return {
        data: result.data,
        message: result.message ?? (body as any).message ?? "OK",
        statusCode: result.statusCode ?? (body as any).statusCode ?? 200,
        success: result.success ?? (body as any).success ?? true,
      };
    }
  }
  return {
    data: [],
    message: (body as any)?.message ?? "Không có dữ liệu",
    statusCode: (body as any)?.statusCode ?? 200,
    success: (body as any)?.success ?? false,
  };
}

/**
 * Lấy danh sách TẤT CẢ căn nhà (GET /api/houses).
 * Dùng cho luồng Staff (quản lý nhiều nhà).
 * Request tự động có header Authorization: Bearer <access_token> nhờ interceptor của axiosClient.
 * @returns Promise<HousesApiResponse> - data là mảng HouseFromApi, success/message/statusCode từ BE.
 */
export const getHouses = async (): Promise<HousesApiResponse> => {
  const url = `${BACKEND_API_BASE}/houses`;
  const response = await axiosClient.get(url);
  const normalized = normalizeHousesResponse(response.data);
  return normalized;
};

