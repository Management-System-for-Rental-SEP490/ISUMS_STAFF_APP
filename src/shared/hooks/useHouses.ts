import { useQuery } from "@tanstack/react-query";
import { getHouses, getTenantHouses } from "../services/houseApi";

/**
 * Hook dùng React Query để lấy danh sách nhà (houses) từ BE.
 *
 * - Đóng gói lại `useQuery` + `getHouses` vào một chỗ.
 * - Màn hình chỉ cần gọi `useHouses()` là có `data`, `isLoading`, `isError`, `refetch`.
 */
export const HOUSES_KEYS = {
  /** Key gốc cho toàn bộ queries về houses. */
  all: ["houses"] as const,
  /** Key cho danh sách nhà của tenant hiện tại. */
  tenant: ["houses", "tenant"] as const,
};

export const useHouses = () => {
  return useQuery({
    // Cache key: mọi nơi dùng houses đều share chung "houses".
    queryKey: HOUSES_KEYS.all,
    // Hàm gọi API thật sự (GET /api/houses).
    queryFn: getHouses,
  });
};

/**
 * Hook lấy danh sách nhà gắn với user hiện tại (tenant).
 * - Dùng API mới GET /api/houses/house (BE đọc userId trong token để tìm houseId tương ứng).
 * - Áp dụng cho các màn hình Tenant (Home, chi tiết nhà tenant).
 */
export const useTenantHouses = () => {
  return useQuery({
    queryKey: HOUSES_KEYS.tenant,
    queryFn: getTenantHouses,
  });
};

