import { StyleSheet } from "react-native";
import {
  BRAND_DANGER,
  brandDangerBorder,
  brandPrimary,
  brandSecondary,
  brandTintBg,
  neutral,
} from "../../../../shared/theme/color";

/**
 * Styles dùng chung cho các màn hình thiết bị (Item): ItemListScreen, ItemCreateScreen, ItemEditScreen.
 * Tách ra từ inline styles và categoryScreenStyles để code gọn, dễ chỉnh.
 */
export const itemScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  /** Padding thêm khi có bàn phím (form create/edit) */
  scrollContentWithKeyboard: {
    paddingBottom: 160,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 48,
  },
  inputReadonlyDim: {
    opacity: 0.65,
    color: "#6B7280",
  },
  fieldSpacer: {
    marginTop: 18,
  },
  /** Hàng chip chọn nhà / danh mục */
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: brandPrimary,
  },
  chipText: {
    fontSize: 13,
    color: "#374151",
  },
  chipTextSelected: {
    color: "#fff",
  },
  /** Hàng nút trạng thái (AssetStatus) */
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#E5E7EB",
  },
  statusBtnSelected: {
    backgroundColor: brandPrimary,
  },
  statusBtnText: {
    fontSize: 14,
    color: "#374151",
  },
  statusBtnTextSelected: {
    color: "#fff",
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: brandPrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  /** Attach images (ItemCreate / ItemEdit) */
  imagesSection: {
    marginTop: 18,
  },
  imagesHint: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748b",
    fontStyle: "italic",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  imageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageStrip: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  imageStripScroll: {
    maxHeight: 170,
  },
  imageThumb: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },
  imageThumbHorizontal: {
    width: 150,
    aspectRatio: 1,
  },
  imageMoreBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  imageMoreBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  imageThumbInner: {
    width: "100%",
    height: "100%",
  },
  imageThumbImg: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  removeImageBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalContent: {
    width: "100%",
    height: "82%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  imageModalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  imageModalCloseText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 24,
  },
  imageModalImage: {
    width: "100%",
    height: "100%",
  },
  /** Hàng 2 nút Cập nhật + Xóa thiết bị (2 nút cạnh nhau) */
  actionBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  /** Nửa chiều rộng cho mỗi nút, override marginTop khi dùng trong row */
  actionBtnHalf: {
    flex: 1,
    marginTop: 0,
  },
  /** Nút xóa (xóa mềm) — đỏ */
  deleteBtn: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_DANGER,
    borderWidth: 1,
    borderColor: brandDangerBorder,
  },
  deleteBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  /** Nút gỡ NFC (nhẹ hơn nút xóa) */
  detachNfcBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  detachNfcBtnDisabled: {
    opacity: 0.5,
  },
  detachNfcBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  successText: {
    marginTop: 12,
    fontSize: 14,
    color: brandPrimary,
    textAlign: "center",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: brandSecondary,
    textAlign: "center",
  },
  // ---------- ItemListScreen ----------
  loadingCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorMessage: {
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  tryAgainBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: brandPrimary,
  },
  tryAgainBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
  },
  filterWrap: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  filterDropdown: {
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 48,
  },
  searchClearBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchClearBtnText: {
    color: "#334155",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
  imageLibraryLink: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  imageLibraryLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: brandPrimary,
    textDecorationLine: "underline",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  itemCard: {
    marginBottom: 10,
  },
  itemCardCategory: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral.textSecondary,
    marginBottom: 4,
  },
  itemCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  itemCardMeta: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 2,
  },
  itemCardCondition: {
    fontSize: 13,
    color: "#6B7280",
  },
  // ---------- ItemDescriptionScreen (chỉ xem thông tin thiết bị khi quét NFC) ----------
  descriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  descriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  descriptionRowLast: {
    borderBottomWidth: 0,
  },
  descriptionLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 0.4,
  },
  descriptionValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
    flex: 0.6,
    textAlign: "right",
  },
  descriptionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  descriptionStatusAvailable: {
    backgroundColor: brandTintBg,
  },
  descriptionStatusInUse: {
    backgroundColor: brandTintBg,
  },
  descriptionStatusDisposed: {
    backgroundColor: brandTintBg,
  },
  descriptionStatusOther: {
    backgroundColor: "#F3F4F6",
  },
  descriptionEditBtn: {
    marginTop: 24,
    backgroundColor: brandPrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  descriptionEditBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
