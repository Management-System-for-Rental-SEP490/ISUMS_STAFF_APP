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
  PENDING: { bg: brandTintBg, text: brandSecondary },
  WAITING_MANAGER_CONFIRM: { bg: brandTintBg, text: brandSecondary },
  BOOKED: { bg: brandTintBg, text: brandSecondary },
  BLOCKED: { bg: "#F3F4F6", text: "#6B7280" },
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

  /** Ticket images (issue handling) */
  imageSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  imageLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  imageEmptyText: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
  },
  ticketImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 6,
  },
  ticketImagesScroll: {
    maxHeight: 170,
  },
  ticketImagesStrip: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  ticketImageThumb: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  ticketImageThumbHorizontal: {
    width: 150,
    aspectRatio: 1,
  },
  ticketImagesMoreBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  ticketImagesMoreBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  ticketImage: {
    width: "100%",
    height: "100%",
  },

  maintenanceModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  maintenanceModalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    maxHeight: "88%",
  },
  maintenanceModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  maintenanceModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  maintenanceModalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 10,
  },
  maintenanceCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  maintenanceCloseBtnText: {
    fontSize: 20,
    color: "#334155",
    lineHeight: 22,
  },
  floorSortScroll: {
    marginBottom: 10,
  },
  floorSortContent: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  floorChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  floorChipSelected: {
    borderColor: brandPrimary,
    backgroundColor: brandTintBg,
  },
  floorChipText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  floorChipTextSelected: {
    color: brandPrimary,
  },
  maintenanceHintCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },
  maintenanceHintText: {
    fontSize: 13,
    color: "#475569",
  },
  maintenanceDraftTitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 2,
  },
  maintenanceDraftList: {
    maxHeight: 160,
    marginBottom: 10,
  },
  maintenanceDraftRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  maintenanceDraftName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  maintenanceDraftMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  maintenanceActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  maintenanceSubmitBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandPrimary,
  },
  maintenanceSubmitBtnDisabled: {
    opacity: 0.65,
  },
  maintenanceSubmitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  maintenanceSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
  },
  maintenanceSecondaryBtnText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 14,
  },
  maintenanceLibraryLink: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  maintenanceLibraryLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: brandPrimary,
    textDecorationLine: "underline",
  },
  editAssetModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  editAssetModalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    maxHeight: "90%",
  },
  editAssetFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  editAssetInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 10,
  },
  editAssetReadonly: {
    backgroundColor: "#F8FAFC",
    color: "#64748B",
  },
  editAssetNoteInput: {
    minHeight: 94,
    textAlignVertical: "top",
  },
  maintenanceImageThumbWrap: {
    position: "relative",
  },
  maintenanceImageDeleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  maintenanceImageDeleteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },

  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  imageModalContent: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#ffffff",
  },
  imageModalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  imageModalCloseText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  imageModalImage: {
    width: "100%",
    height: 320,
  },
});
