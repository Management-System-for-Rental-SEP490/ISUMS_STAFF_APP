import { Dimensions, Platform } from "react-native";

/**
 * Cuộn cha (FlatList/ScrollView) khi mở ô tìm DropdownBox:
 * inset càng lớn → cuộn ít hơn → ô tìm thấp hơn, gần vùng bàn phím hơn (tránh khoảng trống lớn phía trên phím).
 */
export const DROPDOWN_SEARCH_TOP_INSET_PX = 140;

const KEYBOARD_OVERLAP_MARGIN_PX = 2;

/**
 * `true` nếu ô nhập bị bàn phím che ít nhất một phần (mép dưới ô xuống dưới mép trên vùng IME / viewport).
 * - iOS: so với `windowHeight - keyboardHeight` (bàn phím chồng lên, window không co).
 * - Android + `softwareKeyboardLayoutMode: resize`: thường `window` đã co — ô tràn nếu `fieldBottom > windowHeight`;
 *   nếu chưa kịp co, dùng thêm `keyboardHeight` khi có.
 */
export function isFieldObscuredByKeyboard(
  fieldBottomPx: number,
  keyboardHeightPx: number
): boolean {
  const windowHeightPx = Dimensions.get("window").height;
  const m = KEYBOARD_OVERLAP_MARGIN_PX;

  if (Platform.OS === "android") {
    if (fieldBottomPx > windowHeightPx - m) return true;
    if (keyboardHeightPx > 0) {
      const keyboardTopY = windowHeightPx - keyboardHeightPx;
      return fieldBottomPx > keyboardTopY - m;
    }
    return false;
  }

  if (keyboardHeightPx <= 0) return false;
  const keyboardTopY = windowHeightPx - keyboardHeightPx;
  return fieldBottomPx > keyboardTopY - m;
}

export function parentScrollOffsetForDropdownField(
  fieldYInScrollContent: number,
  topInsetPx: number = DROPDOWN_SEARCH_TOP_INSET_PX
): number {
  return Math.max(0, fieldYInScrollContent - topInsetPx);
}
