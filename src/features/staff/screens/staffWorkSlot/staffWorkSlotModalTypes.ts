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
 * Tối đa ảnh chụp (camera) trong một phiên cho mỗi asset — luồng bảo trì & kiểm định.
 * Ảnh chọn từ thư viện không bị trần này; tổng ảnh lưu trên asset phụ thuộc BE.
 */
export const MAX_MAINTENANCE_ASSET_IMAGES = 5;
