/**
 * API liên quan đến thiết bị (asset items).
 * GET /api/assets/items, POST, PUT, DELETE /api/assets/items/:id.
 */
import { isAxiosError } from "axios";
import axiosClient from "../api/axiosClient";
import { logInspectionDebug, logInspectionError } from "../utils/inspectionDebugLog";
import { ASSETS_API_BASE, BACKEND_API_BASE } from "../api/config";
import i18n from "../i18n";
import { resolveLocalizedJsonStringFromI18n } from "../utils/resolveLocalizedJsonString";
import { useAuthStore } from "../../store/useAuthStore";
import {
  normalizeAssetItemStatusFromApi,
  type AssetItemFromApi,
  type AssetItemImageFromApi,
  type AssetItemsApiResponse,
  type AssetItemsParams,
  type CreateAssetItemRequest,
  type CreateAssetItemApiResponse,
  type UpdateAssetItemRequest,
  type UpdateAssetItemApiResponse,
  type IotControllerHouseDataFromApi,
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
  type AssetMaintenanceBatchUpdateRequest,
  type AssetMaintenanceBatchUpdateApiResponse,
} from "../types/api";

export type { AssetItemImageFromApi };

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
export function normalizeTagValueForCompare(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, "").toUpperCase();
}

/** BE trả 409 hoặc message trùng tag khi POST /assets/tags hoặc PUT item. */
export function isDuplicateTagConflictError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 409) return true;
  const data = error.response?.data as { message?: string } | undefined;
  const msg = String(data?.message ?? error.message ?? "").toLowerCase();
  if (status === 400 && /duplicate|already|exists|conflict|trùng|đã/.test(msg)) return true;
  return /duplicate|already.*(assigned|exist)|tag.*(exist|taken)|conflict/i.test(msg);
}

/**
 * Lấy tagValue đang active từ mảng `tags` (POST /api/assets/tags tạo bản ghi có isActive).
 * Dùng khi BE trả `tags` nhưng chưa đồng bộ `nfcTag`/`qrTag` trên item.
 */
function pickActiveTagValueFromTags(
  tags: AssetItemFromApi["tags"],
  tagType: "NFC" | "QR_CODE"
): string | null {
  if (!Array.isArray(tags) || tags.length === 0) return null;
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
    displayName: resolveLocalizedJsonStringFromI18n(raw.displayName),
    nfcTag: nfcStr !== "" ? nfcStr : null,
    qrTag: qrStr !== "" ? qrStr : null,
    status: normalizeAssetItemStatusFromApi(raw.status),
    functionAreaId:
      functionAreaId != null && String(functionAreaId).trim() !== ""
        ? String(functionAreaId).trim()
        : null,
  };
}

function normalizeIotControllerHouseData(
  data: IotControllerHouseDataFromApi
): IotControllerHouseDataFromApi {
  return {
    ...data,
    houseName: resolveLocalizedJsonStringFromI18n(data.houseName),
    areaName: data.areaName != null ? resolveLocalizedJsonStringFromI18n(data.areaName) : null,
    devices: (data.devices ?? []).map((d) => ({
      ...d,
      displayName: resolveLocalizedJsonStringFromI18n(d.displayName),
      areaName: d.areaName != null ? resolveLocalizedJsonStringFromI18n(d.areaName) : null,
    })),
  };
}

/**
 * NFC/QR hiệu lực sau khi gộp trường gốc + tag active trong `tags` — cùng logic {@link normalizeAssetItemFromResponse}.
 * Dùng khi lọc “thiết bị chưa gán tag” (vd. modal gán NFC/QR), tránh lệch với danh sách đã chuẩn hóa.
 */
export function getResolvedAssetItemTagValues(
  raw: AssetItemFromApi
): { nfcTag: string | null; qrTag: string | null } {
  const n = normalizeAssetItemFromResponse(
    raw as AssetItemFromApi & { nfc_tag?: string | null; qr_tag?: string | null }
  );
  return { nfcTag: n.nfcTag, qrTag: n.qrTag };
}

/**
 * BE có thể trả `data` là mảng hoặc gói paginated / lồng nhau.
 * Chuẩn hóa về mảng để hook/UI không gọi `.filter` trên non-array
 * (object truthy làm `?? []` không chạy → lỗi "filter is not a function").
 */
function coerceAssetItemsArray(raw: unknown): AssetItemFromApi[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw as AssetItemFromApi[];
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const pick = (v: unknown) => (Array.isArray(v) ? (v as AssetItemFromApi[]) : null);
    for (const k of ["items", "results", "data", "content", "assetItems", "records", "value"] as const) {
      const arr = pick(o[k]);
      if (arr) return arr;
    }
    if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
      return coerceAssetItemsArray(o.data);
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v as AssetItemFromApi[];
    }
  }
  return [];
}

/**
 * Dùng tại màn/hook khi đọc `itemsData?.data` từ cache — luôn được mảng (có thể rỗng).
 */
export function asAssetItemArray(raw: unknown): AssetItemFromApi[] {
  return coerceAssetItemsArray(raw);
}

function assetItemsFromAxiosBody(
  body: unknown,
  finalize: (items: AssetItemFromApi[]) => AssetItemFromApi[]
): AssetItemsApiResponse {
  if (Array.isArray(body)) {
    const rawList = coerceAssetItemsArray(body);
    return { data: finalize(rawList as AssetItemFromApi[]) };
  }
  if (body && typeof body === "object" && "data" in body) {
    const envelope = body as AssetItemsApiResponse;
    const rawList = coerceAssetItemsArray(envelope.data);
    return {
      ...envelope,
      data: finalize(rawList as AssetItemFromApi[]),
    };
  }
  return { data: finalize([]) };
}

const mapNormalizeAssetItemRow = (i: AssetItemFromApi) =>
  normalizeAssetItemFromResponse(
    i as AssetItemFromApi & { nfc_tag?: string | null; qr_tag?: string | null }
  );

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

  const response = await axiosClient.get<unknown>(url);
  return assetItemsFromAxiosBody(response.data, (items) => items.map(mapNormalizeAssetItemRow));
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
  const response = await axiosClient.get<unknown>(
    `${BACKEND_API_BASE}/assets/items/house/${encodeURIComponent(houseId)}`
  );
  return assetItemsFromAxiosBody(response.data, (items) => items.map(mapNormalizeAssetItemRow));
};

/**
 * Lấy thiết bị IoT của một nhà (GET /api/assets/iot-devices/house/{houseId}).
 * Response format theo swagger: ApiResponse<{...controller..., devices:[...node...]}>.
 */
export const getIotDevicesByHouseId = async (
  houseId: string
): Promise<IotDevicesByHouseApiResponse> => {
  const url = `${BACKEND_API_BASE}/assets/iot-devices/house/${encodeURIComponent(houseId)}`;
  const response = await axiosClient.get<IotDevicesByHouseApiResponse>(url);
  const body = response.data;
  if (!body?.data || typeof body.data !== "object") return body;
  return {
    ...body,
    data: normalizeIotControllerHouseData(body.data),
  };
};

/**
 * Lấy chi tiết thiết bị theo ID (GET /api/assets/items/:id).
 * Dùng path /assets/... thống nhất với GET /api/assets/items/house/:houseId.
 */
export const getAssetItemById = async (id: string): Promise<AssetItemFromApi | undefined> => {
  try {
    const response = await axiosClient.get<UpdateAssetItemApiResponse | AssetItemFromApi>(
      `${BACKEND_API_BASE}/assets/items/${id}`
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
 *
 * Không fallback sang GET /assets/items + quét list: sau khi gỡ tag, endpoint theo tag có thể trả 404
 * trong khi danh sách item vẫn còn trường nfcTag/tags lệch — dễ “tìm thấy” thiết bị dù tag đã detached.
 */
export const getAssetItemByTag = async (
  tagValue: string
): Promise<AssetItemFromApi | undefined> => {
  const normalized = tagValue.trim();
  if (!normalized) return undefined;
  const apiTagValue = normalizeTagValueForApi(normalized);

  try {
    const response = await axiosClient.get<GetAssetByTagValueApiResponse>(
      `${BACKEND_API_BASE}/assets/tags/asset/${encodeURIComponent(apiTagValue)}`
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
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 400 || status === 410) {
        return undefined;
      }
    }
    return undefined;
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
  const noteForApi =
    payload.note === undefined || payload.note === null
      ? ""
      : String(payload.note).trim();

  const body = useSnakeCasePutBody
    ? {
        house_id: payload.houseId,
        category_id: payload.categoryId,
        display_name: payload.displayName,
        serial_number: payload.serialNumber,
        nfc_id: nfcForPost,
        qr_id: qrForPost,
        condition_percent: payload.conditionPercent,
        note: noteForApi,
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
        note: noteForApi,
        status: payload.status,
        ...(functionAreaId ? { functionAreaId } : {}),
      };

  const response = await axiosClient.post<CreateAssetItemApiResponse>(
    `${BACKEND_API_BASE}/assets/items`,
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
 * Body gồm các trường create + `note`. Mặc định camelCase; nếu EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE=true thì gửi snake_case.
 * Backend phải map cả houseId/house_id và categoryId/category_id thì mới cập nhật được nhà/danh mục.
 */
export const updateAssetItem = async (
  id: string,
  payload: UpdateAssetItemRequest
): Promise<UpdateAssetItemApiResponse> => {
  const functionAreaId = pickFirstNonEmptyString(payload.functionAreaId);
  const nfcForPut = pickFirstNonEmptyString(payload.nfcId, payload.nfcTag);
  const qrForPut = pickFirstNonEmptyString(payload.qrId, payload.qrTag);
  const noteForApi =
    payload.note === undefined || payload.note === null
      ? ""
      : String(payload.note).trim();

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
        note: noteForApi,
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
        note: noteForApi,
        status: payload.status,
        functionAreaId,
        functionalAreaId: functionAreaId,
        /** Một số BE chỉ map snake_case vào DTO — gửi kèm camel để tránh mất khu vực. */
        function_area_id: functionAreaId,
        functional_area_id: functionAreaId,
      };

  const putUrl = `${BACKEND_API_BASE}/assets/items/${encodeURIComponent(id)}`;

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
 * Batch cập nhật thông tin bảo trì cho nhiều thiết bị.
 * API: PUT /api/assets/items/maintenance/batch
 *
 * Body: **một object** `BatchUpdateAssetRequest` — `{ jobId, updates: [...] }` (BE Java không nhận mảng bọc ngoài).
 * Ảnh gắn sự kiện: POST /assets/events/:eventId/images sau khi có `data.events` (thường khi hoàn tất công việc).
 */
export const updateAssetItemsMaintenanceBatch = async (
  payload: AssetMaintenanceBatchUpdateRequest
): Promise<AssetMaintenanceBatchUpdateApiResponse> => {
  const url = `${BACKEND_API_BASE}/assets/items/maintenance/batch`;

  try {
    logInspectionDebug("[AssetBatch]", "updateAssetItemsMaintenanceBatch", {
      jobId: payload.jobId,
      updateCount: payload.updates?.length ?? 0,
    });

    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error("Missing auth token for maintenance batch update");
    }

    const updatesJson = payload.updates.map((u) => {
      const row: {
        assetId: string;
        conditionPercent: number;
        note: string;
        status?: string;
      } = {
        assetId: u.assetId,
        conditionPercent: u.conditionPercent,
        note: u.note,
      };
      if (u.status != null && String(u.status).trim() !== "") {
        row.status = u.status;
      }
      return row;
    });

    const body = JSON.stringify({ jobId: payload.jobId, updates: updatesJson });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Accept-Language": i18n.language || "vi",
      "Content-Type": "application/json",
    };
    if (url.includes("ngrok")) {
      headers["ngrok-skip-browser-warning"] = "true";
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body,
    });

    const rawText = await response.text();
    let parsed: AssetMaintenanceBatchUpdateApiResponse | null = null;
    try {
      parsed = rawText ? (JSON.parse(rawText) as AssetMaintenanceBatchUpdateApiResponse) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok || !parsed) {
      const msg =
        parsed && typeof parsed === "object" && "message" in parsed
          ? (parsed as { message?: string }).message
          : undefined;
      const snippet =
        rawText && rawText.length > 0
          ? rawText.length > 400
            ? `${rawText.slice(0, 400)}…`
            : rawText
          : "(empty body)";
      logInspectionError("[AssetBatch]", "batch HTTP/parse", new Error(msg || `HTTP ${response.status}`), {
        status: response.status,
        bodySnippet: snippet,
      });
      throw new Error(msg || `Maintenance batch failed (HTTP ${response.status})`);
    }
    if (parsed.success === false) {
      throw new Error(parsed.message || "Maintenance batch failed");
    }

    logInspectionDebug("[AssetBatch]", "batch ok", {
      status: response.status,
      success: parsed.success,
    });
    return parsed;
  } catch (e: unknown) {
    logInspectionError("[AssetBatch]", "batch failed", e);
    throw e;
  }
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
    `${BACKEND_API_BASE}/assets/items/${id}`
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
    `${BACKEND_API_BASE}/assets/tags`,
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
    `${BACKEND_API_BASE}/assets/tags/detach/${encodeURIComponent(normalized)}`
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
    `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/deprovision`
   // `https://api-dev.isums.pro/api/assets/houses/${encodeURIComponent(houseId)}/iot/deprovision`
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
   // `${ASSETS_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision`,
   `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision`,
    payload
  );
  return response.data;
};

/** Node: xin token provision theo serial. API: POST /api/assets/iot/provision-token */
export const getIotProvisionTokenBySerial = async (
  payload: IotProvisionTokenRequest
): Promise<IotProvisionTokenApiResponse> => {
  const response = await axiosClient.post<IotProvisionTokenApiResponse>(
    //`${ASSETS_API_BASE}/assets/iot/provision-token`,
    `${BACKEND_API_BASE}/assets/iot/provision-token`,
    payload
  );
  return response.data;
};

/** Node: lấy controller theo house để lấy MAC/deviceId. API: GET /api/assets/houses/{houseId}/iot/controller */
export const getIotControllerByHouseId = async (
  houseId: string
): Promise<IotControllerByHouseApiResponse> => {
  const response = await axiosClient.get<IotControllerByHouseApiResponse>(
    //`${ASSETS_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/controller`
    `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/controller`
  );
  return response.data;
};

/** Node: gắn node vào house. API: POST /api/assets/houses/{houseId}/iot/provision-node */
export const provisionIotNodeByHouseId = async (
  houseId: string,
  payload: IotProvisionNodeRequest
): Promise<IotProvisionNodeApiResponse> => {
  const response = await axiosClient.post<IotProvisionNodeApiResponse>(
    //`${ASSETS_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision-node`,
    `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision-node`,
    payload
  );
  return response.data;
};

export type AssetItemImageToUpload = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

/** Gom nhiều lần gọi liên tiếp (cùng asset) trong cửa sổ ngắn → một request / kết quả tái sử dụng. */
const ASSET_ITEM_IMAGES_DEDUP_MS = 350;
const assetItemImagesInflight = new Map<string, Promise<AssetItemImageFromApi[]>>();
const assetItemImagesMicroCache = new Map<
  string,
  { at: number; data: AssetItemImageFromApi[] }
>();

/** Sau upload/xóa ảnh phải gọi để GET sau không trả micro-cache cũ (trùng itemId trong <350ms). */
export const invalidateAssetItemImagesCache = (itemId: string) => {
  const key = String(itemId ?? "").trim();
  if (!key) return;
  assetItemImagesMicroCache.delete(key);
  assetItemImagesInflight.delete(key);
};

/** BE có thể trả camelCase hoặc snake_case — map về AssetItemImageFromApi. */
function normalizeAssetItemImageRow(raw: unknown): AssetItemImageFromApi | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? o.imageId ?? "").trim();
  const url = String(o.url ?? o.imageUrl ?? o.image_url ?? "").trim();
  if (!id || !url) return null;
  const createdRaw = o.createdAt ?? o.created_at;
  return {
    id,
    url,
    createdAt:
      createdRaw != null && String(createdRaw).trim() !== ""
        ? String(createdRaw)
        : null,
  };
}

/**
 * Ảnh từ GET /api/assets/items/:id (trường `images` trên payload item).
 * Dùng khi BE nhúng ảnh trong response asset thay vì gọi GET .../images riêng.
 */
export function getImagesFromAssetItem(
  asset: AssetItemFromApi | undefined | null,
): AssetItemImageFromApi[] {
  if (!asset?.images || !Array.isArray(asset.images)) return [];
  return asset.images
    .map((raw) => normalizeAssetItemImageRow(raw))
    .filter((row): row is AssetItemImageFromApi => row != null);
}

/**
 * Lấy danh sách ảnh của asset item.
 * Endpoint (theo Postman trong ảnh bạn gửi): GET /api/assets/items/:id/images
 *
 * Cùng một `itemId`, nhiều lần gọi trong ~350ms hoặc trùng lúc request đang chạy sẽ dùng chung một
 * kết quả (giảm GET lặp khi staff inspection / màn chi tiết kích hoạt nhiều effect).
 */
export const getAssetItemImages = (
  itemId: string,
  cacheBust?: number,
): Promise<AssetItemImageFromApi[]> => {
  if (!itemId?.trim()) return Promise.resolve([]);
  const key = itemId.trim();
  const now = Date.now();

  const inflight = assetItemImagesInflight.get(key);
  if (inflight) return inflight;

  // Có cacheBust = caller muốn dữ liệu mới (sau mutation / tránh cache HTTP) — không dùng micro-cache theo itemId.
  const cached = assetItemImagesMicroCache.get(key);
  if (
    cacheBust === undefined &&
    cached &&
    now - cached.at < ASSET_ITEM_IMAGES_DEDUP_MS
  ) {
    return Promise.resolve(cached.data);
  }

  // Cùng ASSETS_API_BASE với upload/delete — tránh GET primary trong khi POST lên fallback/ngrok.
  const baseUrl = `${BACKEND_API_BASE}/assets/items/${encodeURIComponent(key)}/images`;
  //const baseUrl = `https://unrestrictable-lan-syzygial.ngrok-free.dev/api/assets/items/${encodeURIComponent(key)}/images`;
  const url = cacheBust ? `${baseUrl}?t=${encodeURIComponent(String(cacheBust))}` : baseUrl;

  const run = (async (): Promise<AssetItemImageFromApi[]> => {
    try {
      const response = await axiosClient.get<ApiResponse<AssetItemImageFromApi[]>>(url);
      const ok = Boolean(response?.data?.success);
      let data: AssetItemImageFromApi[] = [];
      if (ok && Array.isArray(response.data.data)) {
        data = response.data.data
          .map(normalizeAssetItemImageRow)
          .filter((row): row is AssetItemImageFromApi => row != null);
      }
      assetItemImagesMicroCache.set(key, { at: Date.now(), data });
      return data;
    } catch {
      return [];
    } finally {
      assetItemImagesInflight.delete(key);
    }
  })();

  assetItemImagesInflight.set(key, run);
  return run;
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

  const url = `${BACKEND_API_BASE}/assets/items/${encodeURIComponent(itemId)}/images`;
  //const url = `https://unrestrictable-lan-syzygial.ngrok-free.dev/api/assets/items/${encodeURIComponent(itemId)}/images`;
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

  invalidateAssetItemImagesCache(itemId);
};

/**
 * Upload ảnh gắn với một sự kiện bảo trì (sau batch PUT maintenance).
 * POST /api/assets/events/:eventId/images — form field `files` (lặp key, giống upload item).
 */
export const uploadAssetEventImages = async (
  eventId: string,
  images: AssetItemImageToUpload[]
): Promise<void> => {
  const id = String(eventId ?? "").trim();
  if (!id || images.length === 0) return;

  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error("Missing auth token for asset event image upload");
  }

  const url = `${BACKEND_API_BASE}/assets/events/${encodeURIComponent(id)}/images`;
  //const url = `https://unrestrictable-lan-syzygial.ngrok-free.dev/api/assets/events/${encodeURIComponent(id)}/images`;
  const formData = new FormData();

  images.forEach((img, idx) => {
    const name = img.fileName ?? `event-${id}-${idx}.jpg`;
    const type = img.mimeType ?? "image/jpeg";
    formData.append(
      "files",
      {
        uri: img.uri,
        name,
        type,
      } as any
    );
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Accept-Language": i18n.language || "vi",
  };
  if (url.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  const rawText = await response.text();
  let parsed: { success?: boolean; message?: string } | null = null;
  try {
    parsed = rawText ? (JSON.parse(rawText) as { success?: boolean; message?: string }) : null;
  } catch {
    parsed = null;
  }

  const success = parsed && typeof parsed === "object" ? parsed.success : undefined;
  const message = parsed?.message;

  if (!response.ok || success === false) {
    throw new Error(message || `Upload asset event images failed (HTTP ${response.status})`);
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

  const url = `${BACKEND_API_BASE}/assets/items/${encodeURIComponent(normalizedItemId)}/image/${encodeURIComponent(normalizedImageId)}`;
  //const url = `https://unrestrictable-lan-syzygial.ngrok-free.dev/api/assets/items/${encodeURIComponent(normalizedItemId)}/image/${encodeURIComponent(normalizedImageId)}`;
  const response = await axiosClient.delete<ApiResponse<null>>(url);
  const ok = Boolean(response?.data?.success);
  if (!ok) {
    throw new Error(
      response?.data?.message || "Delete asset item image failed",
    );
  }

  invalidateAssetItemImagesCache(normalizedItemId);
};

