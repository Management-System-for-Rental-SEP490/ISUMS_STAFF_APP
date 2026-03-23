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

/** Trạng thái ticket/issue từ BE (IssueStatus). */
export type IssueStatus =
  | "CREATED"
  | "NEED_RESCHEDULE"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING_MANAGER_APPROVAL"
  | "WAITING_TENANT_APPROVAL"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CLOSED"
  | "CANCELLED"
  | string;

/** Trạng thái ticket/issue có thể cập nhật từ Staff UI. */
export type IssueTicketStatusUpdate = "IN_PROGRESS" | "DONE";

/**
 * Ticket/issue trả về từ GET /api/issues/tickets/{ticketId}.
 * Ví dụ response (BE):
 * {
 *   data: { id, tenantId, houseId, assetId, assignedStaffId, slotId, type, status, title, description, createdAt },
 *   message, statusCode, success
 * }
 */
export interface IssueTicketFromApi {
  id: string;
  tenantId: string;
  houseId: string;
  assetId: string;
  assignedStaffId: string;
  slotId: string;
  /** REPAIR | QUESTION | ... */
  type: string;
  status: IssueStatus;
  title: string;
  description: string;
  createdAt: string; // ISO 8601
}

/** Response wrapper của GET /api/issues/tickets/{ticketId}. */
export interface IssueTicketApiResponse {
  data: IssueTicketFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

/** Trạng thái báo giá từ BE (QuoteStatus) cho luồng quote + payment. */
export type QuoteStatus =
  | "DRAFT"
  | "WAITING_MANAGER_APPROVAL"
  | "WAITING_TENANT_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | string;

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

/** Tọa độ khu vực trong sơ đồ mặt bằng (viewBox 0 0 100 100). */
export interface FunctionalAreaPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  /** Vị trí trên sơ đồ mặt bằng (BE); thiếu thì dùng fallback theo areaType trong UI. */
  position?: FunctionalAreaPosition;
  createdAt?: string;
  updatedAt?: string;
}

/** Dữ liệu căn nhà trả về từ API GET /api/houses (dùng cho Staff). */
export type HouseStatus = "AVAILABLE" | "RENTED" | "REPAIRED" | string;

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
  /** Trạng thái nhà theo HouseStatus BE. */
  status?: HouseStatus;
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

/** Response body của API GET /api/houses/{id}. */
export interface HouseDetailApiResponse {
  /** Thông tin chi tiết một căn nhà. */
  data: HouseFromApi;
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

/**
 * Trạng thái thiết bị (asset) theo enum BE: không AVAILABLE / DELETED.
 * BE cũ: `AVAILABLE` → IN_USE; `DELETED` → DISPOSED (chuẩn hóa trong `normalizeAssetItemStatusFromApi`).
 */
export type AssetStatus = "IN_USE" | "ACTIVE" | "BROKEN" | "DISPOSED";

export function normalizeAssetItemStatusFromApi(
  status: string | null | undefined
): string {
  const s = status != null ? String(status).trim() : "";
  if (s === "" || s === "AVAILABLE") return "IN_USE";
  if (s === "DELETED") return "DISPOSED";
  return s;
}

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
  /** Trạng thái (AssetStatus; sau khi qua service thường đã chuẩn hóa, không còn AVAILABLE). */
  status: string;
  /**
   * ID khu vực chức năng (phòng/bếp/…) trong nhà; null nếu chưa gán.
   * BE có thể trả `functionAreaId` hoặc `functionalAreaId` — service chuẩn hóa về `functionAreaId`.
   */
  functionAreaId?: string | null;
}

/** Response body của API GET /api/asset/items. */
export interface AssetItemsApiResponse {
  /** Danh sách các thiết bị. */
  data: AssetItemFromApi[];
}

/**
 * Body gửi lên khi tạo thiết bị mới (POST /api/assets/items).
 * BE Postman: `nfcId`, `functionAreaId`, … (PUT có thể gửi tập trường tối thiểu).
 */
export interface CreateAssetItemRequest {
  houseId: string;
  categoryId: string;
  displayName: string;
  serialNumber: string;
  /** Gán NFC — nhiều BE nhận `nfcId` trên POST. */
  nfcTag: string | null;
  /** Gán QR — tương tự `qrId` trên POST nếu BE hỗ trợ. */
  qrTag: string | null;
  /** Ưu tiên gửi lên POST dưới key `nfcId` (khớp Swagger/Postman). */
  nfcId?: string | null;
  qrId?: string | null;
  conditionPercent: number;
  /** Trạng thái (AssetStatus). */
  status: string;
  /** Gán thiết bị vào khu vực chức năng (tùy chọn). */
  functionAreaId?: string | null;
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
// IoT Devices API (/api/assets/iot-devices)
// =========================================================

/**
 * Một thiết bị IoT (node) trả về trong `data.devices` từ API
 * GET /api/assets/iot-devices/house/{houseId}.
 *
 * Lưu ý: backend đã gắn thiết bị IoT vào khu vực bằng `areaName`.
 */
export interface IotNodeDeviceFromApi {
  /** ID bản ghi thiết bị IoT (UUID). */
  id: string;
  /** ID asset item liên quan trong hệ thống asset (UUID). */
  assetId: string;
  /** Mã loại thiết bị IoT (ví dụ: IOT_NODE). */
  categoryCode: string;
  /** Tên hiển thị (ví dụ: Node DA234878). */
  displayName: string;
  /** Serial number của thiết bị. */
  serialNumber: string;
  /** Trạng thái (ví dụ: IN_USE). */
  status: string;
  /** Thing name/ID dùng để subscribe telemetry. */
  thing: string;
  /** Tên khu vực được gắn (ví dụ: Phòng Bếp). */
  areaName: string | null;
}

/**
 * Dữ liệu tổng của một "controller" IoT của nhà.
 * Đây chính là object trong response `data`.
 */
export interface IotControllerHouseDataFromApi {
  id: string;
  houseName: string;
  /** MAC / Device ID (ví dụ: B0:CB:D8:C1:A0:F4). */
  deviceId: string;
  /** Thing name của controller (ví dụ: ctrl-b0cbd8c1a0f4). */
  thingName: string;
  /** Trạng thái provisioning (ví dụ: DEPROVISIONED). */
  status: string;
  /** Khu vực gắn controller (nếu có). */
  areaName: string | null;
  createdAt?: string;
  activatedAt?: string;
  /** Danh sách node thuộc controller/nhà. */
  devices: IotNodeDeviceFromApi[];
}

/** Response chuẩn: { data: IotControllerHouseDataFromApi, message, statusCode, success, errors } */
export type IotDevicesByHouseApiResponse = ApiResponse<IotControllerHouseDataFromApi>;

// =========================================================
// IoT Provision API (/api/assets/houses/{houseId}/iot/provision)
// =========================================================

/** Body gửi lên khi gắn (provision) thiết bị IoT vào nhà/khu vực. */
export interface IotProvisionRequest {
  /** Device ID đọc được từ QR của thiết bị IoT. */
  deviceId: string;
  /** ID khu vực chức năng trong nhà. */
  areaId: string;
}

/** Data trả về khi gắn controller IoT thành công (theo swagger). */
export interface IotProvisionResult {
  thingName: string;
  certificatePem: string;
  privateKey: string;
  mqttEndpoint: string;
  houseId: string;
}

/** Response chuẩn của API provision controller. */
export type IotProvisionApiResponse = ApiResponse<IotProvisionResult>;

/** Body gửi lên khi xin token provision cho Node. */
export interface IotProvisionTokenRequest {
  serial: string;
}

/** Data trả về khi xin token provision cho Node. */
export interface IotProvisionTokenResult {
  token: string;
}

export type IotProvisionTokenApiResponse = ApiResponse<IotProvisionTokenResult>;

/** Data trả về khi lấy controller theo house (để lấy deviceId/MAC). */
export interface IotControllerByHouseResult {
  deviceId: string;
}
export type IotControllerByHouseApiResponse = ApiResponse<IotControllerByHouseResult>;

/** Body gửi lên khi gắn Node vào house. */
export interface IotProvisionNodeRequest {
  serial: string;
  token: string;
  areaId: string;
}
export type IotProvisionNodeApiResponse = ApiResponse<string>;

// =========================================================
// Asset Tags API — POST /api/assets/tags (gán), PUT /api/assets/tags/detach/{tagValue} (gỡ)
// =========================================================

/** Body gửi lên khi gán tag vào thiết bị (POST /api/assets/tags). */
export interface AttachAssetTagRequest {
  /** ID thiết bị (asset item) cần gán tag. */
  assetId: string;
  /** Giá trị mã NFC (ví dụ "010101010" hoặc "04 9C 59 A2 B2 19 90"). */
  tagValue: string;
  /** Loại tag, thường là "NFC" hoặc "QR_CODE". */
  tagType: "NFC" | "QR_CODE";
}

/** Dữ liệu tag trả về từ POST /api/assets/tags khi gán thành công. */
export interface AssetTagFromApi {
  id: string;
  tagValue: string;
  tagType: string;
  assetId: string;
  houseId: string;
  activatedAt: string;
  isActive: boolean;
}

/** Response body của API POST /api/assets/tags. */
export interface AttachAssetTagApiResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: AssetTagFromApi;
}

/** Response body của API PUT /api/assets/tags/detach/{tagValue}. */
export type DetachAssetTagApiResponse = AttachAssetTagApiResponse;

/** Response của GET /api/assets/tags/asset/{tagValue} (quét NFC/QR → thông tin item). */
export interface GetAssetByTagValueApiResponse {
  statusCode: number;
  success: boolean;
  message: string;
  /** Một object thiết bị (Postman) hoặc mảng (tương thích phiên bản cũ). */
  data: AssetItemFromApi[] | AssetItemFromApi;
}

// =========================================================
// Schedule Template API (/api/schedules/templates/current/{date})
// =========================================================

/** Mẫu lịch làm việc trả về từ GET /api/schedules/templates/current/{date}. */
export interface ScheduleTemplateData {
  id: string;
  /** Các ngày làm việc (VD: "MON, TUE, WED, THU, FRI, SAT") */
  workingDays: string;
  /** Giờ mở cửa (VD: "08:00:00") */
  openTime: string;
  /** Giờ bắt đầu nghỉ (VD: "12:00:00") */
  breakStart: string;
  /** Giờ kết thúc nghỉ (VD: "13:00:00") */
  breakEnd: string;
  /** Giờ đóng cửa (VD: "17:00:00") */
  closeTime: string;
  /** Độ dài mỗi slot (phút) */
  slotMinutes: number;
  /** Thời gian đệm (phút) */
  bufferMinutes: number;
  /** Ngày có hiệu lực (YYYY-MM-DD) */
  effectiveFrom: string;
  updatedAt: string;
}

/** Response body của GET /api/schedules/templates/current/{date}. */
export interface ScheduleTemplateApiResponse {
  data: ScheduleTemplateData;
  message: string;
  statusCode: number;
  success: boolean;
}

// =========================================================
// Work Slots API (/api/schedules/work_slots/staff/{staffId})
// =========================================================

/** Một work slot trả về từ GET /api/schedules/work_slots/staff/{staffId}. */
export interface WorkSlotFromApi {
  id: string;
  staffId: string;
  jobId: string;
  /** ID căn nhà mà job thuộc về (BE có thể trả thêm trường này). */
  houseId?: string;
  /** Loại công việc: MAINTENANCE, ISSUE, ... */
  jobType: string;
  /** Thời gian bắt đầu (ISO 8601), VD "2026-03-13T13:00:00" */
  startTime: string;
  /** Thời gian kết thúc (ISO 8601), VD "2026-03-13T14:00:00" */
  endTime: string;
  /** Trạng thái job: CREATED, SCHEDULED, NEED_RESCHEDULE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, OVERDUE */
  status: string;
}

/** Response body của GET /api/schedules/work_slots/staff/{staffId}. */
export interface WorkSlotsApiResponse {
  data: WorkSlotFromApi[];
  message: string;
  statusCode: number;
  success: boolean;
}

// =========================================================
// Leave API (GET /api/schedules/leave/staff/{staffId})
// =========================================================

/** Một yêu cầu nghỉ trả về từ GET /api/schedules/leave/staff/{staffId}. */
export interface LeaveRequestFromApi {
  id: string;
  staffId: string;
  /** Ngày nghỉ (YYYY-MM-DD) */
  leaveDate: string;
  /** Ghi chú / lý do nghỉ */
  note?: string | null;
  /** Trạng thái: PENDING, APPROVED, REJECTED, CANCELLED */
  status: string;
  /** ID manager duyệt (có thể null) */
  managerId?: string | null;
  /** Ghi chú quyết định từ manager */
  decisionNote?: string | null;
  createdAt?: string;
}

/** Response body của GET /api/schedules/leave/staff/{staffId}. */
export interface LeaveRequestsApiResponse {
  data: LeaveRequestFromApi[];
  message?: string;
  statusCode?: number;
  success?: boolean;
}

/** Body gửi khi POST /api/schedules/leave. */
export interface CreateLeaveRequestPayload {
  staffId: string;
  leaveDate: string; // YYYY-MM-DD
  note?: string; // Ghi chú, có thể để trống
}

/** Response body của POST /api/schedules/leave (201). */
export interface CreateLeaveRequestResponse {
  data: LeaveRequestFromApi;
  message?: string;
  statusCode?: number;
  success?: boolean;
}

/** Body gửi khi PUT /api/schedules/leave/{id} (cập nhật trạng thái, VD hủy PENDING → CANCELLED). */
export interface UpdateLeaveRequestPayload {
  status: "CANCELLED";
  /** Ghi chú quyết định (tùy chọn, thường dùng khi manager duyệt/từ chối). */
  decisionNote?: string;
}

/** Response body của PUT /api/schedules/leave/{id} (200). */
export interface UpdateLeaveRequestResponse {
  data: LeaveRequestFromApi;
  message?: string;
  statusCode?: number;
  success?: boolean;
}

// =========================================================
// Job API (GET /api/maintenances/jobs/{jobId})
// =========================================================

/** Job trả về từ GET /api/maintenances/jobs/{jobId}. Dùng jobId từ work slot để lấy chi tiết. */
export interface JobFromApi {
  id: string;
  planId: string;
  houseId: string;
  /** Ngày bắt đầu kỳ (YYYY-MM-DD) */
  periodStartDate: string;
  /** Hạn hoàn thành (ISO 8601) */
  dueDate: string;
  /** Trạng thái: CREATED, SCHEDULED, NEED_RESCHEDULE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, OVERDUE */
  status: string;
}

/** Response body của GET /api/maintenances/jobs/{jobId}. */
export interface JobApiResponse {
  data: JobFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

// =========================================================
// Staff notification (UI / mock — khi có API BE sẽ thay bằng response thật)
// =========================================================

export type StaffNotificationType =
  | "ticket_from_tenant"
  | "schedule_updated"
  | "ticket_assigned"
  | "inspection_reminder"
  | "system";

export interface StaffNotificationItem {
  id: string;
  type: StaffNotificationType;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
  createdAt: Date;
  read?: boolean;
}

// Sau này có thêm API khác thì định nghĩa tiếp ở dưới
// Ví dụ:
// export interface DeviceResponse { ... }
