/**
 * API lấy danh sách nhà (houses) từ Backend chung.
 * Dùng axiosClient để tự động gắn Bearer token (từ useAuthStore)
 * và xử lý refresh token khi 401.
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type { HousesApiResponse } from "../types/api";

/**
 * Lấy danh sách TẤT CẢ căn nhà (GET /api/houses).
 * Dùng cho luồng Staff (quản lý nhiều nhà).
 * Request tự động có header Authorization: Bearer <access_token> nhờ interceptor của axiosClient.
 * @returns Promise<HousesApiResponse> - data là mảng HouseFromApi, success/message/statusCode từ BE.
 */
export const getHouses = async (): Promise<HousesApiResponse> => {
  const response = await axiosClient.get<HousesApiResponse>(
    `${BACKEND_API_BASE}/houses`
  );
  return response.data;
};

/**
 * Lấy danh sách căn nhà gắn với user hiện tại (tenant) (GET /api/houses/house).
 * BE dựa trên userId trong access token (userRentalId) để trả về các nhà mà tenant đang thuê.
 * Dùng cho luồng Tenant Home để không phải filter thủ công theo userId trên FE.
 */
export const getTenantHouses = async (): Promise<HousesApiResponse> => {
  const response = await axiosClient.get<HousesApiResponse>(
    `${BACKEND_API_BASE}/houses/house`
  );
  return response.data;
};

