/** Draft cập nhật thiết bị trong modal bảo trì / kiểm định (batch gửi lên API). */
export type MaintenanceDraft = {
  assetId: string;
  displayName: string;
  floorNo: string | null;
  conditionPercent: number;
  note: string;
  updateAt?: string | null;
  /** Bật = gửi `status: BROKEN` trong batch (bảo trì & kiểm định); chỉ có thể đặt BROKEN, không đổi sang trạng thái khác từ đây. */
  markBroken?: boolean;
};

/**
 * Tối đa ảnh thêm trong một lần mở modal cập nhật thiết bị (bảo trì / kiểm định),
 * không tính ảnh đã có sẵn trên asset.
 */
export const MAX_MAINTENANCE_ASSET_IMAGES = 5;
