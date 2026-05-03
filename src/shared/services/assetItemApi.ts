import { isAxiosError } from "axios";
import axiosClient from "../api/axiosClient";
import { logInspectionDebug, logInspectionError } from "../utils/inspectionDebugLog";
import { logFetchAbortTimeout } from "../utils/clientNetworkTimeoutLog";
import {
  API_REQUEST_TIMEOUT_MS,
  ASSET_IMAGE_UPLOAD_TIMEOUT_MS,
  ASSET_ITEM_MUTATION_TIMEOUT_MS,
  BACKEND_API_BASE,
} from "../api/config";
import i18n from "../i18n";
import {
  mergeTranslationMapsFromApi,
  resolveLocalizedApiFieldFromI18n,
  resolveLocalizedJsonStringFromI18n,
  toAppLocaleCode,
} from "../utils/resolveLocalizedJsonString";
import { useAuthStore } from "../../store/useAuthStore";
import {
  normalizeAssetItemStatusFromApi,
  type AssetCategoryEmbeddedFromApi,
  type AssetItemFromApi,
  type AssetItemImageFromApi,
  type AssetItemsApiResponse,
  type AssetItemsParams,
  type CreateAssetItemRequest,
  type CreateAssetItemApiResponse,
  type AssetItemDisplayNameMap,
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
  type AssetMaintenanceBatchUpdateData,
  type AssetMaintenanceBatchEventRef,
} from "../types/api";

export type { AssetItemImageFromApi };

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
    if (name === "AbortError") {
      logFetchAbortTimeout(url, timeoutMs);
      throw new Error(i18n.t("common.server_not_responding"));
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

const normalizeTagValueForApi = (raw: string) => raw.trim();

export function normalizeTagValueForCompare(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, "").toUpperCase();
}

export function isDuplicateTagConflictError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 409) return true;
  const data = error.response?.data as { message?: string } | undefined;
  const msg = String(data?.message ?? error.message ?? "").toLowerCase();
  if (status === 400 && /duplicate|already|exists|conflict|trùng|đã/.test(msg)) return true;
  return /duplicate|already.*(assigned|exist)|tag.*(exist|taken)|conflict/i.test(msg);
}

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

function normalizeEmbeddedCategory(
  c: AssetCategoryEmbeddedFromApi | undefined | null
): AssetCategoryEmbeddedFromApi | undefined {
  if (!c || typeof c !== "object") return undefined;
  const r = c as AssetCategoryEmbeddedFromApi & {
    name_translations?: Record<string, unknown>;
    description_translations?: Record<string, unknown>;
  };
  const nameMap = mergeTranslationMapsFromApi(
    r.nameTranslations as Record<string, unknown> | undefined,
    r.name_translations
  );
  const descMap = mergeTranslationMapsFromApi(
    r.descriptionTranslations as Record<string, unknown> | undefined,
    r.description_translations
  );
  return {
    ...c,
    name: resolveLocalizedApiFieldFromI18n(r.name, nameMap),
    description: resolveLocalizedApiFieldFromI18n(r.description, descMap),
  };
}

function pickDisplayStringForResolve(
  raw: AssetItemFromApi & {
    displayName?: unknown;
    translations?: Record<string, unknown> | null;
  }
): string | null | undefined {
  const tr = raw.translations;
  if (tr && typeof tr === "object" && !Array.isArray(tr)) {
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(tr)) {
      if (typeof v === "string" && v.trim() !== "") filtered[k] = v;
    }
    if (Object.keys(filtered).length > 0) return JSON.stringify(filtered);
  }
  const displayRaw = raw.displayName as unknown;
  if (typeof displayRaw === "string" || displayRaw == null) {
    return displayRaw as string | null | undefined;
  }
  if (typeof displayRaw === "object" && !Array.isArray(displayRaw)) {
    return JSON.stringify(displayRaw);
  }
  return String(displayRaw);
}

function canonicalEnglishDisplayNameFromDisplayNameField(displayRaw: unknown): string {
  if (displayRaw == null) return "";
  if (typeof displayRaw === "string") return displayRaw.trim();
  if (typeof displayRaw === "object" && !Array.isArray(displayRaw)) {
    const o = displayRaw as Record<string, unknown>;
    const en = o.en;
    if (typeof en === "string" && en.trim() !== "") return en.trim();
    return "";
  }
  return String(displayRaw).trim();
}

function displayNameFieldToMap(displayRaw: unknown): Record<string, string> | undefined {
  if (!displayRaw || typeof displayRaw !== "object" || Array.isArray(displayRaw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(displayRaw as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim() !== "") out[k] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function resolveAssetItemDisplayNameForUi(
  raw: AssetItemFromApi & { displayName?: unknown; translations?: Record<string, unknown> | null }
): string {
  const trMap = mergeTranslationMapsFromApi(
    raw.translations as Record<string, unknown> | undefined
  );
  const displayMap = displayNameFieldToMap(raw.displayName);
  const merged = mergeTranslationMapsFromApi(trMap, displayMap);
  const canonical = canonicalEnglishDisplayNameFromDisplayNameField(raw.displayName);

  if (merged && Object.keys(merged).length > 0) {
    return resolveLocalizedApiFieldFromI18n(canonical || null, merged);
  }

  const displayForResolve = pickDisplayStringForResolve(raw);
  return resolveLocalizedJsonStringFromI18n(displayForResolve);
}

function normalizeAssetItemFromResponse(
  raw: AssetItemFromApi & {
    nfc_tag?: string | null;
    nfcId?: string | null;
    nfc_id?: string | null;
    qr_tag?: string | null;
    function_area_id?: string | null;
    functionalAreaId?: string | null;
    functional_area_id?: string | null;
  }
): AssetItemFromApi {
  const nfc = raw.nfcTag ?? raw.nfc_tag ?? raw.nfcId ?? raw.nfc_id ?? null;
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
    displayName: resolveAssetItemDisplayNameForUi(raw),
    category: normalizeEmbeddedCategory(raw.category),
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

export function getResolvedAssetItemTagValues(
  raw: AssetItemFromApi
): { nfcTag: string | null; qrTag: string | null } {
  const n = normalizeAssetItemFromResponse(
    raw as AssetItemFromApi & { nfc_tag?: string | null; qr_tag?: string | null }
  );
  return { nfcTag: n.nfcTag, qrTag: n.qrTag };
}

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

export const getAssetItemsByHouseId = async (
  houseId: string
): Promise<AssetItemsApiResponse> => {
  const response = await axiosClient.get<unknown>(
    `${BACKEND_API_BASE}/assets/items/house/${encodeURIComponent(houseId)}`
  );
  return assetItemsFromAxiosBody(response.data, (items) => items.map(mapNormalizeAssetItemRow));
};

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

export const getAssetItemByNfcId = getAssetItemByTag;

const useSnakeCasePutBody =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ASSET_PUT_BODY_SNAKE_CASE === "true";

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
  const assetImages = Array.isArray(payload.assetImages) ? payload.assetImages : [];

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
        asset_images: assetImages,
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
        assetImages,
      };

  const postUrl = `${BACKEND_API_BASE}/assets/items`;
  const response = await axiosClient.post<CreateAssetItemApiResponse>(postUrl, body, {
    timeout: ASSET_ITEM_MUTATION_TIMEOUT_MS,
  });
  const res = response.data as CreateAssetItemApiResponse;
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

const ASSET_ITEM_PUT_JAVA_STATUS_VALUES = new Set([
  "AVAILABLE",
  "IN_USE",
  "ACTIVE",
  "BROKEN",
  "DISPOSED",
  "DELETED",
]);

function pickNonEmptyDisplayNameMap(
  map: AssetItemDisplayNameMap | undefined
): Record<string, string> | undefined {
  if (map == null || typeof map !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== "") out[k] = s;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildUpdateAssetItemRequestBody(payload: UpdateAssetItemRequest): Record<string, unknown> {
  const functionAreaId = pickFirstNonEmptyString(payload.functionAreaId);
  const noteForApi =
    payload.note === undefined || payload.note === null
      ? ""
      : String(payload.note).trim();

  const nfcForPut = pickFirstNonEmptyString(payload.nfcId, payload.nfcTag);
  const nameMap = pickNonEmptyDisplayNameMap(payload.displayName);

  const statusRaw = payload.status != null ? String(payload.status).trim() : "";
  const statusOut =
    statusRaw !== "" && ASSET_ITEM_PUT_JAVA_STATUS_VALUES.has(statusRaw) ? statusRaw : undefined;

  if (useSnakeCasePutBody) {
    const body: Record<string, unknown> = {
      serial_number: payload.serialNumber,
      condition_percent: payload.conditionPercent,
      note: noteForApi,
      function_area_id: functionAreaId ?? "",
      nfc_id: nfcForPut ?? "",
    };
    if (nameMap) body.display_name = nameMap;
    if (statusOut !== undefined) body.status = statusOut;
    return body;
  }

  const body: Record<string, unknown> = {
    serialNumber: payload.serialNumber,
    conditionPercent: payload.conditionPercent,
    note: noteForApi,
    functionAreaId: functionAreaId ?? "",
    nfcId: nfcForPut ?? "",
  };
  if (nameMap) body.displayName = nameMap;
  if (statusOut !== undefined) body.status = statusOut;
  return body;
}

export const updateAssetItem = async (
  id: string,
  payload: UpdateAssetItemRequest
): Promise<UpdateAssetItemApiResponse> => {
  const body = buildUpdateAssetItemRequestBody(payload);
  const putUrl = `${BACKEND_API_BASE}/assets/items/${encodeURIComponent(id)}`;

  const response = await axiosClient.put<UpdateAssetItemApiResponse>(putUrl, body, {
    timeout: ASSET_ITEM_MUTATION_TIMEOUT_MS,
  });
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
 * Chuẩn hóa `data.events` từ PUT maintenance batch: BE có thể trả `assetId`/`eventId` hoặc snake_case.
 * Mỗi asset đã cập nhật ứng một phần tử — trùng `assetId` chỉ lấy bản ghi đầu (lỗi dữ liệu BE nếu có).
 * FE cần cặp chuẩn để map ảnh theo từng thiết bị → đúng `eventId` khi POST multipart.
 */
function normalizeMaintenanceBatchUpdateData(
  data: AssetMaintenanceBatchUpdateData | undefined
): AssetMaintenanceBatchUpdateData | undefined {
  if (!data || typeof data !== "object") return data;
  const raw = data.events;
  if (!Array.isArray(raw) || raw.length === 0) return data;
  const events: AssetMaintenanceBatchEventRef[] = [];
  const seenAssetIds = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as unknown as Record<string, unknown>;
    const assetId = String(o.assetId ?? o.asset_id ?? "").trim();
    const eventId = String(o.eventId ?? o.event_id ?? "").trim();
    if (!assetId || !eventId) continue;
    if (seenAssetIds.has(assetId)) continue;
    seenAssetIds.add(assetId);
    events.push({ assetId, eventId });
  }
  if (events.length === 0) return data;
  return { ...data, events };
}

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
      "Accept-Language": toAppLocaleCode(i18n.language),
      "Content-Type": "application/json",
    };
    if (url.includes("ngrok")) {
      headers["ngrok-skip-browser-warning"] = "true";
    }

    const response = await fetchWithTimeout(
      url,
      {
        method: "PUT",
        headers,
        body,
      },
      API_REQUEST_TIMEOUT_MS
    );

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

    let result = parsed;
    if (result.data) {
      const normalized = normalizeMaintenanceBatchUpdateData(result.data);
      if (normalized) result = { ...result, data: normalized };
    }

    logInspectionDebug("[AssetBatch]", "batch ok", {
      status: response.status,
      success: result.success,
      eventPairs: result.data?.events?.length ?? 0,
    });
    return result;
  } catch (e: unknown) {
    logInspectionError("[AssetBatch]", "batch failed", e);
    throw e;
  }
};

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

export const deleteAssetItem = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await axiosClient.delete<{ success: boolean; message?: string }>(
    `${BACKEND_API_BASE}/assets/items/${id}`
  );
  return response.data;
};

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

export const detachAssetTag = async (
  tagValue: string
): Promise<DetachAssetTagApiResponse> => {
  const normalized = normalizeTagValueForApi(tagValue.trim());
  const response = await axiosClient.put<DetachAssetTagApiResponse>(
    `${BACKEND_API_BASE}/assets/tags/detach/${encodeURIComponent(normalized)}`
  );
  return response.data;
};

export const deprovisionIotControllerByHouseId = async (
  houseId: string
): Promise<ApiResponse<string>> => {
  const response = await axiosClient.delete<ApiResponse<string>>(
    `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/deprovision`
  );
  return response.data;
};

export const provisionIotControllerByHouseId = async (
  houseId: string,
  payload: IotProvisionRequest
): Promise<IotProvisionApiResponse> => {
  const response = await axiosClient.post<IotProvisionApiResponse>(
    `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/provision`,
    payload
  );
  return response.data;
};

export const getIotProvisionTokenBySerial = async (
  payload: IotProvisionTokenRequest
): Promise<IotProvisionTokenApiResponse> => {
  const response = await axiosClient.post<IotProvisionTokenApiResponse>(
    `${BACKEND_API_BASE}/assets/iot/provision-token`,
    payload
  );
  return response.data;
};

export const getIotControllerByHouseId = async (
  houseId: string
): Promise<IotControllerByHouseApiResponse> => {
  const response = await axiosClient.get<IotControllerByHouseApiResponse>(
    `${BACKEND_API_BASE}/assets/houses/${encodeURIComponent(houseId)}/iot/controller`
  );
  return response.data;
};

export const provisionIotNodeByHouseId = async (
  houseId: string,
  payload: IotProvisionNodeRequest
): Promise<IotProvisionNodeApiResponse> => {
  const response = await axiosClient.post<IotProvisionNodeApiResponse>(
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

const ASSET_ITEM_IMAGES_DEDUP_MS = 350;
const assetItemImagesInflight = new Map<string, Promise<AssetItemImageFromApi[]>>();
const assetItemImagesMicroCache = new Map<
  string,
  { at: number; data: AssetItemImageFromApi[] }
>();

export const invalidateAssetItemImagesCache = (itemId: string) => {
  const key = String(itemId ?? "").trim();
  if (!key) return;
  assetItemImagesMicroCache.delete(key);
  assetItemImagesInflight.delete(key);
};

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
 *
 * Lưu ý: gọi có `cacheBust` tạo request riêng — không gộp inflight với lần gọi khác `cacheBust` (tránh
 * lấy nhầm kết quả GET “trước khi upload” khi gọi GET “sau khi upload” cùng `itemId`).
 */
export const getAssetItemImages = (
  itemId: string,
  cacheBust?: number,
): Promise<AssetItemImageFromApi[]> => {
  if (!itemId?.trim()) return Promise.resolve([]);
  const key = itemId.trim();
  const now = Date.now();

  const inflightKey =
    cacheBust !== undefined && cacheBust !== null
      ? `${key}__bust__${String(cacheBust)}`
      : key;

  const inflight = assetItemImagesInflight.get(inflightKey);
  if (inflight) return inflight;

  const cached = assetItemImagesMicroCache.get(key);
  if (
    cacheBust === undefined &&
    cached &&
    now - cached.at < ASSET_ITEM_IMAGES_DEDUP_MS
  ) {
    return Promise.resolve(cached.data);
  }

  const baseUrl = `${BACKEND_API_BASE}/assets/items/${encodeURIComponent(key)}/images`;
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
      assetItemImagesInflight.delete(inflightKey);
    }
  })();

  assetItemImagesInflight.set(inflightKey, run);
  return run;
};

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

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": toAppLocaleCode(i18n.language),
      },
      body: formData,
    },
    ASSET_IMAGE_UPLOAD_TIMEOUT_MS
  );

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
    "Accept-Language": toAppLocaleCode(i18n.language),
  };
  if (url.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body: formData,
    },
    ASSET_IMAGE_UPLOAD_TIMEOUT_MS
  );

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
  const response = await axiosClient.delete<ApiResponse<null>>(url);
  const ok = Boolean(response?.data?.success);
  if (!ok) {
    throw new Error(
      response?.data?.message || "Delete asset item image failed",
    );
  }

  invalidateAssetItemImagesCache(normalizedItemId);
};
