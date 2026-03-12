/**
 * API liên quan đến thiết bị (asset items).
 * GET /api/assets/items, POST, PUT, DELETE /api/assets/items/:id.
 */
import axiosClient from "../api/axiosClient";
import { BACKEND_API_BASE } from "../api/config";
import type {
  AssetItemFromApi,
  AssetItemsApiResponse,
  AssetItemsParams,
  CreateAssetItemRequest,
  CreateAssetItemApiResponse,
  UpdateAssetItemRequest,
  UpdateAssetItemApiResponse,
  AttachAssetTagRequest,
  AttachAssetTagApiResponse,
  DetachAssetTagApiResponse,
  GetAssetByTagValueApiResponse,
} from "../types/api";

/**
 * Chuẩn hóa tagValue trước khi gửi lên BE.
 * - Giữ nguyên cấu trúc có khoảng trắng giữa các byte (\"04 9C 59 A2 ...\")
 * - Chỉ trim hai đầu, KHÔNG xóa khoảng trắng, KHÔNG tự ý đổi format.
 * Lý do: BE chấp nhận ID thẻ NFC với hoặc không với khoảng trắng, và logic so khớp nằm phía BE.
 */
const normalizeTagValueForApi = (raw: string) => raw.trim();

/**
 * Chuẩn hóa tagValue để so sánh trên FE (fallback).
 * - Bỏ hết khoảng trắng và chuyển sang UPPERCASE.
 * - Dùng khi cần so sánh hai mã NFC bất kể đang được lưu dính liền hay có khoảng trắng.
 */
const normalizeTagValueForCompare = (raw: string) =>
  raw.replace(/\s+/g, "").toUpperCase();

/**
 * Chuẩn hóa một item từ BE: đảm bảo nfcTag, qrTag có giá trị dù BE trả về camelCase hay snake_case.
 * API GET /api/assets/items/house/:houseId đã được cập nhật trả về đầy đủ nfcTag, qrTag;
 * nếu BE trả snake_case (nfc_tag, qr_tag) thì map sang camelCase để màn danh sách & chi tiết hiển thị đúng.
 */
function normalizeAssetItemFromResponse(
  raw: AssetItemFromApi & { nfc_tag?: string | null; qr_tag?: string | null }
): AssetItemFromApi {
  const nfc = raw.nfcTag ?? raw.nfc_tag ?? null;
  const qr = raw.qrTag ?? raw.qr_tag ?? null;
  return {
    ...raw,
    nfcTag: nfc != null ? String(nfc) : null,
    qrTag: qr != null ? String(qr) : null,
  };
}

/**
 * Lấy danh sách thiết bị (GET /api/asset/items), có thể lọc theo houseId và/hoặc categoryId.
 * @param params - houseId, categoryId (optional); không truyền = lấy tất cả.
 * @returns Promise<AssetItemsApiResponse> - data là mảng AssetItemFromApi.
 */
export const getAssetItems = async (
  params?: AssetItemsParams
): Promise<AssetItemsApiResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.houseId) searchParams.set("houseId", params.houseId);
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.nfcId) searchParams.set("nfcId", params.nfcId);

  const query = searchParams.toString();
  const url = query
    ? `${BACKEND_API_BASE}/assets/items?${query}`
    : `${BACKEND_API_BASE}/assets/items`;

  const response = await axiosClient.get<AssetItemsApiResponse>(url);
  return response.data;
};

/**
 * Lấy danh sách thiết bị theo houseId (GET /api/assets/items/house/:houseId).
 * Dùng cho tenant: lấy toàn bộ thiết bị thuộc nhà đang thuê.
 * BE đã cập nhật trả về đầy đủ từng item (gồm nfcTag, qrTag) để màn danh sách và chi tiết hiển thị đúng.
 * Response format { data: AssetItemFromApi[], message?, ... }; mảng data được chuẩn hóa (hỗ trợ cả snake_case từ BE).
 */
export const getAssetItemsByHouseId = async (
  houseId: string
): Promise<AssetItemsApiResponse> => {
  const response = await axiosClient.get<AssetItemsApiResponse>(
    `${BACKEND_API_BASE}/assets/items/house/${encodeURIComponent(houseId)}`
  );
  const data = response.data;
  if (Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((i) =>
        normalizeAssetItemFromResponse(i as AssetItemFromApi & { nfc_tag?: string | null; qr_tag?: string | null })
      ),
    };
  }
  return data;
};

/**
 * Lấy chi tiết thiết bị theo ID (GET /api/assets/items/:id).
 * Dùng path /assets/... thống nhất với GET /api/assets/items/house/:houseId.
 */
export const getAssetItemById = async (id: string): Promise<AssetItemFromApi | undefined> => {
  try {
    const response = await axiosClient.get<UpdateAssetItemApiResponse>(
      `${BACKEND_API_BASE}/assets/items/${id}`
    );
    return response.data.data;
  } catch (error) {
    console.log("Lỗi lấy chi tiết thiết bị:", error);
    return undefined;
  }
};


export const getAssetItemByTag = async (
  tagValue: string
): Promise<AssetItemFromApi | undefined> => {
  const normalized = tagValue.trim(); 
  if (!normalized) return undefined;
  const apiTagValue = normalizeTagValueForApi(normalized);

  try {
    // Gọi API mới: GET /api/asset/tags/asset/{tagValue}
    const response = await axiosClient.get<GetAssetByTagValueApiResponse>(
      `${BACKEND_API_BASE}/assets/tags/asset/${encodeURIComponent(apiTagValue)}`
    );
    
    // Xử lý response.data.data có thể là Object (theo Postman) hoặc Array (theo code cũ)
    const responseData = response.data.data;
    
    let raw: AssetItemFromApi | undefined;

    if (Array.isArray(responseData)) {
      raw = responseData[0];
    } else if (responseData && typeof responseData === "object") {
      // BE trả về object
      raw = responseData as AssetItemFromApi;
    }

    if (!raw) return undefined;

    // Trả nguyên object từ BE để giữ đúng cặp nfcTag / qrTag.
    // BE đã đảm bảo rằng:
    // - Nếu quét NFC: nfcTag chứa ID thẻ NFC, qrTag (nếu có) chứa ID QR của cùng thiết bị.
    // - Nếu quét QR: qrTag chứa ID QR, nfcTag (nếu có) chứa ID NFC của cùng thiết bị.
    return raw;
  } catch (error) {
    console.log("Lỗi gọi GET /assets/tags/asset/{tagValue}, fallback getAssetItems:", error);
    try {
      const res = await getAssetItems();
      const found = res.data.find(
        (d) =>
          normalizeTagValueForCompare(d.nfcTag || "") ===
          normalizeTagValueForCompare(apiTagValue)
      );
      return found ?? undefined;
    } catch (e2) {
      console.log("Lỗi fallback GET /assets/items khi tìm theo NFC:", e2);
      return undefined;
    }
  }
};

/** Alias cho backward compatibility nếu cần, hoặc dùng trực tiếp getAssetItemByTag */
export const getAssetItemByNfcId = getAssetItemByTag;

/**
 * Tạo thiết bị mới (POST /api/asset/items).
 */
export const createAssetItem = async (
  payload: CreateAssetItemRequest
): Promise<CreateAssetItemApiResponse> => {
  const response = await axiosClient.post<CreateAssetItemApiResponse>(
    `${BACKEND_API_BASE}/assets/items`,
    payload
  );
  return response.data;
};

/** Gửi body PUT asset item dạng snake_case (house_id, category_id...) — bật bằng EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE=true */
const useSnakeCasePutBody =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE === "true";

/**
 * Cập nhật thiết bị (PUT /api/asset/items/:id).
 * Body đủ 7 trường. Mặc định camelCase; nếu EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE=true thì gửi snake_case.
 * Backend phải map cả houseId/house_id và categoryId/category_id thì mới cập nhật được nhà/danh mục.
 */
export const updateAssetItem = async (
  id: string,
  payload: UpdateAssetItemRequest
): Promise<UpdateAssetItemApiResponse> => {
  const body = useSnakeCasePutBody
    ? {
        house_id: payload.houseId,
        category_id: payload.categoryId,
        display_name: payload.displayName,
        serial_number: payload.serialNumber,
        nfc_tag: payload.nfcTag,
        qr_tag: payload.qrTag,
        condition_percent: payload.conditionPercent,
        status: payload.status,
      }
    : {
        houseId: payload.houseId,
        categoryId: payload.categoryId,
        displayName: payload.displayName,
        serialNumber: payload.serialNumber,
        nfcTag: payload.nfcTag,
        qrTag: payload.qrTag,
        conditionPercent: payload.conditionPercent,
        status: payload.status,
      };
  const response = await axiosClient.put<UpdateAssetItemApiResponse>(
    `${BACKEND_API_BASE}/assets/items/${id}`,
    body
  );
  return response.data;
};

/**
 * Đổi nhà cho thiết bị (PUT /api/asset/items/:id/transfer).
 * Body: { newHouseId }. BE sẽ cập nhật houseId và trả lại thiết bị sau khi chuyển.
 */
export const transferAssetItemHouse = async (
  id: string,
  newHouseId: string
): Promise<UpdateAssetItemApiResponse> => {
  const response = await axiosClient.put<UpdateAssetItemApiResponse>(
    `${BACKEND_API_BASE}/assets/items/${id}/transfer`,
    { newHouseId }
  );
  return response.data;
};

/**
 * Xóa thiết bị (DELETE /api/asset/items/:id).
 */
export const deleteAssetItem = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.delete<{ success: boolean; message?: string }>(
    `${BACKEND_API_BASE}/assets/items/${id}`
  );
  return response.data;
};

/**
 * Gán một tag NFC vào thiết bị (POST /api/asset/tags).
 * BE tạo bản ghi tag và liên kết với asset item; response 201 khi thành công.
 * @param payload - assetId (ID thiết bị), tagValue (mã NFC đọc từ thẻ), tagType: "NFC".
 */
export const attachAssetTag = async (
  payload: AttachAssetTagRequest
): Promise<AttachAssetTagApiResponse> => {
  const response = await axiosClient.post<AttachAssetTagApiResponse>(
    `${BACKEND_API_BASE}/assets/tags`,
    {
      ...payload,
      tagValue: normalizeTagValueForApi(payload.tagValue),
    }
  );
  return response.data;
};

/**
 * Gỡ tag NFC khỏi thiết bị (PUT /api/asset/tags/detach/{tagValue}).
 * @param tagValue - Giá trị mã NFC (tagValue) cần gỡ.
 */
export const detachAssetTag = async (
  tagValue: string
): Promise<DetachAssetTagApiResponse> => {
  const normalized = normalizeTagValueForApi(tagValue.trim());
  const response = await axiosClient.put<DetachAssetTagApiResponse>(
    `${BACKEND_API_BASE}/assets/tags/detach/${encodeURIComponent(normalized)}`
  );
  return response.data;
};

