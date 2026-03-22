import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  getAssetItems,
  getAssetItemsByHouseId,
  getIotDevicesByHouseId,
  deprovisionIotControllerByHouseId,
  provisionIotControllerByHouseId,
  getIotProvisionTokenBySerial,
  getIotControllerByHouseId,
  provisionIotNodeByHouseId,
  createAssetItem,
  updateAssetItem,
  deleteAssetItem,
  transferAssetItemHouse,
  attachAssetTag,
  detachAssetTag,
} from "../services/assetItemApi";
import type {
  AssetItemsApiResponse,
  AssetItemFromApi,
  AssetItemsParams,
  CreateAssetItemRequest,
  UpdateAssetItemRequest,
  IotDevicesByHouseApiResponse,
} from "../types/api";

/**
 * Tham số cho hook useAssetItems.
 * - `houseId`: lọc thiết bị theo nhà.
 * - `categoryId`: lọc thiết bị theo danh mục (string hoặc null).
 */
export type UseAssetItemsParams = {
  houseId?: string;
  categoryId?: string | null;
};

/**
 * Định nghĩa chuẩn key cho React Query khi làm việc với asset items.
 * Mục tiêu: mọi nơi dùng chung 1 cách đặt key để cache/invalidate chính xác.
 */
export const ASSET_ITEM_KEYS = {
  base: ["assetItems"] as const,
  /**
   * Key khi chỉ filter theo category (ví dụ tab "Tất cả thiết bị" trên Staff Home).
   * - categoryId = null/undefined => lấy tất cả.
   */
  byCategory: (categoryId: string | null | undefined) =>
    [...ASSET_ITEM_KEYS.base, "byCategory", categoryId ?? null] as const,
  /**
   * Key khi filter theo houseId (và có thể kèm categoryId).
   * - Dùng cho màn BuildingDetail: luôn có houseId.
   */
  byHouse: (houseId: string, categoryId?: string | null) =>
    [...ASSET_ITEM_KEYS.base, "byHouse", houseId, categoryId ?? null] as const,
};

/**
 * Key cho IoT devices theo nhà.
 * Tách riêng khỏi assetItems để cache/invalidate rõ ràng.
 */
export const IOT_DEVICE_KEYS = {
  base: ["iotDevices"] as const,
  byHouse: (houseId: string) => [...IOT_DEVICE_KEYS.base, "byHouse", houseId] as const,
};

/**
 * Hook dùng React Query để lấy danh sách thiết bị (asset items).
 *
 * Cách dùng:
 * - Chỉ filter theo category:
 *   `useAssetItems({ categoryId: selectedCategoryId })`
 * - Filter theo house (dùng API GET /api/assets/items/house/:houseId):
 *   `useAssetItems({ houseId })`
 * - Filter cả house + category (lấy theo house rồi lọc category phía client):
 *   `useAssetItems({ houseId, categoryId })`
 */
export const useAssetItems = (params: UseAssetItemsParams = {}) => {
  const { houseId, categoryId } = params;

  // Chọn queryKey phù hợp với loại filter.
  const queryKey = houseId
    ? ASSET_ITEM_KEYS.byHouse(houseId, categoryId)
    : ASSET_ITEM_KEYS.byCategory(categoryId);

  return useQuery<AssetItemsApiResponse, unknown, AssetItemsApiResponse, ReturnType<typeof ASSET_ITEM_KEYS.byCategory> | ReturnType<typeof ASSET_ITEM_KEYS.byHouse>>({
    queryKey,
    queryFn: async () => {
      if (houseId) {
        const res = await getAssetItemsByHouseId(houseId);
        if (categoryId && res.data) {
          res.data = res.data.filter((item) => item.categoryId === categoryId);
        }
        return res;
      }
      return getAssetItems({
        categoryId: (categoryId ?? undefined) as AssetItemsParams["categoryId"],
      });
    },
  });
};

/**
 * Hook lấy thiết bị IoT theo houseId.
 * API: GET /api/assets/iot-devices/house/{houseId}
 */
export const useIotDevicesByHouseId = (houseId: string) => {
  return useQuery<IotDevicesByHouseApiResponse>({
    queryKey: IOT_DEVICE_KEYS.byHouse(houseId),
    queryFn: () => getIotDevicesByHouseId(houseId),
    enabled: Boolean(houseId),
  });
};

/**
 * Hook tháo (deprovision) controller IoT khỏi nhà.
 * API: DELETE /api/assets/houses/{houseId}/iot/deprovision
 * Sau khi thành công sẽ invalidate cache iotDevices của house để màn danh sách cập nhật ngay.
 */
export const useDeprovisionIotControllerByHouseId = (houseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deprovisionIotControllerByHouseId(houseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IOT_DEVICE_KEYS.byHouse(houseId) });
    },
  });
};

/**
 * Hook gắn (provision) controller IoT vào nhà.
 * API: POST /api/assets/houses/{houseId}/iot/provision
 * Sau khi thành công sẽ invalidate cache iotDevices của house để màn danh sách cập nhật ngay.
 */
export const useProvisionIotControllerByHouseId = (houseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { deviceId: string; areaId: string }) =>
      provisionIotControllerByHouseId(houseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IOT_DEVICE_KEYS.byHouse(houseId) });
    },
  });
};

export const useIotProvisionToken = () => {
  return useMutation({
    mutationFn: (payload: { serial: string }) => getIotProvisionTokenBySerial(payload),
  });
};

export const useIotControllerByHouseId = (houseId: string) => {
  return useMutation({
    mutationFn: () => getIotControllerByHouseId(houseId),
  });
};

export const useProvisionIotNodeByHouseId = (houseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { serial: string; token: string; areaId: string }) =>
      provisionIotNodeByHouseId(houseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IOT_DEVICE_KEYS.byHouse(houseId) });
    },
  });
};

/** Invalidate mọi query asset items (list, byHouse, byCategory) sau khi create/update/delete. */
const invalidateAllAssetItems = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ASSET_ITEM_KEYS.base });
};

/**
 * Key khi lấy thiết bị từ TẤT CẢ các nhà (gộp nhiều house), dùng cho màn Staff Home "Tất cả thiết bị".
 */
export const ASSET_ITEM_KEYS_ALL_HOUSES = {
  allHouses: (houseIds: string[], categoryId: string | null | undefined) =>
    [...ASSET_ITEM_KEYS.base, "allHouses", houseIds.slice().sort(), categoryId ?? null] as const,
};

/**
 * Hook lấy thiết bị từ TẤT CẢ các nhà (mỗi nhà gọi một request rồi gộp lại).
 * Dùng cho màn Staff Home phần "Tất cả thiết bị" để đảm bảo hiển thị hết thiết bị của mọi nhà,
 * không phụ thuộc vào việc BE có trả về hết khi không gửi houseId hay không.
 *
 * @param houseIds - Mảng ID các nhà (từ GET /api/houses).
 * @param categoryId - Lọc theo danh mục (null = tất cả).
 */
export const useAssetItemsAllHouses = (
  houseIds: string[],
  categoryId: string | null | undefined
) => {
  const queries = useQueries({
    queries: houseIds.map((houseId) => ({
      queryKey: ASSET_ITEM_KEYS.byHouse(houseId, categoryId),
      queryFn: () =>
        getAssetItems({
          houseId,
          categoryId: (categoryId ?? undefined) as AssetItemsParams["categoryId"],
        }),
    })),
  });

  const merged: AssetItemFromApi[] = (() => {
    const byId = new Map<string, AssetItemFromApi>();
    for (const q of queries) {
      const list = q.data?.data ?? [];
      for (const item of list) byId.set(item.id, item);
    }
    return Array.from(byId.values());
  })();

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const isRefetching = queries.some((q) => q.isRefetching);
  const refetch = () => Promise.all(queries.map((q) => q.refetch()));

  return {
    data: { data: merged } as AssetItemsApiResponse,
    isLoading,
    isError,
    isRefetching,
    refetch,
  };
};

export const useCreateAssetItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssetItemRequest) => createAssetItem(payload),
    onSuccess: () => invalidateAllAssetItems(queryClient),
  });
};

export const useUpdateAssetItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetItemRequest }) =>
      updateAssetItem(id, payload),
    onSuccess: () => invalidateAllAssetItems(queryClient),
  });
};

export const useDeleteAssetItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAssetItem(id),
    onSuccess: () => invalidateAllAssetItems(queryClient),
  });
};
//useMutation: nghĩa là hook mutation, dùng để thực hiện mutation (cập nhật, xóa, thêm)
/**
 * Hook đổi nhà cho thiết bị (gọi /api/asset/items/:id/transfer).
 * - Dùng trên màn ItemEdit khi người dùng chọn lại nhà.
 */
export const useTransferAssetItemHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newHouseId }: { id: string; newHouseId: string }) =>
      transferAssetItemHouse(id, newHouseId),
    onSuccess: () => invalidateAllAssetItems(queryClient),
  });
};

/**
 * Hook gán tag NFC hoặc QR vào thiết bị (POST /api/assets/tags).
 * Sau khi gán thành công, invalidate cache danh sách thiết bị.
 */
export const useAttachAssetTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { assetId: string; tagValue: string; tagType: "NFC" | "QR_CODE" }) =>
      attachAssetTag({
        assetId: payload.assetId,
        tagValue: payload.tagValue.trim(),
        tagType: payload.tagType,
      }),
    onSuccess: () => invalidateAllAssetItems(queryClient),
  });
};

/**
 * Hook gỡ tag NFC hoặc QR (PUT /api/assets/tags/detach/{tagValue}).
 */
export const useDetachAssetTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagValue }: { tagValue: string }) =>
      detachAssetTag(tagValue.trim()),
    onSuccess: () => invalidateAllAssetItems(queryClient),
  });
};

