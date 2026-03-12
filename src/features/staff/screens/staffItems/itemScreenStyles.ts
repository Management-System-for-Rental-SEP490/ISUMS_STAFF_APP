import { StyleSheet } from "react-native";

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
    marginRight: 8,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
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
    backgroundColor: "#2563EB",
  },
  chipText: {
    fontSize: 13,
    color: "#374151",
  },
  chipTextSelected: {
    color: "#fff",
  },
  /** Hàng nút trạng thái (AVAILABLE / DISPOSED) */
  statusRow: {
    flexDirection: "row",
  },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#E5E7EB",
  },
  statusBtnSelected: {
    backgroundColor: "#2563EB",
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
    backgroundColor: "#2563EB",
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
  /** Nút xóa (xóa mềm) - màu danger */
  deleteBtn: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 1,
    borderColor: "#B91C1C",
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
    color: "#059669",
    textAlign: "center",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#DC2626",
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
    backgroundColor: "#2563EB",
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
    backgroundColor: "#D1FAE5",
  },
  descriptionStatusInUse: {
    backgroundColor: "#FEF3C7",
  },
  descriptionStatusDisposed: {
    backgroundColor: "#FEE2E2",
  },
  descriptionStatusOther: {
    backgroundColor: "#F3F4F6",
  },
  descriptionEditBtn: {
    marginTop: 24,
    backgroundColor: "#2563EB",
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
