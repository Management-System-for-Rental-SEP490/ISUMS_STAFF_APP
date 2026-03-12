import { RentalHouse } from "../types";

// Giả lập dữ liệu thông tin ngôi nhà của tenant
const MOCK_HOUSE: RentalHouse = {
  id: "H001",
  name: "Căn hộ Studio 101",
  address: "123 Đường Nguyễn Văn Linh, Q.7, TP.HCM",
  contractId: "HD-2024-001",
  contractStatus: "Active",
  startDate: "2024-01-01",
  endDate: "2025-01-01",
};

// Hàm lấy thông tin nhà của tenant đang đăng nhập (giả lập)
// Output: Promise<RentalHouse> - Thông tin chi tiết ngôi nhà
export const gettenantHouseInfo = async (): Promise<RentalHouse> => {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_HOUSE), 1000));
};

/** Danh sách nhà mà Staff quản lý (dùng cho Home Staff + chi tiết nhà). Khi có API thay bằng gọi BE. */
const STAFF_BUILDINGS: RentalHouse[] = [
  MOCK_HOUSE,
  {
    id: "H002",
    name: "Nhà B - Tòa 2",
    address: "456 Đường XYZ, Q.2, TP.HCM",
    contractId: "HD-2024-002",
    contractStatus: "Active",
    startDate: "2024-02-01",
    endDate: "2025-02-01",
  },
  {
    id: "H003",
    name: "Nhà C - Tòa 3",
    address: "789 Đường DEF, Q.3, TP.HCM",
    contractId: "HD-2024-003",
    contractStatus: "Active",
    startDate: "2024-03-01",
    endDate: "2025-03-01",
  },
];

/** Lấy danh sách nhà mà staff được quản lý (mock). */
export const getStaffBuildings = async (): Promise<RentalHouse[]> => {
  return new Promise((resolve) =>
    setTimeout(() => resolve([...STAFF_BUILDINGS]), 400)
  );
};
