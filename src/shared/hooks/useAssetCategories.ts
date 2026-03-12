import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssetCategories,
  createAssetCategory,
  updateAssetCategory,
} from "../services/assetCategoryApi";
import type {
  CreateAssetCategoryRequest,
  UpdateAssetCategoryRequest,
} from "../types/api";

/**
 * Hook dùng React Query để lấy danh sách danh mục thiết bị (asset categories).
 *
 * - Dùng cho dropdown chọn loại thiết bị, thanh filter category, v.v.
 * - refetchOnMount: "always" để mỗi lần vào màn có dùng categories đều gọi lại API,
 *   tránh hiển thị "Khác" do cache cũ khi BE đã có danh mục (IoT, Furniture, IT Equipment...).
 */
export const ASSET_CATEGORY_KEYS = {
  /** Key gốc cho queries về asset categories. */
  all: ["assetCategories"] as const,
};

export const useAssetCategories = () => {
  return useQuery({
    queryKey: ASSET_CATEGORY_KEYS.all,
    queryFn: getAssetCategories,
    refetchOnMount: "always",
  });
};

/**
 * Hook mutation để tạo danh mục thiết bị mới (POST /api/assets/categories).
 * Sau khi tạo thành công, tự động invalidate danh sách categories để refetch.
 * @returns useMutation: mutate(payload), isPending, isSuccess, isError, data, error.
 */
export const useCreateAssetCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssetCategoryRequest) => createAssetCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_CATEGORY_KEYS.all });
    },
  });
};

/**
 * Hook mutation cập nhật danh mục (PUT /api/assets/categories/:id).
 * Sau khi thành công invalidate danh sách categories.
 */
export const useUpdateAssetCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAssetCategoryRequest;
    }) => updateAssetCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_CATEGORY_KEYS.all });
    },
  });
};

