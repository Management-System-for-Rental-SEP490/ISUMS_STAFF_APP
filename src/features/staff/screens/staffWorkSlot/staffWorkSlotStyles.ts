import { StyleSheet } from "react-native";
import {
  brandPrimary,
  brandSecondary,
  brandTintBg,
} from "../../../../shared/theme/color";

/** Màu theo trạng thái job — chỉ palette thương hiệu; lỗi/quá hạn giữ đỏ để dễ nhận biết. */
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  CREATED: { bg: brandTintBg, text: brandSecondary },
  SCHEDULED: { bg: brandTintBg, text: brandSecondary },
  NEED_RESCHEDULE: { bg: brandTintBg, text: brandPrimary },
  IN_PROGRESS: { bg: brandTintBg, text: brandPrimary },
  COMPLETED: { bg: brandTintBg, text: brandPrimary },
  // Issue/ticket states
  WAITING_MANAGER_APPROVAL: { bg: brandTintBg, text: brandSecondary },
  WAITING_TENANT_APPROVAL: { bg: brandTintBg, text: brandSecondary },
  WAITING_PAYMENT: { bg: brandTintBg, text: brandSecondary },
  DONE: { bg: brandTintBg, text: brandPrimary },
  CLOSED: { bg: brandTintBg, text: brandPrimary },
  FAILED: { bg: "#FEE2E2", text: "#DC2626" },
  CANCELLED: { bg: "#F3F4F6", text: "#6B7280" },
  OVERDUE: { bg: "#FEE2E2", text: "#B91C1C" },
  AVAILABLE: { bg: brandTintBg, text: brandSecondary },
  BOOKED: { bg: brandTintBg, text: brandSecondary },
  OTHER: { bg: "#F1F5F9", text: "#475569" },
};

/**
 * Styles cho màn hình Chi tiết Work Slot của Staff.
 * Thiết kế: hero banner, icon cho mỗi row, status có màu, phân tách rõ hai phần.
 */
export const staffWorkSlotStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },

  /** Hero banner: khung giờ + ngày nổi bật */
  heroBanner: {
    backgroundColor: brandPrimary,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTime: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroDate: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
    fontWeight: "500",
  },
  heroJobType: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },

  /** Section card */
  section: {
    backgroundColor: "#fff",
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 10,
  },
  card: {
    marginTop: 4,
  },

  /** Info row có icon */
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingVertical: 2,
  },
  rowLast: {
    marginBottom: 0,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 22,
    fontWeight: "500",
  },
  valueMono: {
    fontFamily: "monospace",
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },

  loadingWrap: {
    padding: 32,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  errorCard: {
    padding: 18,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
  },
  emptyCard: {
    padding: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
  },

  /** Nút cập nhật trạng thái job */
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    backgroundColor: brandPrimary,
  },
  actionBtnSuccess: {
    backgroundColor: brandPrimary,
  },
  actionBtnDisabled: {
    backgroundColor: "#E2E8F0",
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  actionBtnTextDisabled: {
    color: "#94a3b8",
  },
});
