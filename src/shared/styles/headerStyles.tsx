import { StyleSheet } from "react-native";
// Định nghĩa một object các style sử dụng trong header bằng StyleSheet.create({
const headerStyles = StyleSheet.create({
  gradient: { // Style cho nền gradient phần header
    width: "100%", // Đảm bảo chiếm toàn bộ chiều rộng của parent
    paddingVertical: 18, // Padding theo chiều dọc (top và bottom) là 18
    paddingHorizontal: 20, // Padding theo chiều ngang (left và right) là 20
    borderBottomLeftRadius: 32, // Bo góc trái phía dưới 32 đơn vị
    borderBottomRightRadius: 32, // Bo góc phải phía dưới 32 đơn vị
    overflow: "hidden", // Đảm bảo nội dung không tràn ra ngoài
  },
  container: {
    width: "100%",
    overflow: "hidden",
  },
  headerRow: { // Style cho View chứa hàng ngang chính của header
    flexDirection: "row", // Các phần tử con xếp thành hàng ngang
    alignItems: "center", // Căn giữa các phần tử con theo chiều dọc
    gap: 10, // Khoảng cách giữa các phần tử con là 10
    width: "100%", // Đảm bảo chiếm toàn bộ chiều rộng
    flexShrink: 1, // Cho phép thu nhỏ nếu cần
  },
  /** Chỉ logo + tên app — căn giữa thanh header */
  headerRowCentered: {
    justifyContent: "center",
  },
  brandRow: { // Style cho phần chứa logo và tên thương hiệu
    flexDirection: "row", // Xếp cạnh nhau theo hàng ngang
    alignItems: "center", // Căn giữa các mục theo chiều dọc
    flexShrink: 0, // Không cho phép thu nhỏ phần brand
  },
  logoWrapper: { // Style cho ô chứa logo bên trái
    width: 48, // Chiều rộng 48
    height: 48, // Chiều cao 48
    borderRadius: 14, // Bo góc 14 (tạo hình tròn/capsule)
    backgroundColor: "rgba(255,255,255,0.3)", // Nền trắng trong suốt 30%
    justifyContent: "center", // Căn giữa nội dung theo chiều dọc
    alignItems: "center", // Căn giữa nội dung theo chiều ngang
    marginRight: 8, // Khoảng cách với phần kế bên phải là 8
  },
  brandTitle: { // Style cho Text tên thương hiệu
    color: "#fff", // Màu chữ trắng
    fontSize: 18, // Cỡ chữ 18
    fontWeight: "700", // Đậm
    flexShrink: 0, // Không cho phép thu nhỏ text
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: "#0f172a",
    minWidth: 0, // Cho phép thu nhỏ xuống dưới 0 để flex hoạt động đúng
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
    minWidth: 0,
  },
  /** Nút xóa nội dung ô search (×), hiện khi có text. */
  clearBtn: {
    marginLeft: 6,
    padding: 2,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default headerStyles;