import type { TextStyle } from "react-native";

/**
 * lineHeight ~ 1.35× fontSize — giữ nhất quán, tránh dòng chữ trông khác cỡ.
 */
export function lineHeightFor(fontSize: number, ratio = 1.35): number {
  return Math.round(fontSize * ratio);
}

function textStyle(
  fontSize: number,
  fontWeight: NonNullable<TextStyle["fontWeight"]> = "400",
  ratio?: number
): TextStyle {
  return {
    fontSize,
    fontWeight,
    lineHeight: lineHeightFor(fontSize, ratio),
  };
}

/**
 * Token typography ISUMS (Mobile + Staff): cùng vai trò → cùng fontSize/lineHeight.
 * Màu sắc và margin gán ở StyleSheet; có thể override fontWeight sau khi spread.
 */
export const appTypography = {
  screenHeader: textStyle(18, "700"),
  cardTitle: textStyle(18, "700"),
  modalTitle: textStyle(18, "700"),
  sectionHeading: textStyle(16, "700"),
  /** Cặp nhãn + giá trị cùng hàng (địa chỉ, trạng thái, …) */
  labelRow: textStyle(14, "400"),
  labelRowValue: textStyle(14, "500"),
  body: textStyle(14, "400"),
  /** Đoạn phụ / mô tả ngắn dưới tiêu đề nhỏ */
  secondary: textStyle(13, "400"),
  chip: textStyle(13, "600"),
  listTitle: textStyle(15, "600"),
  listSubtitle: textStyle(13, "400"),
  /** Tiêu đề dòng trong card (tên khu vực, …) khi không dùng listTitle 15 */
  itemTitle: textStyle(14, "600"),
  caption: textStyle(12, "400"),
  captionStrong: textStyle(12, "700"),
  badge: textStyle(11, "600"),
  hint: textStyle(11, "700"),
  micro: textStyle(10, "400"),
  modalListItem: textStyle(16, "400"),
  /** Nút / CTA một dòng */
  buttonLabel: textStyle(14, "700"),
  /** CustomAlert / hộp thoại */
  dialogTitle: textStyle(20, "700"),
  dialogMessage: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  } as TextStyle,
  dialogButton: textStyle(16, "600"),
  displayLarge: textStyle(40, "700"),
  profileName: textStyle(22, "700"),
  onboardingTitle: textStyle(26, "700"),
  onboardingBody: textStyle(16, "500", 1.5),
  loginBrandMark: textStyle(32, "700"),
  loginScreenTitle: textStyle(28, "700"),
  loginPrimaryCta: textStyle(17, "600"),
  ticketScreenTitle: textStyle(24, "700"),
  /** Glyph lớn trên nền tối (camera / NFC) */
  scanGlyphLarge: textStyle(60, "400"),
} as const;

export type AppTypographyKey = keyof typeof appTypography;
