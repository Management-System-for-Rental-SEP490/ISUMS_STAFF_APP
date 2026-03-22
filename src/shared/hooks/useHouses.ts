import { useQuery } from "@tanstack/react-query";
import { getHouses, getFunctionalAreasByHouseId } from "../services/houseApi";

/**
 * Hook dùng React Query để lấy danh sách nhà (houses) từ BE.
 *
 * - Đóng gói lại `useQuery` + `getHouses` vào một chỗ.
 * - Màn hình chỉ cần gọi `useHouses()` là có `data`, `isLoading`, `isError`, `refetch`.
 */
export const HOUSES_KEYS = {
  /** Key gốc cho toàn bộ queries về houses. */
  all: ["houses"] as const,
  functionalAreas: (houseId: string) => ["houses", "functionalAreas", houseId] as const,
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
 * Hook lấy danh sách khu vực chức năng theo houseId.
 * - Gọi API: GET /api/houses/functionalAreas/{houseId}
 * - Enabled khi houseId có giá trị.
 */
export const useFunctionalAreasByHouseId = (houseId: string) => {
  return useQuery({
    queryKey: HOUSES_KEYS.functionalAreas(houseId),
    queryFn: () => getFunctionalAreasByHouseId(houseId),
    enabled: Boolean(houseId),
  });
};

