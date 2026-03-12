/**
 * Hook chứa ngữ cảnh tenant: nhà đang thuê, các khu vực chức năng, thingId IoT.
 * Dùng cho IoT (usage, telemetry) và màn consumption – dễ đối chiếu houseId/areaId với API.
 * Chỉ dùng khi user đã đăng nhập với role tenant.
 */
import { useMemo } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useTenantHouses } from "./useHouses";
import type { FunctionalAreaFromApi, HouseFromApi } from "../types/api";

/** ThingId IoT gán cứng theo TestApp; sau này lấy từ functionalArea hoặc API. */
export const TENANT_IOT_THING_ID =
  "ESP32-controller_62174095-1ba3-4296-ba16-40edf78c2de2";

export interface TenantContextValue {
  /** Nhà đang chọn (theo houseId trong auth hoặc căn đầu danh sách). */
  house: HouseFromApi | null;
  /** ID căn nhà – dùng cho pk usage: houseId#electricity | houseId#water. */
  houseId: string | null;
  /** Danh sách khu vực chức năng trong nhà (Bếp, Phòng khách, ...). */
  functionalAreas: FunctionalAreaFromApi[];
  /** ID thiết bị IoT để subscribe WebSocket telemetry; hiện gán cứng. */
  thingId: string;
  /** Đang tải dữ liệu nhà. */
  isLoading: boolean;
}

/**
 * Trả về ngữ cảnh tenant: house, houseId, functionalAreas, thingId.
 * Gọi useTenantHouses() và useAuthStore() để lấy houseId + danh sách nhà.
 */
export function useTenantContext(): TenantContextValue {
  const { houseId: authHouseId } = useAuthStore();
  const { data: housesData, isLoading } = useTenantHouses();
  const rawData = housesData?.data;
  const tenantHouses: HouseFromApi[] = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === "object"
      ? [rawData as HouseFromApi]
      : [];

  const house = useMemo<HouseFromApi | null>(() => {
    if (!tenantHouses.length) return null;
    if (authHouseId) {
      return (
        tenantHouses.find((h) => h.id === authHouseId) ?? tenantHouses[0]
      );
    }
    return tenantHouses[0];
  }, [tenantHouses, authHouseId]);

  const functionalAreas = useMemo<FunctionalAreaFromApi[]>(() => {
    const list = house?.functionalAreas ?? [];
    return Array.isArray(list) ? list : [];
  }, [house?.functionalAreas]);

  return {
    house,
    houseId: house?.id ?? null,
    functionalAreas,
    thingId: TENANT_IOT_THING_ID,
    isLoading,
  };
}
