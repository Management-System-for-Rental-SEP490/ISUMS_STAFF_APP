/**
 * API lấy danh sách nhà (houses) từ Backend chung.
 * Dùng axiosClient để tự động gắn Bearer token (từ useAuthStore)
 * và xử lý refresh token khi 401.
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import { resolveLocalizedJsonStringFromI18n } from "../utils/resolveLocalizedJsonString";
import { getUserProfile } from "./userApi";
import { useAuthStore } from "../../store/useAuthStore";
import type {
  HousesApiResponse,
  HouseDetailApiResponse,
  ApiResponse,
  FunctionalAreaFromApi,
  HouseRegionFromApi,
  HouseFromApi,
} from "../types/api";

function localizeHouseFromApi(h: HouseFromApi): HouseFromApi {
  return {
    ...h,
    name: resolveLocalizedJsonStringFromI18n(h.name),
    functionalAreas: Array.isArray(h.functionalAreas)
      ? h.functionalAreas.map((fa) => ({
          ...fa,
          name: resolveLocalizedJsonStringFromI18n(fa.name),
        }))
      : h.functionalAreas,
  };
}

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
 * Dùng nội bộ kết hợp với region; màn Staff nên dùng `fetchHousesScopedToStaff`.
 */
export const getHouses = async (): Promise<HousesApiResponse> => {
  const url = `${BACKEND_API_BASE}/houses`;
  const response = await axiosClient.get(url);
  const normalized = normalizeHousesResponse(response.data);
  return {
    ...normalized,
    data: normalized.data.map(localizeHouseFromApi),
  };
};

/**
 * Danh sách nhà thuộc một region (GET /api/houses/region/{regionId}).
 * Response cùng format envelope { data, message, statusCode, success } như GET /houses.
 */
export const getHousesByRegionId = async (regionId: string): Promise<HousesApiResponse> => {
  const url = `${BACKEND_API_BASE}/houses/region/${encodeURIComponent(regionId)}`;
  const response = await axiosClient.get(url);
  const normalized = normalizeHousesResponse(response.data);
  return {
    ...normalized,
    data: normalized.data.map(localizeHouseFromApi),
  };
};

/**
 * Danh sách region mà staff được gán (GET /api/houses/regions/staff/{staffId}).
 * `staffId` = `data.id` từ GET /api/users/me.
 */
export const getRegionsForStaff = async (staffId: string): Promise<HouseRegionFromApi[]> => {
  const url = `${BACKEND_API_BASE}/houses/regions/staff/${encodeURIComponent(staffId)}`;
  const response = await axiosClient.get<ApiResponse<HouseRegionFromApi[]>>(url);
  const body = response.data;
  const raw = body?.data;
  if (!body?.success || !Array.isArray(raw)) return [];

  return raw
    .filter((r): r is HouseRegionFromApi => {
      if (!r?.id) return false;
      if (Array.isArray(r.staffIds) && r.staffIds.length > 0) {
        return r.staffIds.includes(staffId);
      }
      return true;
    })
    .map((r) => ({
      ...r,
      name: resolveLocalizedJsonStringFromI18n(r.name),
      description: resolveLocalizedJsonStringFromI18n(r.description),
    }));
};

/**
 * Gộp danh sách nhà từ nhiều region, bỏ trùng theo `house.id`.
 */
function mergeHousesById(lists: HouseFromApi[][]): HouseFromApi[] {
  const seen = new Set<string>();
  const out: HouseFromApi[] = [];
  for (const list of lists) {
    for (const h of list) {
      if (!h?.id || seen.has(h.id)) continue;
      seen.add(h.id);
      out.push(h);
    }
  }
  return out;
}

/**
 * Lấy danh sách nhà chỉ thuộc các region mà staff hiện tại phụ trách.
 * 1) Ưu tiên đọc `userId` đã cache trong AuthStore (lưu lúc đăng nhập) để bỏ qua bước GET /users/me.
 *    Nếu store chưa có (app cũ chưa migrate) mới fallback về GET /api/users/me.
 * 2) GET /api/houses/regions/staff/{userId}
 * 3) Với mỗi regionId: GET /api/houses/region/{regionId} rồi gộp (dedupe).
 */
export const fetchHousesScopedToStaff = async (): Promise<HousesApiResponse> => {
  const h0 = Date.now();
  console.log(`[HOME TIMING] fetchHousesScopedToStaff bắt đầu lúc ${new Date(h0).toISOString()}`);

  const cachedUserId = useAuthStore.getState().userId?.trim();
  let id: string;

  if (cachedUserId) {
    console.log(`[HOME TIMING] userId lấy từ cache store (bỏ qua /users/me): "${cachedUserId}"`);
    id = cachedUserId;
  } else {
    console.log(`[HOME TIMING] userId chưa có trong store, gọi GET /users/me...`);
    const profile = await getUserProfile();
    id = profile?.id?.trim() ?? "";
    console.log(`[HOME TIMING] ✅ GET /users/me xong: +${Date.now() - h0}ms, id="${id}"`);
  }

  if (!id) {
    return {
      data: [],
      message: "Không lấy được user id từ GET /api/users/me.",
      statusCode: 401,
      success: false,
    };
  }

  const regions = await getRegionsForStaff(id);
  console.log(`[HOME TIMING] ✅ GET regions xong: +${Date.now() - h0}ms, số region=${regions.length}`);

  const regionIdList = regions.map((r) => r.id).filter(Boolean);

  if (regionIdList.length === 0) {
    return {
      data: [],
      message: "Bạn chưa được gán khu vực (region) nào hoặc chưa có dữ liệu từ server.",
      statusCode: 200,
      success: true,
    };
  }

  // Gọi tuần tự từng region để tránh server dev bị quá tải khi nhận nhiều request đồng thời.
  // Mỗi request xong mới gọi tiếp → server xử lý nhẹ hơn, tổng thời gian thực tế thường nhanh hơn song song.
  const perRegion: HousesApiResponse[] = [];
  for (const rid of regionIdList) {
    const result = await getHousesByRegionId(rid);
    // Gắn regionId vào từng nhà để hỗ trợ lọc theo khu vực ở client (chips trong dropdown).
    const taggedData = (result.data ?? []).map((h) => ({
      ...h,
      regionId: h.regionId || rid,
    }));
    perRegion.push({ ...result, data: taggedData });
    console.log(`[HOME TIMING]   → region ${rid} xong: +${Date.now() - h0}ms, số nhà=${taggedData.length}`);
  }
  console.log(`[HOME TIMING] ✅ GET houses xong (${regionIdList.length} region tuần tự): +${Date.now() - h0}ms`);

  const merged = mergeHousesById(perRegion.map((r) => r.data));
  const allOk = perRegion.every((r) => r.success);

  console.log(`[HOME TIMING] ✅ fetchHousesScopedToStaff hoàn tất: tổng +${Date.now() - h0}ms, số nhà=${merged.length}`);
  return {
    data: merged.map(localizeHouseFromApi),
    message: perRegion.find((r) => r.message)?.message ?? "Success",
    statusCode: 200,
    success: allOk,
  };
};

/**
 * Lấy thông tin chi tiết một căn nhà theo ID (GET /api/houses/{id}).
 * Dùng khi đã biết houseId (ví dụ từ job.houseId trong lịch làm việc)
 * và cần hiển thị đầy đủ tên/địa chỉ căn nhà.
 */
export const getHouseById = async (id: string): Promise<HouseDetailApiResponse> => {
  const url = `${BACKEND_API_BASE}/houses/${encodeURIComponent(id)}`;
  const response = await axiosClient.get<HouseDetailApiResponse>(url);
  const body = response.data;
  if (!body?.data) return body;
  return {
    ...body,
    data: localizeHouseFromApi(body.data),
  };
};

/**
 * Lấy danh sách khu vực chức năng theo houseId (GET /api/houses/functionalAreas/{houseId}).
 * API response theo swagger: { data: FunctionalAreaFromApi[], message, statusCode, success }.
 */
export const getFunctionalAreasByHouseId = async (
  houseId: string
): Promise<ApiResponse<FunctionalAreaFromApi[]>> => {
  const url = `${BACKEND_API_BASE}/houses/functionalAreas/${encodeURIComponent(houseId)}`;
  const response = await axiosClient.get<ApiResponse<FunctionalAreaFromApi[]>>(url);
  const body = response.data;
  if (!body?.data || !Array.isArray(body.data)) return body;
  return {
    ...body,
    data: body.data.map((fa) => ({
      ...fa,
      name: resolveLocalizedJsonStringFromI18n(fa.name),
    })),
  };
};

