import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
  type QueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getAssetItems,
  getAssetItemsByHouseId,
  asAssetItemArray,
  getAssetItemById,
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
  /** Chi tiết một item (GET /api/assets/items/:id). */
  byId: (assetId: string) => [...ASSET_ITEM_KEYS.base, "byId", assetId] as const,
};

function itemMatchesCategoryFilter(
  fresh: AssetItemFromApi,
  catFilter: string | null | undefined
): boolean {
  if (catFilter == null || catFilter === "") return true;
  return fresh.categoryId === catFilter;
}

/**
 * Ghi đè cache React Query cho asset item sau khi đã có bản đầy đủ từ GET chi tiết (hoặc từ PUT nếu BE trả đủ field).
 *
 * **Mục đích:** `invalidateQueries` trên toàn bộ `assetItems` kích hoạt refetch **mỗi nhà** → chậm, và có thể
 * xong **sau** khi user đã `goBack()` nên danh sách vẫn hiển thị dòng cũ. Hàm này cập nhật trực tiếp
 * `byId` và mọi query `byHouse` / `byCategory` đang **active** để hàng trong list khớp server ngay.
 *
 * **Đổi nhà (transfer):** truyền `previousHouseId` — gỡ item khỏi cache nhà cũ, thêm/ghi đè ở nhà mới (nếu khớp
 * bộ lọc danh mục trên key). Trường hợp query nhà mới chưa từng load, caller có thể gọi thêm `invalidateQueries`
 * một lần (ItemEdit đã làm khi transfer).
 */
export function applyFreshAssetItemToQueryCache(
  queryClient: QueryClient,
  fresh: AssetItemFromApi,
  language: string,
  options?: { previousHouseId?: string }
) {
  queryClient.setQueryData([...ASSET_ITEM_KEYS.byId(fresh.id), language], fresh);
  const previousHouseId = options?.previousHouseId;
  const transferred =
    previousHouseId != null &&
    String(previousHouseId).trim() !== "" &&
    String(previousHouseId).trim() !== String(fresh.houseId).trim();

  const queries = queryClient.getQueryCache().findAll({
    queryKey: ASSET_ITEM_KEYS.base,
    type: "active",
  });

  for (const q of queries) {
    const key = q.queryKey as readonly unknown[];
    if (key[1] === "byId") continue;
    if (key[key.length - 1] !== language) continue;

    const old = queryClient.getQueryData<AssetItemsApiResponse>(key);
    if (!old?.data || !Array.isArray(old.data)) continue;

    const kind = key[1];

    if (kind === "byHouse") {
      const houseKey = String(key[2] ?? "");
      const catFilter = key[3] as string | null | undefined;
      const data = [...old.data];
      const idx = data.findIndex((x) => x.id === fresh.id);
      const matchesCategory = itemMatchesCategoryFilter(fresh, catFilter);

      if (transferred) {
        if (houseKey === String(previousHouseId).trim() && idx >= 0) {
          data.splice(idx, 1);
        } else if (houseKey === String(fresh.houseId).trim()) {
          if (idx >= 0) {
            if (matchesCategory) data[idx] = fresh;
            else data.splice(idx, 1);
          } else if (matchesCategory) {
            data.push(fresh);
          }
        }
      } else if (idx >= 0) {
        if (matchesCategory) data[idx] = fresh;
        else data.splice(idx, 1);
      }

      queryClient.setQueryData(key, { ...old, data });
    } else if (kind === "byCategory") {
      const catFilter = key[2] as string | null | undefined;
      const data = [...old.data];
      const idx = data.findIndex((x) => x.id === fresh.id);
      const matchesCategory = itemMatchesCategoryFilter(fresh, catFilter);
      if (idx >= 0) {
        if (matchesCategory) data[idx] = fresh;
        else data.splice(idx, 1);
      }
      queryClient.setQueryData(key, { ...old, data });
    }
  }
}

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
  const { i18n } = useTranslation();
  const { houseId, categoryId } = params;

  // Chọn queryKey phù hợp với loại filter.
  const queryKey = houseId
    ? ([...ASSET_ITEM_KEYS.byHouse(houseId, categoryId), i18n.language] as const)
    : ([...ASSET_ITEM_KEYS.byCategory(categoryId), i18n.language] as const);

  return useQuery<AssetItemsApiResponse, unknown, AssetItemsApiResponse, readonly unknown[]>({
    queryKey,
    /** Luôn coi dữ liệu thiết bị là stale: cập nhật ngoài app (Swagger/BE) vẫn thấy sau khi refetch — không giữ cache 5 phút từ QueryClient global. */
    staleTime: 0,
    queryFn: async () => {
      if (houseId) {
        const res = await getAssetItemsByHouseId(houseId);
        if (categoryId && Array.isArray(res.data)) {
          return {
            ...res,
            data: res.data.filter((item) => item.categoryId === categoryId),
          };
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
 * Chi tiết một thiết bị theo id (GET /api/assets/items/:id).
 * Dùng khi cần tên hiển thị mà danh sách `useAssetItems` không chắc đã chứa item (vd. ticket chỉ có assetId).
 */
export const useAssetItemById = (assetId: string | null | undefined) => {
  const { i18n } = useTranslation();
  const id = typeof assetId === "string" ? assetId.trim() : "";
  return useQuery({
    queryKey: [...ASSET_ITEM_KEYS.byId(id || "__none__"), i18n.language],
    /** `getAssetItemById` có thể trả `undefined` khi không parse được body — RQ v5 cấm `undefined`; dùng `null` = không có item. */
    queryFn: async () => (await getAssetItemById(id)) ?? null,
    enabled: Boolean(id),
    staleTime: 0,
  });
};

/**
 * Hook lấy thiết bị IoT theo houseId.
 * API: GET /api/assets/iot-devices/house/{houseId}
 */
export const useIotDevicesByHouseId = (houseId: string) => {
  const { i18n } = useTranslation();
  return useQuery<IotDevicesByHouseApiResponse>({
    queryKey: [...IOT_DEVICE_KEYS.byHouse(houseId), i18n.language],
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
 * Gọi invalidate ở macrotask kế tiếp (setTimeout 0) thay vì đồng bộ trong `onSuccess` của mutation.
 * Lý do: `invalidateQueries` kích hoạt refetch nhiều nhà → nặng JS thread; chạy ngay sau POST làm
 * nút vẫn như đang tải / UI khựng dù API đã trả 200. Hoãn một nhịp để TanStack/React kịp tắt `isPending` và vẽ lại.
 */
const scheduleInvalidateAllAssetItems = (queryClient: ReturnType<typeof useQueryClient>) => {
  setTimeout(() => {
    invalidateAllAssetItems(queryClient);
  }, 0);
};

/**
 * Key khi lấy thiết bị từ TẤT CẢ các nhà (gộp nhiều house), dùng cho màn Staff Home "Tất cả thiết bị".
 */
export const ASSET_ITEM_KEYS_ALL_HOUSES = {
  allHouses: (houseIds: string[], categoryId: string | null | undefined) =>
    [...ASSET_ITEM_KEYS.base, "allHouses", houseIds.slice().sort(), categoryId ?? null] as const,
};

/** Cache ngắn cho list gộp nhiều nhà — giảm refetch khi chuyển tab; pull-to-refresh + invalidate sau mutation vẫn tải mới. */
const ASSET_ITEMS_ALL_HOUSES_STALE_MS = 60_000;

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
  const { i18n } = useTranslation();
  const queries = useQueries({
    queries: houseIds.map((houseId) => ({
      queryKey: [...ASSET_ITEM_KEYS.byHouse(houseId, categoryId), i18n.language],
      staleTime: ASSET_ITEMS_ALL_HOUSES_STALE_MS,
      /**
       * Nhiều nhà → nhiều request song song; retry mặc định (2) nhân thời gian chờ trên mạng yếu/Android.
       * Giữ 1 lần thử lại để vẫn chịu lỗi thoáng qua, nhưng không kéo dài spinner quá lâu.
       */
      retry: 1,
      /** Cùng endpoint với `useAssetItems({ houseId })` — tránh cùng queryKey nhưng queryFn khác (GET ?houseId= vs /house/:id) làm cache TanStack Query sai / trống. */
      queryFn: async () => {
        const res = await getAssetItemsByHouseId(houseId);
        if (categoryId && Array.isArray(res.data)) {
          return {
            ...res,
            data: res.data.filter((item) => item.categoryId === categoryId),
          };
        }
        return res;
      },
    })),
  });

  const merged: AssetItemFromApi[] = (() => {
    const byId = new Map<string, AssetItemFromApi>();
    for (const q of queries) {
      for (const item of asAssetItemArray(q.data?.data)) {
        byId.set(item.id, item);
      }
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
    onSuccess: () => scheduleInvalidateAllAssetItems(queryClient),
  });
};

/** PUT item: cache do ItemEdit cập nhật bằng GET + `applyFreshAssetItemToQueryCache` — không invalidate toàn cây ở đây. */
export const useUpdateAssetItem = () => {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetItemRequest }) =>
      updateAssetItem(id, payload),
  });
};

export const useDeleteAssetItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAssetItem(id),
    onSuccess: () => scheduleInvalidateAllAssetItems(queryClient),
  });
};
//useMutation: nghĩa là hook mutation, dùng để thực hiện mutation (cập nhật, xóa, thêm)
/**
 * Hook đổi nhà cho thiết bị (gọi /api/asset/items/:id/transfer).
 * - Dùng trên màn ItemEdit khi người dùng chọn lại nhà.
 */
/** Transfer nhà: đồng bộ cache trong ItemEdit sau chuỗi transfer + PUT (GET + apply); không invalidate ở đây. */
export const useTransferAssetItemHouse = () => {
  return useMutation({
    mutationFn: ({ id, newHouseId }: { id: string; newHouseId: string }) =>
      transferAssetItemHouse(id, newHouseId),
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
    onSuccess: () => scheduleInvalidateAllAssetItems(queryClient),
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
    onSuccess: () => scheduleInvalidateAllAssetItems(queryClient),
  });
};

export { asAssetItemArray };

