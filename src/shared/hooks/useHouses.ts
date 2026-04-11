import { useQuery } from "@tanstack/react-query";
import {
  fetchHousesScopedToStaff,
  getFunctionalAreasByHouseId,
  getHouseById,
} from "../services/houseApi";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * Hook dùng React Query để lấy danh sách nhà (houses) từ BE.
 *
 * - Staff chỉ thấy nhà theo region: trong `fetchHousesScopedToStaff` gọi GET /users/me lấy `data.id`,
 *   rồi regions/staff + houses/region/{id} (base fallback khi API chưa merge primary).
 */
export const HOUSES_KEYS = {
  /** Key gốc cho toàn bộ queries về houses. */
  all: ["houses"] as const,
  /** Phân tách cache theo user đăng nhập (username Keycloak), vì user id chỉ có sau /users/me. */
  listForStaff: (username: string | null) => ["houses", "staffRegions", username ?? ""] as const,
  /** Chi tiết một căn (GET /api/houses/{id}). */
  byId: (houseId: string) => ["houses", "byId", houseId] as const,
  functionalAreas: (houseId: string) => ["houses", "functionalAreas", houseId] as const,
};

export const useHouses = () => {
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const username = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: HOUSES_KEYS.listForStaff(username),
    queryFn: fetchHousesScopedToStaff,
    enabled: isLoggedIn && Boolean(token),
  });
};

/**
 * Chi tiết một căn nhà theo ID (GET /api/houses/{id}) — dùng khi đã có houseId từ job/ticket.
 */
export const useHouseById = (houseId: string | undefined | null) => {
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const id = String(houseId ?? "").trim();

  return useQuery({
    queryKey: HOUSES_KEYS.byId(id),
    queryFn: () => getHouseById(id),
    enabled: isLoggedIn && Boolean(token) && Boolean(id),
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

