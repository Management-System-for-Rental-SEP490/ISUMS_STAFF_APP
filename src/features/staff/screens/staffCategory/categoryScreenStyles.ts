import { StyleSheet } from "react-native";
import { brandPrimary } from "../../../../shared/theme/color";

/**
 * Styles cho màn hình Tạo danh mục thiết bị (CategoryScreen).
 * Accent theo theme thương hiệu (shared/theme/color).
 */
export const categoryScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  /** Thanh trên: nút back + tiêu đề */
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
  /** Vùng cuộn chứa form */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  /** Card chứa form */
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
  /** Nhãn cho từng ô nhập */
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  /** Ô nhập text (name, description) */
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
  /** Ô nhập nhiều dòng (description) */
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  /** Khoảng cách giữa các trường */
  fieldSpacer: {
    marginTop: 18,
  },
  /** Nút Gửi */
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
  /** Thông báo lỗi dưới form */
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
  },
  /** Thông báo thành công */
  successText: {
    marginTop: 12,
    fontSize: 14,
    color: brandPrimary,
    textAlign: "center",
  },
});
