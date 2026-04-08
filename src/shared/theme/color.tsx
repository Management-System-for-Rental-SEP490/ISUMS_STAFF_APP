import type { ColorValue } from "react-native";

/**
 * Palette staff — tách biệt nhẹ so với app người thuê:
 * xanh lá hơi ấm, điểm cuối gradient cam đất nhạt, accent phụ xanh biển pha ấm.
 */

/** Xanh lá — điểm đầu gradient (hơi teal/ấm hơn #3bb582 của app người thuê) */
export const BRAND_GREEN = "#37b584";

/** Xanh biển đặc — accent phụ (pha đỏ nhẹ so với #2096d8 để “ấm” hơn) */
export const BRAND_BLUE = "#2c91c8";

/** Cam đất nhạt — điểm cuối gradient đặc (không dùng alpha) */
export const BRAND_AMBER = "#d9873e";

/** Điểm cuối gradient cho LinearGradient (cam đất, độ trong suốt giữ độ mềm) */
export const BRAND_BLUE_GRADIENT_END = "rgba(217, 135, 62, 0.72)";

/** Nền/viền nhạt từ BRAND_BLUE (đồng bộ accent phụ) */
export const brandBlueMutedBg = "rgba(44, 145, 200, 0.12)";
export const brandBlueMutedBorder = "rgba(44, 145, 200, 0.35)";

/** Cặp màu chuẩn cho `LinearGradient` / `expo-linear-gradient` */
export const brandGradient = [BRAND_GREEN, BRAND_BLUE_GRADIENT_END] as const;

/** Gradient hai màu đặc (khi không dùng bản rgba) */
export const brandGradientSolid: [ColorValue, ColorValue] = [BRAND_GREEN, BRAND_AMBER];

/** Nút, spinner, viền nhấn chính — trùng điểm đầu gradient */
export const brandPrimary = BRAND_GREEN;

/** Icon/link/điểm nhấn phụ — xanh ấm (đọc tốt trên nền sáng, không lạm cam) */
export const brandSecondary = BRAND_BLUE;

/** Nền nhạt gắn thương hiệu staff: pha nhẹ cam + xanh để ấm, không gắt */
export const brandTintBg = "rgba(217, 135, 62, 0.10)";

/** Viền trạng thái active đậm */
export const brandFocusBorder = BRAND_BLUE;

/** Đỏ — đăng xuất, xóa, nút destructive trong alert */
export const BRAND_DANGER = "#DC2626";
export const brandDangerBg = "rgba(254, 226, 226, 0.95)";
export const brandDangerBorder = "rgba(220, 38, 38, 0.4)";

/** Trang tiêu thụ nước: accent & nền nhạt chỉ xanh biển (không dùng xanh lá) */
export const waterAccent = BRAND_BLUE;
export const waterTintBg = "rgba(44, 145, 200, 0.14)";

/** Header màn nước: gradient xanh biển hơi ấm */
export const waterHeaderGradient: [ColorValue, ColorValue] = ["#5bb4e5", BRAND_BLUE];

/**
 * Gom token màu một chỗ — đổi palette sau này chỉ cần sửa các hằng phía trên.
 */
export const brandTheme = {
  green: BRAND_GREEN,
  blue: BRAND_BLUE,
  amber: BRAND_AMBER,
  blueGradientEnd: BRAND_BLUE_GRADIENT_END,
  gradient: brandGradient,
  gradientSolid: brandGradientSolid,
  primary: brandPrimary,
  secondary: brandSecondary,
  tintBg: brandTintBg,
  focusBorder: brandFocusBorder,
  danger: BRAND_DANGER,
} as const;

export type BrandTheme = typeof brandTheme;

/**
 * Neutrals dùng chung (thay #111827, #6B7280, #E5E7EB… rải StyleSheet).
 * Nền pha trắng ấm rất nhẹ để đồng tone với accent cam staff.
 */
export const neutral = {
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnDarkSoft: "#cccccc",
  black: "#000000",
  warningBorderLight: "#FCA5A5",
  textBody: "#374151",
  heading: "#1F2937",
  border: "#E5E7EB",
  inputBorder: "#d1d5db",
  surface: "#FFFFFF",
  background: "#F3F2F0",
  backgroundElevated: "#F9F8F6",
  backgroundSubtle: "#FAFAF8",
  slate200: "#e2e8f0",
  slate300: "#CBD5E1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate900: "#0f172a",
  borderMuted: "#F1F5F9",
  canvasMuted: "#F6F4F2",
  tileMuted: "#F1EFED",
  avatarPlaceholder: "#E1E8ED",
  textMintSoft: "#E0F2F1",
  /** Icon phụ (alert, hàng cài đặt) */
  iconMuted: "#666666",
  /** Nền chip section (work slot / icon wrap) */
  sectionTintIndigo: "#EEF2FF",
  sectionTintMint: "#ECFDF5",
  /** Nền chip nhấn nhẹ tone cam (staff) — dùng thay mint khi cần đồng bộ brand */
  sectionTintWarm: "#FFF7ED",
  /** Phủ modal / dropdown toàn màn (dùng rgba, không rải hex trong component) */
  modalBackdrop: "rgba(15, 23, 42, 0.5)",
} as const;

/** Nền badge trạng thái tài sản (green/blue/red nhạt) */
export const statusBadgeBg = {
  available: "#d1fae5",
  inUse: "#dbeafe",
  disposed: "#fee2e2",
} as const;

/** Chữ badge IoT offline (đỏ đậm trên nền nhạt) */
export const iotOfflineLabelColor = "#991B1B";

/**
 * Lịch staff — màu ô ca làm việc (viền trái + chữ loại việc = accent; nền ô = tint).
 * Dùng chung Calendar + Home; đổi palette tại đây.
 */
export type WorkSlotScheduleVisual = {
  accent: string;
  tint: string;
};

/** Tím đậm — kiểm định / định kỳ (tách biệt teal bảo trì & xanh ticket) */
const WORK_SLOT_INSPECTION_ACCENT = "#5B21B6";

export const workSlotScheduleColors = {
  issue: { accent: BRAND_DANGER, tint: brandDangerBg },
  maintenance: { accent: BRAND_GREEN, tint: neutral.sectionTintMint },
  inspection: { accent: WORK_SLOT_INSPECTION_ACCENT, tint: neutral.sectionTintIndigo },
  ticket: { accent: BRAND_BLUE, tint: brandBlueMutedBg },
  nfc: { accent: BRAND_AMBER, tint: neutral.sectionTintWarm },
  break: { accent: neutral.slate500, tint: neutral.tileMuted },
  other: { accent: brandPrimary, tint: brandTintBg },
} as const satisfies Record<string, WorkSlotScheduleVisual>;

export type WorkSlotScheduleColorKey = keyof typeof workSlotScheduleColors;

export function getWorkSlotScheduleVisual(
  slotType?: string | null
): WorkSlotScheduleVisual {
  if (slotType && slotType in workSlotScheduleColors) {
    return workSlotScheduleColors[slotType as WorkSlotScheduleColorKey];
  }
  return workSlotScheduleColors.other;
}
