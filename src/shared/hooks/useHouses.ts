import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  fetchHousesScopedToStaff,
  getFunctionalAreasByHouseId,
  getHouseById,
  getRegionsForStaff,
} from "../services/houseApi";
import { useAuthStore } from "../../store/useAuthStore";
import type { HouseRegionFromApi } from "../types/api";

/**
 * Hook dùng React Query để lấy danh sách nhà (houses) từ BE.
 *
 * - Staff chỉ thấy nhà theo region: trong `fetchHousesScopedToStaff` gọi GET /users/me lấy `data.id`,
 *   rồi regions/staff + houses/region/{id} (base fallback khi API chưa merge primary).
 * - `options.enabled`: mặc định `true` (backward-compat). Truyền `false` để lazy-load —
 *   dùng khi chỉ muốn fetch khi user mở dropdown thay vì fetch ngay lúc mount màn hình.
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

export const REGION_STAFF_KEYS = {
  all: ["regions", "staff"] as const,
  forUser: (userId: string | null) => ["regions", "staff", userId ?? ""] as const,
};

export const useHouses = (options?: { enabled?: boolean }) => {
  const { i18n } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const username = useAuthStore((s) => s.user);
  const callerEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: [...HOUSES_KEYS.listForStaff(username), i18n.language],
    queryFn: fetchHousesScopedToStaff,
    enabled: isLoggedIn && Boolean(token) && callerEnabled,
  });
};

/**
 * Lấy danh sách khu vực (regions) mà staff hiện tại phụ trách — dùng làm chips lọc trong dropdown nhà.
 * Lazy theo `options.enabled`: chỉ fetch khi dropdown được mở lần đầu tiên.
 */
export const useRegionsForStaff = (options?: { enabled?: boolean }) => {
  const { i18n } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.userId);
  const callerEnabled = options?.enabled !== false;

  return useQuery<HouseRegionFromApi[]>({
    queryKey: [...REGION_STAFF_KEYS.forUser(userId), i18n.language],
    queryFn: async () => {
      if (!userId) return [];
      return getRegionsForStaff(userId);
    },
    enabled: isLoggedIn && Boolean(token) && Boolean(userId) && callerEnabled,
    staleTime: 5 * 60_000,
  });
};

/**
 * Chi tiết một căn nhà theo ID (GET /api/houses/{id}) — dùng khi đã có houseId từ job/ticket.
 */
export const useHouseById = (houseId: string | undefined | null) => {
  const { i18n } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const id = String(houseId ?? "").trim();

  return useQuery({
    queryKey: [...HOUSES_KEYS.byId(id), i18n.language],
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
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: [...HOUSES_KEYS.functionalAreas(houseId), i18n.language],
    queryFn: () => getFunctionalAreasByHouseId(houseId),
    enabled: Boolean(houseId),
  });
};

