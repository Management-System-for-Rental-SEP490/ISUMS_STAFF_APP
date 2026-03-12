// Định nghĩa các kiểu dữ liệu trả về từ Backend API.
// Mục tiêu: gom TẤT CẢ các kiểu liên quan đến response API vào một nơi
// để dễ bảo trì, tìm kiếm và tái sử dụng.

// =========================================================
// Response wrapper chung (User API / các BE cùng format Swagger)
// =========================================================

/** Wrapper chuẩn response từ BE (statusCode, success, message, errors, data). Dùng cho GET /api/users/me và các API cùng format. */
export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  errors: Array<{
    code: string;
    field: string;
    message: string;
  }>;
  data: T;
}

// =========================================================
// User API
// =========================================================

/** Kiểu dữ liệu user profile trả về từ API (ví dụ: GET /api/users/me). */
export interface UserProfileResponse {
  /** ID duy nhất của user trong hệ thống. */
  id: string;
  /** Tên hiển thị. */
  name: string;
  /** Email của user. */
  email: string;
  /** Số CMND/CCCD. */
  identityNumber: string;
  /** Số điện thoại. */
  phoneNumber: string;
  /** Danh sách roles (VD: ["TENANT", "ADMIN"]). */
  roles: string[];
}

// =========================================================
// Houses API (/api/houses)
// =========================================================

/** Một khu vực chức năng trong nhà (phòng khách, bếp, phòng tắm, hành lang...) từ API GET /api/houses. */
export interface FunctionalAreaFromApi {
  /** ID khu vực. */
  id: string;
  /** ID căn nhà chứa khu vực này. */
  houseId: string;
  /** Tên hiển thị (VD: Phòng khách, Bếp, Phòng tắm tầng 2). */
  name: string;
  /** Loại khu vực: LIVINGROOM, KITCHEN, BATHROOM, HALLWAY, BEDROOM, ... */
  areaType: string;
  /** Số tầng (chuỗi do BE trả về, VD: "1", "2"). */
  floorNo: string;
  /** Mô tả (có thể null). */
  description: string | null;
  /** Trạng thái (VD: NORMAL). */
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Dữ liệu căn nhà trả về từ API GET /api/houses (dùng cho Staff). */
export interface HouseFromApi {
  /** ID căn nhà. */
  id: string;
  /** ID user đang thuê (nếu có), null nếu nhà đang trống. */
  userRentalId: string | null;
  /** ID khu vực (region), có thể null. */
  regionId?: string | null;
  /** Tên hiển thị của căn nhà (ví dụ: Phòng 101, Căn A2). */
  name: string;
  /** Địa chỉ đầy đủ dạng text do BE trả về. */
  address: string;
  /** Phường. */
  ward?: string;
  /** Quận/Huyện. */
  commune?: string;
  /** Thành phố. */
  city?: string;
  /** Mô tả thêm về căn nhà. */
  description?: string;
  /** Trạng thái: ví dụ "AVAILABLE", "RENTED", ... */
  status?: string;
  /** Danh sách khu vực chức năng trong nhà (phòng khách, bếp, phòng tắm...). */
  functionalAreas?: FunctionalAreaFromApi[];
}

/** Response body của API GET /api/houses. */
export interface HousesApiResponse {
  /** Mảng danh sách căn nhà. */
  data: HouseFromApi[];
  /** Thông điệp từ BE (dùng cho debug/log). */
  message: string;
  /** HTTP status code mà BE mapping (ví dụ: 200, 401, 500). */
  statusCode: number;
  /** Cờ đánh dấu request thành công hay không. */
  success: boolean;
}

// =========================================================
// Asset Categories API (/api/asset/categories)
// =========================================================

/** Một danh mục thiết bị từ API GET /api/assets/categories (loại sản phẩm/thiết bị trong hệ thống). */
export interface AssetCategoryFromApi {
  /** ID danh mục. */
  id: string;
  /** Tên danh mục (ví dụ: IoT, Furniture, IT Equipment...). */
  name: string;
  /** Phần trăm bồi thường khi hư hỏng (do BE quy định). */
  compensationPercent: number;
  /** Mô tả chi tiết về danh mục. */
  description: string;
  /** Loại phát hiện (BE có thể trả về, ví dụ: EIF, NONI). */
  detectionType?: string;
}

/** Response body của API GET /api/asset/categories. */
export interface AssetCategoriesApiResponse {
  /** Danh sách các danh mục thiết bị. */
  data: AssetCategoryFromApi[];
}

/**
 * Body gửi lên khi tạo danh mục thiết bị mới (POST /api/asset/categories).
 * Khớp với API: name, compensationPercent, description.
 */
export interface CreateAssetCategoryRequest {
  /** Tên danh mục (ví dụ: "Máy lạnh", "Bóng đèn"). */
  name: string;
  /** Phần trăm bồi thường khi hư hỏng (0–100 hoặc theo quy định BE). */
  compensationPercent: number;
  /** Mô tả chi tiết về danh mục. */
  description: string;
}

/**
 * Response body của API POST /api/asset/categories (tạo danh mục thành công).
 * BE trả về data (danh mục vừa tạo), message, statusCode (201), success.
 */
export interface CreateAssetCategoryApiResponse {
  /** Danh mục vừa được tạo (có id do BE sinh). */
  data: AssetCategoryFromApi;
  /** Thông báo từ BE (ví dụ: "Create category successfully"). */
  message: string;
  /** Mã HTTP (201 = Created). */
  statusCode: number;
  /** Cờ thành công. */
  success: boolean;
}

/**
 * Body gửi lên khi cập nhật danh mục (PUT /api/asset/categories/:id).
 * Cùng cấu trúc với Create: name, compensationPercent, description.
 */
export type UpdateAssetCategoryRequest = CreateAssetCategoryRequest;

/**
 * Response body của API PUT /api/asset/categories/:id (cập nhật thành công).
 */
export interface UpdateAssetCategoryApiResponse {
  data: AssetCategoryFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

// =========================================================
// Asset Items API (/api/asset/items)
// =========================================================

/** Tham số filter cho GET /api/asset/items (tùy chọn theo nhà, danh mục, hoặc NFC). */
export type AssetItemsParams = {
  /** Lọc theo ID căn nhà. */
  houseId?: string;
  /** Lọc theo ID danh mục thiết bị. */
  categoryId?: string;
  /** Lọc theo mã NFC đã gán (thường trả về tối đa 1 thiết bị). Một số BE hỗ trợ query ?nfcId=xxx. */
  nfcId?: string;
};

/** Một thiết bị/item từ API GET /api/asset/items (có thể filter theo houseId, categoryId). */
export interface AssetItemFromApi {
  /** ID thiết bị. */
  id: string;
  /** ID căn nhà chứa thiết bị này. */
  houseId: string;
  /** ID danh mục thiết bị (khóa ngoại sang AssetCategoryFromApi). */
  categoryId: string;
  /** Tên hiển thị cho thiết bị (ví dụ: Máy lạnh phòng khách). */
  displayName: string;
  /** Số serial (do nhà sản xuất). */
  serialNumber: string;
  /** NFC tag ID gắn với thiết bị (từ bảng asset tags), null nếu chưa gán. */
  nfcTag: string | null;
  /** QR tag ID gắn với thiết bị, null nếu chưa gán. */
  qrTag: string | null;
  /** Danh sách tags (NFC, QR, ...) gắn với thiết bị (nếu BE hỗ trợ trả về). */
  tags?: AssetTagFromApi[];
  /** Tình trạng còn lại (%), ví dụ 80 = còn tốt 80%. */
  conditionPercent: number;
  /** Trạng thái: VD "AVAILABLE", "DISPOSED", ... */
  status: string;
}

/** Response body của API GET /api/asset/items. */
export interface AssetItemsApiResponse {
  /** Danh sách các thiết bị. */
  data: AssetItemFromApi[];
}

/**
 * Body gửi lên khi tạo thiết bị mới (POST /api/asset/items).
 * Khớp API: houseId, categoryId, displayName, serialNumber, nfcTag, conditionPercent, status.
 */
export interface CreateAssetItemRequest {
  houseId: string;
  categoryId: string;
  displayName: string;
  serialNumber: string;
  /** Có thể chuỗi hoặc null nếu chưa gán NFC. */
  nfcTag: string | null;
  /** Có thể chuỗi hoặc null nếu chưa gán QR. */
  qrTag: string | null;
  conditionPercent: number;
  /** VD "AVAILABLE", "DISPOSED". */
  status: string;
}

/** Response body của API POST /api/asset/items (tạo thiết bị thành công). */
export interface CreateAssetItemApiResponse {
  data: AssetItemFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

/** Body cập nhật thiết bị (PUT /api/asset/items/:id). Có thể dùng cùng cấu trúc create. */
export type UpdateAssetItemRequest = CreateAssetItemRequest;

/** Response PUT /api/asset/items/:id. */
export interface UpdateAssetItemApiResponse {
  data: AssetItemFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

// =========================================================
// Asset Tags API (POST /api/asset/tags — gán NFC vào thiết bị)
// =========================================================

/** Body gửi lên khi gán tag NFC vào thiết bị (POST /api/asset/tags). */
export interface AttachAssetTagRequest {
  /** ID thiết bị (asset item) cần gán tag. */
  assetId: string;
  /** Giá trị mã NFC (ví dụ "010101010" hoặc "04 9C 59 A2 B2 19 90"). */
  tagValue: string;
  /** Loại tag, thường là "NFC" hoặc "QR_CODE". */
  tagType: "NFC" | "QR_CODE";
}

/** Dữ liệu tag trả về từ POST /api/asset/tags khi gán thành công. */
export interface AssetTagFromApi {
  id: string;
  tagValue: string;
  tagType: string;
  assetId: string;
  houseId: string;
  activatedAt: string;
  isActive: boolean;
}

/** Response body của API POST /api/asset/tags (gán tag thành công, statusCode 201). */
export interface AttachAssetTagApiResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: AssetTagFromApi;
}

/** Response body của API PUT /api/asset/tags/detach/{tagValue} (gỡ tag NFC khỏi thiết bị). */
export type DetachAssetTagApiResponse = AttachAssetTagApiResponse;

/** Response body của API GET /api/asset/tags/asset/{tagValue} (lấy thiết bị từ mã NFC). */
export interface GetAssetByTagValueApiResponse {
  statusCode: number;
  success: boolean;
  message: string;
  /** BE trả về mảng (thường 1 phần tử) HOẶC 1 object thiết bị khớp với tagValue. */
  data: AssetItemFromApi[] | AssetItemFromApi;
}

// Sau này có thêm API khác thì định nghĩa tiếp ở dưới
// Ví dụ:
// export interface DeviceResponse { ... }
