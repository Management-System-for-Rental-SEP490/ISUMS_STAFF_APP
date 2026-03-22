/**
 * Cuộn cha (FlatList/ScrollView) khi mở ô tìm DropdownBox:
 * inset càng lớn → cuộn ít hơn → ô tìm thấp hơn, gần vùng bàn phím hơn (tránh khoảng trống lớn phía trên phím).
 */
export const DROPDOWN_SEARCH_TOP_INSET_PX = 140; 

export function parentScrollOffsetForDropdownField(
  fieldYInScrollContent: number,
  topInsetPx: number = DROPDOWN_SEARCH_TOP_INSET_PX
): number {
  return Math.max(0, fieldYInScrollContent - topInsetPx);
}
