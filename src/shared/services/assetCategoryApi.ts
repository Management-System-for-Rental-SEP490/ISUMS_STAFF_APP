/**
 * API liên quan đến danh mục thiết bị (asset categories).
 * GET /api/assets/categories, POST, PUT /api/assets/categories/:id.
 */
import axiosClient from "../api/axiosClient";
import { ASSET_ITEM_MUTATION_TIMEOUT_MS, BACKEND_API_BASE } from "../api/config";
import {
  mergeTranslationMapsFromApi,
  resolveLocalizedApiFieldFromI18n,
} from "../utils/resolveLocalizedJsonString";
import type {
  AssetCategoriesApiResponse,
  AssetCategoryFromApi,
  CreateAssetCategoryRequest,
  CreateAssetCategoryApiResponse,
  UpdateAssetCategoryRequest,
  UpdateAssetCategoryApiResponse,
} from "../types/api";

function localizeAssetCategoryRow(c: AssetCategoryFromApi): AssetCategoryFromApi {
  const nameRaw =
    c.nameRaw != null ? String(c.nameRaw) : c.name != null ? String(c.name) : "";
  const descriptionRaw =
    c.descriptionRaw != null
      ? String(c.descriptionRaw)
      : c.description != null
        ? String(c.description)
        : "";
  const r = c as AssetCategoryFromApi & {
    name_translations?: Record<string, unknown>;
    description_translations?: Record<string, unknown>;
  };
  const nameTranslations = mergeTranslationMapsFromApi(
    r.nameTranslations as Record<string, unknown> | undefined,
    r.name_translations
  );
  const descriptionTranslations = mergeTranslationMapsFromApi(
    r.descriptionTranslations as Record<string, unknown> | undefined,
    r.description_translations
  );
  return {
    ...c,
    nameRaw,
    descriptionRaw,
    name: resolveLocalizedApiFieldFromI18n(c.name, nameTranslations),
    description: resolveLocalizedApiFieldFromI18n(c.description, descriptionTranslations),
  };
}

/**
 * Lấy danh sách danh mục thiết bị / loại sản phẩm (GET /api/assets/categories).
 * Dùng cho dropdown chọn loại thiết bị, thanh filter, v.v.
 * @returns Promise<AssetCategoriesApiResponse> - data là mảng AssetCategoryFromApi.
 */
export const getAssetCategories = async (): Promise<AssetCategoriesApiResponse> => {
  const response = await axiosClient.get<AssetCategoriesApiResponse>(
    `${BACKEND_API_BASE}/assets/categories`
  );
  const body = response.data;
  if (!body?.data || !Array.isArray(body.data)) return body;
  return {
    ...body,
    data: body.data.map(localizeAssetCategoryRow),
  };
};

/**
 * Tạo danh mục thiết bị mới (POST /api/assets/categories).
 * Gửi name, compensationPercent, description; BE trả về danh mục vừa tạo (có id).
 * @param payload - name / description là map đa ngôn ngữ (vi, en, ja), compensationPercent.
 * @returns Promise<CreateAssetCategoryApiResponse> - data là danh mục vừa tạo, statusCode 201.
 */
export const createAssetCategory = async (
  payload: CreateAssetCategoryRequest
): Promise<CreateAssetCategoryApiResponse> => {
  const response = await axiosClient.post<CreateAssetCategoryApiResponse>(
    `${BACKEND_API_BASE}/assets/categories`,
    payload,
    { timeout: ASSET_ITEM_MUTATION_TIMEOUT_MS }
  );
  const body = response.data;
  if (!body?.data) return body;
  return { ...body, data: localizeAssetCategoryRow(body.data) };
};

/**
 * Cập nhật danh mục thiết bị (PUT /api/assets/categories/:id).
 * @param id - ID danh mục cần cập nhật (trong URL).
 * @param payload - name, compensationPercent, description.
 */
export const updateAssetCategory = async (
  id: string,
  payload: UpdateAssetCategoryRequest
): Promise<UpdateAssetCategoryApiResponse> => {
  const response = await axiosClient.put<UpdateAssetCategoryApiResponse>(
    `${BACKEND_API_BASE}/assets/categories/${id}`,
    payload,
    { timeout: ASSET_ITEM_MUTATION_TIMEOUT_MS }
  );
  const body = response.data;
  if (!body?.data) return body;
  return { ...body, data: localizeAssetCategoryRow(body.data) };
};

