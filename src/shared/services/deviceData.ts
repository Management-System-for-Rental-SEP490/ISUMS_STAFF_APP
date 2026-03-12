import { Device } from "../types";

// Dữ liệu giả lập cho danh sách thiết bị
// Tuân thủ kiểu Device trong types/index.ts
export const mockDevices: Device[] = [
  {
    id: "dev-001",
    name: "Đồng hồ điện tòa A - phòng 101",
    type: "electric",
    nfcTagId: "04 9C 59 A2 B2 19 90",
    location: "Tầng 1 - Phòng 101",
    status: "active",
    metadata: {
      serialNumber: "SN-ELEC-2025-001",
      manufacturer: "Siemens",
      model: "SM-2025",
      installationDate: "2023-11-10",
    },
  },
  {
    id: "dev-002",
    name: "Đồng hồ nước tòa A - phòng 102",
    type: "water",
    nfcTagId: "1D 6C 7D 0E 09 10 80",
    location: "Tầng 1 - Phòng 102",
    status: "maintenance",
    metadata: {
      serialNumber: "SN-WATER-2025-002",
      manufacturer: "Kamstrup",
      model: "KM-2024",
      installationDate: "2022-08-06",
    },
  },
  {
    id: "dev-003",
    name: "Máy lạnh Panasonic",
    type: "other",
    nfcTagId: "AC-PANA-99",
    location: "Phòng ngủ",
    status: "active",
    metadata: {
      serialNumber: "PN-123456",
      manufacturer: "Panasonic",
      model: "Inverter 1.5HP",
      installationDate: "2023-05-15",
    },
  },
  {
    id: "dev-004",
    name: "Tủ lạnh Samsung",
    type: "other",
    nfcTagId: "REF-SAM-88",
    location: "Bếp",
    status: "active",
    metadata: {
      serialNumber: "SAM-REF-001",
      manufacturer: "Samsung",
      model: "Inverter 300L",
    },
  },
  {
    id: "dev-005",
    name: "Thiết bị NFC - NTAG213",
    type: "other",
    nfcTagId: "1D A3 8A 0E 09 10 80",
    location: "Chưa xác định",
    status: "pending",
    metadata: {
      serialNumber: "SN-NFC-2025-003",
      manufacturer: "NXP Semiconductors",
      model: "NTAG213",
      installationDate: new Date().toISOString().split("T")[0],
    },
  },
  {
    id: "dev-006",
    name: "Máy giặt chưa gán NFC",
    type: "other",
    nfcTagId: "",
    location: "Tầng 1 - Phòng 101",
    status: "pending",
    metadata: {
      manufacturer: "LG",
      model: "Inverter 9kg",
    },
  },
  {
    id: "dev-007",
    name: "Quạt trần phòng 202",
    type: "other",
    nfcTagId: "",
    location: "Tầng 2 - Phòng 202",
    status: "active",
    metadata: {},
  },
];

/** Ánh xạ nhà (houseId) -> danh sách id thiết bị thuộc nhà đó. Dùng cho Staff xem thiết bị theo nhà. */
const HOUSE_DEVICE_IDS: Record<string, string[]> = {
  H001: ["dev-001", "dev-002", "dev-003", "dev-006"],
  H002: ["dev-004", "dev-005"],
  H003: ["dev-007"],
};

// Hàm lấy thiết bị theo NFC Tag ID
export const getDeviceByNfcTag = (nfcTagId: string): Device | undefined =>
  mockDevices.find((device) => device.nfcTagId === nfcTagId);

// Hàm lấy thiết bị theo ID
export const getDeviceById = (id: string): Device | undefined =>
  mockDevices.find((device) => device.id === id);

// Hàm lấy danh sách thiết bị của một ngôi nhà (giả lập)
// Input: houseId (string) - ID của ngôi nhà
// Output: Promise<Device[]> - Danh sách thiết bị thuộc nhà đó (theo HOUSE_DEVICE_IDS)
export const getHouseDevices = async (houseId: string): Promise<Device[]> => {
  const ids = HOUSE_DEVICE_IDS[houseId];
  const list = ids
    ? ids.map((id) => mockDevices.find((d) => d.id === id)).filter(Boolean) as Device[]
    : [];
  return new Promise((resolve) =>
    setTimeout(() => resolve(list), 500)
  );
};
