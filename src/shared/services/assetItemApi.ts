/**
 * API liên quan đến thiết bị (asset items).
 * GET /api/assets/items, POST, PUT, DELETE /api/assets/items/:id.
 */
import axiosClient from "../api/axiosClient";
import { ASSETS_API_BASE, BACKEND_API_BASE, FALLBACK_BACKEND_URL } from "../api/config";
import i18n from "../i18n";
import { useAuthStore } from "../../store/useAuthStore";
import {
  normalizeAssetItemStatusFromApi,
  type AssetItemFromApi,
  type AssetItemsApiResponse,
  type AssetItemsParams,
  type CreateAssetItemRequest,
  type CreateAssetItemApiResponse,
  type UpdateAssetItemRequest,
  type UpdateAssetItemApiResponse,
  type IotDevicesByHouseApiResponse,
  type AttachAssetTagRequest,
  type AttachAssetTagApiResponse,
  type DetachAssetTagApiResponse,
  type GetAssetByTagValueApiResponse,
  type ApiResponse,
  type IotProvisionRequest,
  type IotProvisionApiResponse,
  type IotProvisionTokenRequest,
  type IotProvisionTokenApiResponse,
  type IotControllerByHouseApiResponse,
  type IotProvisionNodeRequest,
  type IotProvisionNodeApiResponse,
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
 * Lấy tagValue đang active từ mảng `tags` (POST /api/assets/tags tạo bản ghi có isActive).
 * Dùng khi BE trả `tags` nhưng chưa đồng bộ `nfcTag`/`qrTag` trên item.
 */
function pickActiveTagValueFromTags(
  tags: AssetItemFromApi["tags"],
  tagType: "NFC" | "QR_CODE"
): string | null {
  if (!tags?.length) return null;
  for (const t of tags) {
    if (t.tagType !== tagType) continue;
    if (t.isActive === false) continue;
    const v = t.tagValue;
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

/**
 * Chuẩn hóa một item từ BE: đảm bảo nfcTag, qrTag có giá trị dù BE trả về camelCase hay snake_case.
 * API GET /api/assets/items/house/:houseId đã được cập nhật trả về đầy đủ nfcTag, qrTag;
 * nếu BE trả snake_case (nfc_tag, qr_tag) thì map sang camelCase để màn danh sách & chi tiết hiển thị đúng.
 */
function normalizeAssetItemFromResponse(
  raw: AssetItemFromApi & {
    nfc_tag?: string | null;
    qr_tag?: string | null;
    function_area_id?: string | null;
    functionalAreaId?: string | null;
    functional_area_id?: string | null;
  }
): AssetItemFromApi {
  const nfc = raw.nfcTag ?? raw.nfc_tag ?? null;
  const qr = raw.qrTag ?? raw.qr_tag ?? null;
  let nfcStr = nfc != null ? String(nfc).trim() : "";
  let qrStr = qr != null ? String(qr).trim() : "";
  const fromTagsNfc = pickActiveTagValueFromTags(raw.tags, "NFC");
  const fromTagsQr = pickActiveTagValueFromTags(raw.tags, "QR_CODE");
  if (!nfcStr && fromTagsNfc) nfcStr = fromTagsNfc;
  if (!qrStr && fromTagsQr) qrStr = fromTagsQr;
  const functionAreaId =
    raw.functionAreaId ??
    raw.functionalAreaId ??
    raw.function_area_id ??
    raw.functional_area_id ??
    null;
  return {
    ...raw,
    nfcTag: nfcStr !== "" ? nfcStr : null,
    qrTag: qrStr !== "" ? qrStr : null,
    status: normalizeAssetItemStatusFromApi(raw.status),
    functionAreaId:
      functionAreaId != null && String(functionAreaId).trim() !== ""
        ? String(functionAreaId).trim()
        : null,
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
    ? `${ASSETS_API_BASE}/assets/items?${query}`
    : `${ASSETS_API_BASE}/assets/items`;

  const response = await axiosClient.get<AssetItemsApiResponse>(url);
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
 * Lấy danh sách thiết bị theo houseId (GET /api/assets/items/house/:houseId).
 * Dùng cho tenant: lấy toàn bộ thiết bị thuộc nhà đang thuê.
 * BE đã cập nhật trả về đầy đủ từng item (gồm nfcTag, qrTag) để màn danh sách và chi tiết hiển thị đúng.
 * Response format { data: AssetItemFromApi[], message?, ... }; mảng data được chuẩn hóa (hỗ trợ cả snake_case từ BE).
 */
export const getAssetItemsByHouseId = async (
  houseId: string
): Promise<AssetItemsApiResponse> => {
  const response = await axiosClient.get<AssetItemsApiResponse>(
    `${ASSETS_API_BASE}/assets/items/house/${encodeURIComponent(houseId)}`
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
 * Lấy thiết bị IoT của một nhà (GET /api/assets/iot-devices/house/{houseId}).
 * Response format theo swagger: ApiResponse<{...controller..., devices:[...node...]}>.
 */
export const getIotDevicesByHouseId = async (
  houseId: string
): Promise<IotDevicesByHouseApiResponse> => {
  const url = `${FALLBACK_BACKEND_URL}/assets/iot-devices/house/${encodeURIComponent(houseId)}`;
  const response = await axiosClient.get<IotDevicesByHouseApiResponse>(url);
  return response.data;
};

/**
 * Lấy chi tiết thiết bị theo ID (GET /api/assets/items/:id).
 * Dùng path /assets/... thống nhất với GET /api/assets/items/house/:houseId.
 */
export const getAssetItemById = async (id: string): Promise<AssetItemFromApi | undefined> => {
  try {
    const response = await axiosClient.get<UpdateAssetItemApiResponse | AssetItemFromApi>(
      `${FALLBACK_BACKEND_URL}/assets/items/${id}`
    );
    const envelope = response.data as unknown;
    let rawUnknown: unknown;
    if (
      envelope &&
      typeof envelope === "object" &&
      "data" in envelope &&
      (envelope as { data: unknown }).data != null &&
      typeof (envelope as { data: unknown }).data === "object"
    ) {
      rawUnknown = (envelope as { data: AssetItemFromApi }).data;
    } else if (envelope && typeof envelope === "object" && "id" in (envelope as object)) {
      rawUnknown = envelope;
    } else {
      return undefined;
    }
    const raw = rawUnknown as AssetItemFromApi & {
      nfc_tag?: string | null;
      qr_tag?: string | null;
      function_area_id?: string | null;
      functionalAreaId?: string | null;
      functional_area_id?: string | null;
    };
    return normalizeAssetItemFromResponse(raw);
  } catch {
    return undefined;
  }
};


/**
 * Tra cứu thiết bị sau khi quét NFC hoặc QR (GET /api/assets/tags/asset/{tagValue}).
 * `data` trong response có thể là một object (Postman) hoặc mảng (tương thích cũ).
 */
export const getAssetItemByTag = async (
  tagValue: string
): Promise<AssetItemFromApi | undefined> => {
  const normalized = tagValue.trim();
  if (!normalized) return undefined;
  const apiTagValue = normalizeTagValueForApi(normalized);

  const tagMatchesScanned = (val: string | null | undefined) => {
    if (val == null || String(val).trim() === "") return false;
    return (
      normalizeTagValueForCompare(String(val)) === normalizeTagValueForCompare(apiTagValue)
    );
  };

  try {
    const response = await axiosClient.get<GetAssetByTagValueApiResponse>(
      `${FALLBACK_BACKEND_URL}/assets/tags/asset/${encodeURIComponent(apiTagValue)}`
    );

    const responseData = response.data.data;

    let raw: AssetItemFromApi | undefined;

    if (Array.isArray(responseData)) {
      raw = responseData[0];
    } else if (responseData && typeof responseData === "object") {
      raw = responseData as AssetItemFromApi;
    }

    if (!raw) return undefined;

    return normalizeAssetItemFromResponse(
      raw as AssetItemFromApi & {
        nfc_tag?: string | null;
        qr_tag?: string | null;
        function_area_id?: string | null;
      }
    );
  } catch {
    try {
      const res = await getAssetItems();
      const found = res.data.find((d) => {
        const item = normalizeAssetItemFromResponse(
          d as AssetItemFromApi & {
            nfc_tag?: string | null;
            qr_tag?: string | null;
            function_area_id?: string | null;
          }
        );
        if (tagMatchesScanned(item.nfcTag) || tagMatchesScanned(item.qrTag)) return true;
        return item.tags?.some(
          (t) => t.isActive !== false && tagMatchesScanned(t.tagValue)
        );
      });
      return found ? normalizeAssetItemFromResponse(found as AssetItemFromApi & { nfc_tag?: string | null; qr_tag?: string | null }) : undefined;
    } catch {
      return undefined;
    }
  }
};

/** Alias cho backward compatibility nếu cần, hoặc dùng trực tiếp getAssetItemByTag */
export const getAssetItemByNfcId = getAssetItemByTag;

/** Gửi body POST/PUT asset item dạng snake_case — bật bằng EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE=true */
const useSnakeCasePutBody =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE === "true";

/**
 * Tạo thiết bị mới (POST /api/assets/items).
 * Body camelCase hoặc snake_case (cùng cờ EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE như PUT); gửi cả functionAreaId/functionalAreaId.
 */
function pickFirstNonEmptyString(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s !== "") return s;
  }
  return null;
}

export const createAssetItem = async (
  payload: CreateAssetItemRequest
): Promise<CreateAssetItemApiResponse> => {
  const functionAreaId = pickFirstNonEmptyString(payload.functionAreaId);
  const nfcForPost = pickFirstNonEmptyString(payload.nfcId, payload.nfcTag);
  const qrForPost = pickFirstNonEmptyString(payload.qrId, payload.qrTag);

  const body = useSnakeCasePutBody
    ? {
        house_id: payload.houseId,
        category_id: payload.categoryId,
        display_name: payload.displayName,
        serial_number: payload.serialNumber,
        nfc_id: nfcForPost,
        qr_id: qrForPost,
        condition_percent: payload.conditionPercent,
        status: payload.status,
        function_area_id: functionAreaId,
      }
    : {
        houseId: payload.houseId,
        categoryId: payload.categoryId,
        displayName: payload.displayName,
        serialNumber: payload.serialNumber,
        ...(nfcForPost ? { nfcId: nfcForPost } : {}),
        ...(qrForPost ? { qrId: qrForPost } : {}),
        conditionPercent: payload.conditionPercent,
        status: payload.status,
        ...(functionAreaId ? { functionAreaId } : {}),
      };

  const response = await axiosClient.post<CreateAssetItemApiResponse>(
    `${FALLBACK_BACKEND_URL}/assets/items`,
    body
  );
  const res = response.data;
  if (res?.data && typeof res.data === "object") {
    return {
      ...res,
      data: normalizeAssetItemFromResponse(
        res.data as AssetItemFromApi & {
          nfc_tag?: string | null;
          qr_tag?: string | null;
          function_area_id?: string | null;
          functionalAreaId?: string | null;
          functional_area_id?: string | null;
        }
      ),
    };
  }
  return res;
};

/**
 * Cập nhật thiết bị (PUT /api/asset/items/:id).
 * Body đủ 7 trường. Mặc định camelCase; nếu EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE=true thì gửi snake_case.
 * Backend phải map cả houseId/house_id và categoryId/category_id thì mới cập nhật được nhà/danh mục.
 */
export const updateAssetItem = async (
  id: string,
  payload: UpdateAssetItemRequest
): Promise<UpdateAssetItemApiResponse> => {
  const functionAreaId = pickFirstNonEmptyString(payload.functionAreaId);
  const nfcForPut = pickFirstNonEmptyString(payload.nfcId, payload.nfcTag);
  const qrForPut = pickFirstNonEmptyString(payload.qrId, payload.qrTag);

  const body = useSnakeCasePutBody
    ? {
        house_id: payload.houseId,
        category_id: payload.categoryId,
        display_name: payload.displayName,
        serial_number: payload.serialNumber,
        nfc_tag: nfcForPut,
        nfc_id: nfcForPut,
        qr_tag: qrForPut,
        qr_id: qrForPut,
        condition_percent: payload.conditionPercent,
        status: payload.status,
        function_area_id: functionAreaId,
        functional_area_id: functionAreaId,
      }
    : {
        houseId: payload.houseId,
        categoryId: payload.categoryId,
        displayName: payload.displayName,
        serialNumber: payload.serialNumber,
        nfcTag: nfcForPut,
        nfcId: nfcForPut,
        qrTag: qrForPut,
        qrId: qrForPut,
        conditionPercent: payload.conditionPercent,
        status: payload.status,
        functionAreaId,
        functionalAreaId: functionAreaId,
        /** Một số BE chỉ map snake_case vào DTO — gửi kèm camel để tránh mất khu vực. */
        function_area_id: functionAreaId,
        functional_area_id: functionAreaId,
      };

  const putUrl = `${FALLBACK_BACKEND_URL}/assets/items/${encodeURIComponent(id)}`;

  const response = await axiosClient.put<UpdateAssetItemApiResponse>(putUrl, body);
  const res = response.data;

  if (res?.data && typeof res.data === "object") {
    return {
      ...res,
      data: normalizeAssetItemFromResponse(
        res.data as AssetItemFromApi & {
          nfc_tag?: string | null;
          qr_tag?: string | null;
          function_area_id?: string | null;
          functionalAreaId?: string | null;
          functional_area_id?: string | null;
        }
      ),
    };
  }
  return res;
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
    `${FALLBACK_BACKEND_URL}/assets/items/${id}/transfer`,
    { newHouseId }
  );
  const res = response.data;
  if (res?.data && typeof res.data === "object") {
    return {
      ...res,
      data: normalizeAssetItemFromResponse(
        res.data as AssetItemFromApi & {
          nfc_tag?: string | null;
          qr_tag?: string | null;
          function_area_id?: string | null;
          functionalAreaId?: string | null;
          functional_area_id?: string | null;
        }
      ),
    };
  }
  return res;
};

/**
 * Xóa thiết bị (DELETE /api/asset/items/:id).
 */
export const deleteAssetItem = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.delete<{ success: boolean; message?: string }>(
    `${FALLBACK_BACKEND_URL}/assets/items/${id}`
  );
  return response.data;
};

/**
 * Gán tag NFC hoặc QR vào thiết bị (POST /api/assets/tags).
 * Body: `{ assetId, tagValue, tagType }` với `tagType`: `"NFC"` | `"QR_CODE"`.
 */
export const attachAssetTag = async (
  payload: AttachAssetTagRequest
): Promise<AttachAssetTagApiResponse> => {
  const body: AttachAssetTagRequest = {
    assetId: payload.assetId,
    tagValue: normalizeTagValueForApi(payload.tagValue),
    tagType: payload.tagType,
  };
  const response = await axiosClient.post<AttachAssetTagApiResponse>(
    `${FALLBACK_BACKEND_URL}/assets/tags`,
    body
  );
  return response.data;
};

/**
 * Gỡ tag NFC hoặc QR khỏi thiết bị (PUT /api/assets/tags/detach/{tagValue}, không body).
 * `tagValue` là đúng chuỗi đã gán (vd. `ISUMS-TAG-001`).
 */
export const detachAssetTag = async (
  tagValue: string
): Promise<DetachAssetTagApiResponse> => {
  const normalized = normalizeTagValueForApi(tagValue.trim());
  const response = await axiosClient.put<DetachAssetTagApiResponse>(
    `${FALLBACK_BACKEND_URL}/assets/tags/detach/${encodeURIComponent(normalized)}`
  );
  return response.data;
};

/**
 * Tháo (deprovision) controller IoT khỏi nhà.
 * API: DELETE /api/assets/houses/{houseId}/iot/deprovision
 */
export const deprovisionIotControllerByHouseId = async (
  houseId: string
): Promise<ApiResponse<string>> => {
  const response = await axiosClient.delete<ApiResponse<string>>(
    `${FALLBACK_BACKEND_URL}/assets/houses/${encodeURIComponent(houseId)}/iot/deprovision`
  );
  return response.data;
};

/**
 * Gắn (provision) controller IoT vào nhà.
 * API: POST /api/assets/houses/{houseId}/iot/provision
 * Body: { deviceId, areaId }
 */
export const provisionIotControllerByHouseId = async (
  houseId: string,
  payload: IotProvisionRequest
): Promise<IotProvisionApiResponse> => {
  const response = await axiosClient.post<IotProvisionApiResponse>(
    `${ASSETS_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision`,
    payload
  );
  return response.data;
};

/** Node: xin token provision theo serial. API: POST /api/assets/iot/provision-token */
export const getIotProvisionTokenBySerial = async (
  payload: IotProvisionTokenRequest
): Promise<IotProvisionTokenApiResponse> => {
  const response = await axiosClient.post<IotProvisionTokenApiResponse>(
    `${ASSETS_API_BASE}/assets/iot/provision-token`,
    payload
  );
  return response.data;
};

/** Node: lấy controller theo house để lấy MAC/deviceId. API: GET /api/assets/houses/{houseId}/iot/controller */
export const getIotControllerByHouseId = async (
  houseId: string
): Promise<IotControllerByHouseApiResponse> => {
  const response = await axiosClient.get<IotControllerByHouseApiResponse>(
    `${ASSETS_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/controller`
  );
  return response.data;
};

/** Node: gắn node vào house. API: POST /api/assets/houses/{houseId}/iot/provision-node */
export const provisionIotNodeByHouseId = async (
  houseId: string,
  payload: IotProvisionNodeRequest
): Promise<IotProvisionNodeApiResponse> => {
  const response = await axiosClient.post<IotProvisionNodeApiResponse>(
    `${ASSETS_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision-node`,
    payload
  );
  return response.data;
};

export type AssetItemImageToUpload = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

export type AssetItemImageFromApi = {
  id: string;
  url: string;
  createdAt?: string | null;
};

/**
 * Lấy danh sách ảnh của asset item.
 * Endpoint (theo Postman trong ảnh bạn gửi): GET /api/assets/items/:id/images
 */
export const getAssetItemImages = async (
  itemId: string,
  cacheBust?: number,
): Promise<AssetItemImageFromApi[]> => {
  if (!itemId?.trim()) return [];
  const baseUrl = `${ASSETS_API_BASE}/assets/items/${encodeURIComponent(itemId)}/images`;
  const url = cacheBust ? `${baseUrl}?t=${encodeURIComponent(String(cacheBust))}` : baseUrl;
  const devLog =
    typeof __DEV__ !== "undefined" && __DEV__
      ? (...args: any[]) => console.log(...args)
      : null;

  try {
    devLog?.("[assetItemApi] getAssetItemImages -> GET", { itemId, url });
    const response = await axiosClient.get<ApiResponse<AssetItemImageFromApi[]>>(url);
    const ok = Boolean(response?.data?.success);
    const count = Array.isArray(response?.data?.data) ? response.data.data.length : -1;
    devLog?.("[assetItemApi] getAssetItemImages <-", {
      itemId,
      ok,
      count,
      statusCode: response?.data?.statusCode,
      message: response?.data?.message,
    });

    if (ok && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (e) {
    devLog?.("[assetItemApi] getAssetItemImages ERROR", { itemId, url, error: String(e) });
    return [];
  }
};

/**
 * Upload ảnh đính kèm cho asset item.
 * Endpoint (theo Postman trong ảnh bạn gửi): POST /api/assets/items/:id/images
 * FormData key: `files`, mỗi phần tử là file ảnh dạng jpg/png...
 */
export const uploadAssetItemImages = async (
  itemId: string,
  images: AssetItemImageToUpload[],
): Promise<void> => {
  if (!itemId?.trim() || images.length === 0) return;

  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error("Missing auth token for asset item image upload");
  }

  const url = `${ASSETS_API_BASE}/assets/items/${encodeURIComponent(itemId)}/images`;
  const formData = new FormData();

  images.forEach((img, idx) => {
    const name = img.fileName ?? `asset-${itemId}-${idx}.jpg`;
    const type = img.mimeType ?? "image/jpeg";
    formData.append(
      "files",
      {
        uri: img.uri,
        name,
        type,
      } as any,
    );
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": i18n.language || "vi",
    },
    body: formData,
  });

  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  const success = parsed && typeof parsed === "object" ? parsed.success : undefined;
  const message =
    parsed && typeof parsed === "object" && "message" in parsed ? (parsed as { message: string }).message : undefined;

  if (!response.ok || success === false) {
    throw new Error(message || `Upload asset item images failed (HTTP ${response.status})`);
  }
};

/**
 * Xóa 1 ảnh của asset item.
 * Endpoint (theo Postman bạn gửi): DELETE /api/assets/items/:itemId/image/:imageId
 */
export const deleteAssetItemImage = async (
  itemId: string,
  imageId: string,
): Promise<void> => {
  const normalizedItemId = String(itemId ?? "").trim();
  const normalizedImageId = String(imageId ?? "").trim();
  if (!normalizedItemId || !normalizedImageId) {
    throw new Error("Missing itemId or imageId for deleting asset item image");
  }

  const url = `${ASSETS_API_BASE}/assets/items/${encodeURIComponent(normalizedItemId)}/image/${encodeURIComponent(normalizedImageId)}`;
  const response = await axiosClient.delete<ApiResponse<null>>(url);
  const ok = Boolean(response?.data?.success);
  if (!ok) {
    throw new Error(
      response?.data?.message || "Delete asset item image failed",
    );
  }
};

