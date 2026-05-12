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

export type IssueStatus =
  | "CREATED"
  | "NEED_RESCHEDULE"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING_MANAGER_CONFIRM"
  | "WAITING_MANAGER_APPROVAL"
  | "WAITING_TENANT_APPROVAL"
  | "WAITING_MANAGER_APPROVAL_QUOTE"
  | "WAITING_TENANT_APPROVAL_QUOTE"
  | "WAITING_STAFF_COMPLETION"
  | "WAITING_PAYMENT"
  | "WAITING_CASH_PAYMENT"
  | "DONE"
  | "CLOSED"
  | "CANCELLED"
  | string;

export type IssueTicketStatusUpdate =
  | "IN_PROGRESS"
  | "DONE"
  | "WAITING_PAYMENT"
  | "WAITING_CASH_PAYMENT";

export interface IssueTicketFromApi {
  id: string;
  tenantId: string;
  tenantPhone?: string | null;
  houseId: string;
  assetId: string;
  assignedStaffId: string;
  staffName?: string | null;
  staffPhone?: string | null;
  slotId: string;
  type: string;
  status: IssueStatus;
  title: string;
  description: string;
  createdAt: string;
}

export interface IssueTicketApiResponse {
  data: IssueTicketFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export interface IssueTicketListItemFromApi {
  id: string;
  tenantId: string;
  tenantPhone?: string | null;
  houseId: string;
  assetId: string;
  assignedStaffId: string;
  staffName?: string | null;
  staffPhone?: string | null;
  slotId: string;
  type: string;
  status: IssueStatus;
  title: string;
  description: string;
  createdAt: string;
}

export interface IssueTicketListApiResponse {
  data: IssueTicketListItemFromApi[];
  message: string;
  statusCode: number;
  success: boolean;
}

/**
 * Payload phân trang cho GET /issues/tickets/staff (Spring `Page` hoặc tương đương).
 * BE có thể dùng `content` hoặc `items`; `completedElements` là tùy chọn (ô thống kê “đã xong”).
 */
export interface IssueTicketStaffListPagedPayloadFromApi {
  content?: IssueTicketListItemFromApi[];
  items?: IssueTicketListItemFromApi[];
  totalElements?: number;
  total?: number;
  completedElements?: number;
  completedTicketCount?: number;
  doneCount?: number;
}

export interface IssueBannerFromApi {
  id: string;
  name: string;
  currentPrice: number;
}

export interface CreateIssueQuoteItemPayload {
  bannerId?: string;
  itemName?: string;
  cost?: number;
  price?: number;
}

export interface CreateIssueQuotePayload {
  isTenantFault: boolean;
  items: CreateIssueQuoteItemPayload[];
}

export interface CreateIssueQuoteApiResponse {
  data?: {
    id: string;
    issueId: string;
    status: QuoteStatus | string;
    isTenantFault: boolean;
    totalPrice: number;
    createdAt: string;
    items?: Array<{
      id: string;
      itemName: string;
      description?: string | null;
      price: number;
    }>;
  };
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export type QuoteStatus =
  | "DRAFT"
  | "WAITING_MANAGER_APPROVAL"
  | "WAITING_TENANT_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | string;

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  identityNumber: string;
  phoneNumber: string;
  roles: string[];
}

export interface FunctionalAreaPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FunctionalAreaFromApi {
  id: string;
  houseId: string;
  name: string;
  areaType: string;
  floorNo: string;
  description: string | null;
  status?: string;
  position?: FunctionalAreaPosition;
  createdAt?: string;
  updatedAt?: string;
}

export type HouseStatus = "AVAILABLE" | "RENTED" | "REPAIRED" | string;

export interface HouseFromApi {
  id: string;
  userRentalId: string | null;
  regionId?: string | null;
  name: string;
  address: string;
  ward?: string;
  commune?: string;
  city?: string;
  description?: string;
  status?: HouseStatus;
  functionalAreas?: FunctionalAreaFromApi[];
}

export interface HousesApiResponse {
  data: HouseFromApi[];
  message: string;
  statusCode: number;
  success: boolean;
}

export interface HouseRegionFromApi {
  id: string;
  name: string;
  description: string;
  managerId: string;
  staffIds?: string[];
}

export interface HouseDetailApiResponse {
  data: HouseFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export interface AssetCategoryFromApi {
  id: string;
  name: string;
  nameRaw?: string;
  nameTranslations?: Record<string, string>;
  compensationPercent: number;
  description: string;
  descriptionRaw?: string;
  descriptionTranslations?: Record<string, string>;
  detectionType?: string | null;
}

export type AssetCategoryEmbeddedFromApi = AssetCategoryFromApi;

export interface AssetCategoriesApiResponse {
  data: AssetCategoryFromApi[];
}

export type AssetCategoryLocalizedWriteField = Record<string, string>;

export interface CreateAssetCategoryRequest {
  name: AssetCategoryLocalizedWriteField;
  compensationPercent: number;
  description: AssetCategoryLocalizedWriteField;
}

export interface CreateAssetCategoryApiResponse {
  data: AssetCategoryFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export type UpdateAssetCategoryRequest = CreateAssetCategoryRequest;

export interface UpdateAssetCategoryApiResponse {
  data: AssetCategoryFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export type AssetItemsParams = {
  houseId?: string;
  categoryId?: string;
  nfcId?: string;
};

export type AssetStatus =
  | "IN_USE"
  | "ACTIVE"
  | "BROKEN"
  | "DISPOSED"
  | "WAITING_MANAGER_CONFIRM";

export function normalizeAssetItemStatusFromApi(
  status: string | null | undefined
): string {
  const s = status != null ? String(status).trim() : "";
  if (s === "" || s === "AVAILABLE") return "IN_USE";
  if (s === "DELETED") return "DISPOSED";
  return s;
}

export interface AssetItemImageFromApi {
  id: string;
  url: string;
  createdAt?: string | null;
}

export interface AssetItemFromApi {
  id: string;
  houseId: string;
  categoryId: string;
  category?: AssetCategoryEmbeddedFromApi;
  /** Tên hiển thị cho thiết bị theo `Accept-Language` / mặc định (chuỗi thuần; PUT request lại dùng object `displayName`). */
  displayName: string;
  /**
   * Bản dịch tên thiết bị (PUT/GET) — key có thể là `vi`, `ja`, `en`, `additionalprop1`, …
   * Cùng mô hình với `nameTranslations` trên category.
   */
  translations?: Record<string, string>;
  serialNumber: string;
  /**
   * Mã NFC (một số bản BE trả `nfcId` thay vì/ song song `nfcTag` + `tags`).
   * `normalizeAssetItemFromResponse` gộp về `nfcTag` cho UI.
   */
  nfcId?: string | null;
  /** NFC tag ID gắn với thiết bị (từ bảng asset tags), null nếu chưa gán. */
  nfcTag: string | null;
  qrTag: string | null;
  tags?: AssetTagFromApi[];
  conditionPercent: number;
  note?: string | null;
  status: string;
  updateAt?: string | null;
  functionAreaId?: string | null;
  images?: AssetItemImageFromApi[];
}

export interface AssetItemsApiResponse {
  data: AssetItemFromApi[];
}

export interface AssetItemCreateGeneratedLocales {
  nameEn?: string | null;
  nameJa?: string | null;
}

export type AssetItemDisplayNameMap = Record<string, string>;

export interface CreateAssetItemRequest {
  houseId: string;
  categoryId: string;
  displayName: AssetItemDisplayNameMap;
  serialNumber: string;
  nfcTag: string | null;
  qrTag: string | null;
  nfcId?: string | null;
  qrId?: string | null;
  conditionPercent: number;
  status: string;
  functionAreaId?: string | null;
  assetImages: string[];
}

/**
 * Body PUT /api/assets/items/{id} (Swagger) — cùng kiểu `displayName` object (Map locale → chuỗi) với
 * `CreateAssetItemRequest` / POST category; response trả `displayName` chuỗi + `translations` riêng.
 *
 * Không gồm `houseId` / `categoryId` (đổi nhà: `transferAssetItemHouse`; danh mục không đổi qua PUT này).
 * `functionAreaId` gửi kèm theo `buildUpdateAssetItemRequestBody` (chuỗi rỗng khi chưa chọn), trừ khi bỏ hẳn field.
 */
export interface UpdateAssetItemRequest {
  displayName?: AssetItemDisplayNameMap;
  serialNumber: string;
  nfcId?: string | null;
  /** Fallback khi build body (ưu tiên `nfcId`) — gọi API chỉ cần một trong hai. */
  nfcTag?: string | null;
  conditionPercent: number;
  note?: string | null;
  status: string;
  functionAreaId?: string | null;
}

export interface CreateAssetItemApiResponse {
  data: AssetItemFromApi;
  message: string;
  statusCode: number;
  success: boolean;
  mode?: "AUTO" | "MANUAL";
  generated?: AssetItemCreateGeneratedLocales;
}

export interface UpdateAssetItemApiResponse {
  data: AssetItemFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export interface AssetMaintenanceBatchUpdatePayload {
  assetId: string;
  conditionPercent: number;
  note: string;
  status?: string;
  localImages?: Array<{ uri: string; fileName?: string; mimeType?: string }>;
}

export interface AssetMaintenanceBatchUpdateRequest {
  jobId: string;
  updates: AssetMaintenanceBatchUpdatePayload[];
}

export interface AssetMaintenanceBatchEventRef {
  assetId: string;
  eventId: string;
}

export interface AssetMaintenanceBatchUpdateData {
  total: number;
  success: number;
  assets?: AssetItemFromApi[];
  events?: AssetMaintenanceBatchEventRef[];
}

export type AssetMaintenanceBatchUpdateApiResponse = ApiResponse<AssetMaintenanceBatchUpdateData>;

export interface IotNodeDeviceFromApi {
  id: string;
  assetId: string;
  categoryCode: string;
  displayName: string;
  serialNumber: string;
  status: string;
  thing: string;
  areaName: string | null;
}

export interface IotControllerHouseDataFromApi {
  id: string;
  houseName: string;
  deviceId: string;
  thingName: string;
  status: string;
  areaName: string | null;
  createdAt?: string;
  activatedAt?: string;
  devices: IotNodeDeviceFromApi[];
}

export type IotDevicesByHouseApiResponse = ApiResponse<IotControllerHouseDataFromApi>;

export interface IotProvisionRequest {
  deviceId: string;
  areaId: string;
}

export interface IotProvisionResult {
  thingName: string;
  certificatePem: string;
  privateKey: string;
  mqttEndpoint: string;
  houseId: string;
}

export type IotProvisionApiResponse = ApiResponse<IotProvisionResult>;

export interface IotProvisionTokenRequest {
  serial: string;
}

export interface IotProvisionTokenResult {
  token: string;
}

export type IotProvisionTokenApiResponse = ApiResponse<IotProvisionTokenResult>;

export interface IotControllerByHouseResult {
  deviceId: string;
}
export type IotControllerByHouseApiResponse = ApiResponse<IotControllerByHouseResult>;

export interface IotProvisionNodeRequest {
  serial: string;
  token: string;
  areaId: string;
}
export type IotProvisionNodeApiResponse = ApiResponse<string>;

export interface AttachAssetTagRequest {
  assetId: string;
  tagValue: string;
  tagType: "NFC" | "QR_CODE";
}

export interface AssetTagFromApi {
  id: string;
  tagValue: string;
  tagType: string;
  assetId: string;
  houseId: string;
  activatedAt: string;
  isActive: boolean;
}

export interface AttachAssetTagApiResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: AssetTagFromApi;
}

export type DetachAssetTagApiResponse = AttachAssetTagApiResponse;

export interface GetAssetByTagValueApiResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: AssetItemFromApi[] | AssetItemFromApi;
}

export interface ScheduleTemplateData {
  id: string;
  workingDays: string;
  openTime: string;
  breakStart: string;
  breakEnd: string;
  closeTime: string;
  slotMinutes: number;
  bufferMinutes: number;
  effectiveFrom: string;
  updatedAt: string;
}

export interface ScheduleTemplateApiResponse {
  data: ScheduleTemplateData;
  message: string;
  statusCode: number;
  success: boolean;
}

export interface WorkSlotFromApi {
  id: string;
  staffId: string;
  jobId: string;
  houseId?: string;
  jobType: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface WorkSlotsApiResponse {
  data: WorkSlotFromApi[];
  message: string;
  statusCode: number;
  success: boolean;
}

export interface ConfirmStaffWorkSlotPayload {
  jobId: string;
  startTime: string;
}

export interface ConfirmStaffWorkSlotResponse {
  data: WorkSlotFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export type GeneratedWorkSlotStatus = "AVAILABLE" | string;

export interface GeneratedWorkSlotTimeFromApi {
  startTime: string;
  endTime: string;
  status: GeneratedWorkSlotStatus;
  availableStaffCount?: number;
}

export interface GeneratedWorkSlotsDayFromApi {
  date: string;
  slots: GeneratedWorkSlotTimeFromApi[];
}

export interface GenerateWorkSlotsApiResponse {
  data: GeneratedWorkSlotsDayFromApi[];
  message: string;
  statusCode: number;
  success: boolean;
}

export interface LeaveRequestFromApi {
  id: string;
  staffId: string;
  leaveDate: string;
  note?: string | null;
  status: string;
  managerId?: string | null;
  decisionNote?: string | null;
  createdAt?: string;
}

export interface LeaveRequestsApiResponse {
  data: LeaveRequestFromApi[];
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export interface CreateLeaveRequestPayload {
  staffId: string;
  leaveDate: string;
  note?: string;
}

export interface CreateLeaveRequestResponse {
  data: LeaveRequestFromApi;
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export interface UpdateLeaveRequestPayload {
  status: "CANCELLED";
  decisionNote?: string;
}

export interface UpdateLeaveRequestResponse {
  data: LeaveRequestFromApi;
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export interface JobFromApi {
  id: string;
  planId: string;
  houseId: string;
  periodStartDate: string;
  dueDate: string;
  status: string;
}

export interface JobApiResponse {
  data: JobFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

// =========================================================
// Inspection API (GET /api/maintenances/inspections/{id})
// =========================================================

/** Chi tiết kiểm định (bàn giao); jobId trên lịch = id kiểm định. */
export interface InspectionFromApi {
  id: string;
  houseId: string;
  assignedStaffId: string;
  slotId: string;
  status: string;
  type?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  contractId?: string | null;
  housePhotoUrls?: string[] | null;
}

export interface AssetEventFromApi {
  assetId: string;
  assetName?: string | null;
  conditionPercent?: number | null;
  note?: string | null;
  eventType?: string | null;
}

export interface AssetEventsApiResponse {
  data: AssetEventFromApi[];
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export interface InspectionListApiResponse {
  data: InspectionFromApi[];
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export interface InspectionApiResponse {
  data: InspectionFromApi;
  message: string;
  statusCode: number;
  success: boolean;
}

export function mapInspectionToJobFromApi(i: InspectionFromApi): JobFromApi {
  const created = String(i.createdAt ?? "").trim();
  const periodStartDate = created.length >= 10 ? created.slice(0, 10) : "";
  return {
    id: i.id,
    planId: String(i.slotId ?? "").trim() || i.id,
    houseId: i.houseId,
    periodStartDate,
    dueDate: String(i.updatedAt ?? i.createdAt ?? "").trim(),
    status: i.status,
  };
}

export type AppNotificationCategory =
  | "ISSUE"
  | "BILLING"
  | "CONTRACT"
  | "SCHEDULE"
  | "WORK_SLOT"
  | "JOB"
  | "INSPECTION"
  | "LEAVE"
  | "SYSTEM"
  | "MAINTENANCE"
  | "ACCESS"
  | string;

export interface AppNotificationFromApi {
  id: string;
  eventId: string;
  dedupeKey?: string | null;
  type: string;
  category: AppNotificationCategory;
  entityType?: string | null;
  entityId?: string | null;
  houseId?: string | null;
  actorRole?: string | null;
  actorId?: string | null;
  titleKey?: string | null;
  titleI18n?: { vi?: string; en?: string; ja?: string } | null;
  bodyParams?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  timestamp?: string | null;
  createdAt?: string | null;
  urgent?: boolean;
  actionType?: string | null;
  deepLink?: string | null;
  read: boolean;
  readAt?: string | null;
}

export interface AppNotificationsListResult {
  items: AppNotificationFromApi[];
  nextCursor: string | null;
  fetchUnavailable?: boolean;
}

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
