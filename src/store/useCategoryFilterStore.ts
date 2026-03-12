import { create } from "zustand";

/**
 * State và actions cho filter theo danh mục (category) trên các màn Staff.
 * - StaffHomeScreen: "Tất cả thiết bị" dùng homeSelectedCategoryId (null = Tất cả).
 * - BuildingDetailScreen: mỗi nhà có thể có category đang chọn riêng, lưu theo buildingId.
 *
 * Dùng Zustand để state được chia sẻ / nhớ giữa các lần chuyển màn mà không cần prop drilling.
 */
export type CategoryFilterState = {
  /** Category đang chọn tại màn Staff Home (phần Tất cả thiết bị). null = hiển thị tất cả. */
  homeSelectedCategoryId: string | null;
  /** Category đang chọn tại màn Chi tiết nhà, theo từng buildingId. Key = buildingId, value = categoryId hoặc null. */
  buildingSelectedCategoryId: Record<string, string | null>;

  /** Đặt category đang chọn cho Staff Home. */
  setHomeSelectedCategoryId: (categoryId: string | null) => void;
  /** Đặt category đang chọn cho một nhà cụ thể (BuildingDetail). */
  setBuildingSelectedCategoryId: (buildingId: string, categoryId: string | null) => void;
};

const useCategoryFilterStore = create<CategoryFilterState>((set) => ({
  homeSelectedCategoryId: null,
  buildingSelectedCategoryId: {},

  setHomeSelectedCategoryId: (categoryId) =>
    set({ homeSelectedCategoryId: categoryId }),

  setBuildingSelectedCategoryId: (buildingId, categoryId) =>
    set((state) => ({
      buildingSelectedCategoryId: {
        ...state.buildingSelectedCategoryId,
        [buildingId]: categoryId,
      },
    })),
}));

export { useCategoryFilterStore };
