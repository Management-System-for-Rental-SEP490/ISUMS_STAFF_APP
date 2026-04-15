/**
 * API lấy danh sách nhà (houses) từ Backend chung.
 * Dùng axiosClient để tự động gắn Bearer token (từ useAuthStore)
 * và xử lý refresh token khi 401.
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE, FALLBACK_BACKEND_URL } from "../api/config";
import { resolveLocalizedJsonStringFromI18n } from "../utils/resolveLocalizedJsonString";
import { getUserProfile } from "./userApi";
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
 * `staffId` = `data.id` từ GET /api/users/me. Base: `FALLBACK_BACKEND_URL` khi API chưa merge primary.
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
 * 1) GET /api/users/me → `data.id` (user id trong hệ thống BE, không dùng claim JWT).
 * 2) GET /api/houses/regions/staff/{userId}
 * 3) Với mỗi regionId: GET /api/houses/region/{regionId} rồi gộp (dedupe).
 */
export const fetchHousesScopedToStaff = async (): Promise<HousesApiResponse> => {
  const profile = await getUserProfile({ apiBase: BACKEND_API_BASE });
  const id = profile?.id?.trim() ?? "";
  if (!id) {
    return {
      data: [],
      message: "Không lấy được user id từ GET /api/users/me.",
      statusCode: 401,
      success: false,
    };
  }

  const regions = await getRegionsForStaff(id);
  const regionIdList = regions.map((r) => r.id).filter(Boolean);

  if (regionIdList.length === 0) {
    return {
      data: [],
      message: "Bạn chưa được gán khu vực (region) nào hoặc chưa có dữ liệu từ server.",
      statusCode: 200,
      success: true,
    };
  }

  const perRegion = await Promise.all(regionIdList.map((rid) => getHousesByRegionId(rid)));
  const merged = mergeHousesById(perRegion.map((r) => r.data));
  const allOk = perRegion.every((r) => r.success);

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

