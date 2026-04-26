/**
 * Màn hình Chi tiết Work Slot của Staff.
 * Hiển thị đầy đủ thông tin work slot và ticket/issue (lấy từ API GET /api/issues/tickets/{ticketId}).
 * ticketId lấy từ work slot API: GET /api/schedules/work_slots/staff/{staffId}.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Image,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import {
  confirmIssueTicketCashPayment,
  getIssueTicketById,
  getIssueTicketImages,
  postIssueTicketRepairComplete,
  type IssueTicketImageFromApi,
  updateIssueTicketStatus,
} from "../../../../shared/services/issuesApi";
import {
  getAssetEventsByJobId,
  getInspectionById,
  getJobById,
  listInspections,
  updateInspectionStatus,
  updateJobStatus,
} from "../../../../shared/services/maintenanceApi";
import { CustomAlert } from "../../../../shared/components/alert";
import {
  PullToRefreshControl,
  RefreshLogoInline,
  RefreshLogoOverlay,
} from "@shared/components/RefreshLogoOverlay";
import {
  mapInspectionToJobFromApi,
  normalizeAssetItemStatusFromApi,
  type AssetItemFromApi,
  type FunctionalAreaFromApi,
  type IssueTicketFromApi,
  type JobFromApi,
} from "../../../../shared/types/api";
import {
  logInspectionDebug,
  popInspectionFlowDebugSession,
  pushInspectionFlowDebugSession,
} from "../../../../shared/utils/inspectionDebugLog";
import Icons from "../../../../shared/theme/icon";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import { staffWorkSlotStyles } from "./staffWorkSlotStyles";
import { brandTintBg, neutral } from "../../../../shared/theme/color";
import {
  formatDdMmYyyy,
  formatDdMmYyyyHms24,
  formatYmdStringToDdMmYyyy,
} from "../../../../shared/utils";
import { SCHEDULE_DATA_KEYS } from "../../hooks/useStaffScheduleData";
import {
  isoLocalDateToYmd,
  waitForWorkSlotCompletionSync,
} from "../../utils/workSlotCompletionSync";
import { WorkSlotImageGalleryModal } from "./WorkSlotImageGalleryModal";
import { WorkSlotDetailInfoRow } from "./WorkSlotDetailInfoRow";
import { WorkSlotDetailWorkSlotSection } from "./WorkSlotDetailWorkSlotSection";
import { WorkSlotInspectionCheckInModalFlow } from "./WorkSlotInspectionCheckInModalFlow";
import { WorkSlotInspectionCheckOutModalFlow } from "./WorkSlotInspectionCheckOutModalFlow";
import { WorkSlotMaintenanceModalFlow } from "./WorkSlotMaintenanceModalFlow";
import { submittedIssueRepairTicketIdsInSession } from "./issueRepairSession";
import { IssueRepairPaymentTypeModal } from "./paymentTypeSelect";
import { MAX_MAINTENANCE_ASSET_IMAGES, type MaintenanceDraft } from "./staffWorkSlotModalTypes";
import { useFunctionalAreasByHouseId, useHouseById } from "../../../../shared/hooks/useHouses";
import { useAssetItemById } from "../../../../shared/hooks/useAssetItems";
import {
  getAssetItemsByHouseId,
  getAssetItemById,
  getAssetItemImages,
  invalidateAssetItemImagesCache,
  deleteAssetItemImage,
  uploadAssetEventImages,
  type AssetItemImageFromApi,
  type AssetItemImageToUpload,
  updateAssetItemsMaintenanceBatch,
} from "../../../../shared/services/assetItemApi";
import type { DropdownBoxSection } from "../../../../shared/components/dropdownBox";
import {
  StackScreenTitleBadge,
  StackScreenTitleBarBalance,
  StackScreenTitleHeaderStrip,
  stackScreenTitleBackBtnOnBrand,
  stackScreenTitleCenterSlotStyle,
  stackScreenTitleOnBrandIconColor,
  stackScreenTitleRowStyle,
  stackScreenTitleSideSlotStyle,
} from "../../../../shared/components/StackScreenTitleBadge";

/** Chuẩn hóa status từ BE (trim, uppercase, khoảng trắng → _). */
function normalizeScheduleStatusKey(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Work slot / job status từ API schedules (ISSUE, MAINTENANCE, INSPECTION). */
const JOB_STATUS_KEYS = new Set([
  "PENDING",
  "WAITING_MANAGER_CONFIRM",
  "WAITING_STAFF_COMPLETION",
  "BOOKED",
  "BLOCKED",
  "NEED_RESCHEDULE",
  "CANCELLED",
  "DONE",
  "CREATED",
  "CONFIRMED",
  "SCHEDULED",
  "IN_PROGRESS",
  "APPROVED",
  "COMPLETED",
  "FAILED",
  "OVERDUE",
  "AVAILABLE",
]);

function getJobStatusLabel(status: string | undefined, t: (k: string) => string): string {
  if (!status) return t("staff_calendar.job_status_OTHER");
  const normalized = normalizeScheduleStatusKey(status);
  const key = `staff_calendar.job_status_${normalized}`;
  return JOB_STATUS_KEYS.has(normalized) ? t(key) : t("staff_calendar.job_status_OTHER");
}

/** Trạng thái ticket issue (staff_ticket_list); không khớp thì fallback cùng bộ nhãn work slot. */
function getIssueStatusLabel(status: string | undefined, t: (k: string) => string): string {
  if (!status) return "";
  const normalized = normalizeScheduleStatusKey(status);
  const i18nKey = `staff_ticket_list.status_${normalized}`;
  const translated = t(i18nKey);
  if (translated !== i18nKey) return translated;
  return getJobStatusLabel(status, t);
}

/** Nhãn hiển thị cho `InspectionFromApi.type` (CHECK_IN / CHECK_OUT). */
function getInspectionTypeDisplay(type: string | null | undefined, t: (k: string) => string): string {
  const key = normalizeScheduleStatusKey(type ?? undefined);
  if (key === "CHECK_IN") return t("staff_work_slot_detail.inspection_type_CHECK_IN");
  if (key === "CHECK_OUT") return t("staff_work_slot_detail.inspection_type_CHECK_OUT");
  const raw = String(type ?? "").trim();
  return raw || "—";
}

function normalizeFloorForSort(v: string | null | undefined): string {
  return String(v ?? "").trim();
}

function normalizeId(v: string | null | undefined): string {
  return String(v ?? "").trim();
}

function compareFloor(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

type WorkSlotDetailRouteProp = RouteProp<RootStackParamList, "WorkSlotDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "WorkSlotDetail">;

/**
 * Ghi nhớ theo phiên app các job maintenance đã submit batch update.
 * Mục tiêu: khi user rời màn rồi quay lại trước khi bấm "Hoàn thành",
 * nút vẫn hiển thị đúng trạng thái tiếp theo.
 */
const submittedMaintenanceJobIdsInSession = new Set<string>();

export default function WorkSlotDetailScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const route = useRoute<WorkSlotDetailRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { slot } = route.params;
  const isIssueSlot = String(slot.task || "").toUpperCase() === "ISSUE";
  const isInspectionSlot = String(slot.task || "").toUpperCase() === "INSPECTION";

  const [job, setJob] = useState<JobFromApi | null>(null);
  const [inspectionNote, setInspectionNote] = useState<string | null>(null);
  const [inspectionType, setInspectionType] = useState<string | null>(null);
  const [ticket, setTicket] = useState<IssueTicketFromApi | null>(null);
  const [loading, setLoading] = useState(!!slot.ticketId);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [ticketImages, setTicketImages] = useState<IssueTicketImageFromApi[]>([]);
  const [ticketImagesLoading, setTicketImagesLoading] = useState(false);
  const [maintenanceImageGallery, setMaintenanceImageGallery] = useState<{
    uris: string[];
    initialIndex: number;
  } | null>(null);
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
  const [maintenanceEditorVisible, setMaintenanceEditorVisible] = useState(false);
  const [selectedMaintenanceAssetId, setSelectedMaintenanceAssetId] = useState<string | null>(null);
  const [maintenanceSortFloor, setMaintenanceSortFloor] = useState<string | null>(null);
  const [maintenanceDrafts, setMaintenanceDrafts] = useState<Record<string, MaintenanceDraft>>({});
  const maintenanceDraftsRef = useRef(maintenanceDrafts);
  maintenanceDraftsRef.current = maintenanceDrafts;
  const [maintenanceSubmitted, setMaintenanceSubmitted] = useState(false);
  /** Issue IN_PROGRESS: đã gửi xong màn ghi nhận sửa chữa → chỉ hiện nút Hoàn thành. */
  const [issueRepairSubmitted, setIssueRepairSubmitted] = useState(false);
  /** Sau POST repair-complete hoặc khi ticket đã WAITING_STAFF_COMPLETION — chọn Cash / VNPay. */
  const [issuePaymentModalVisible, setIssuePaymentModalVisible] = useState(false);
  const [issuePaymentChoiceLoading, setIssuePaymentChoiceLoading] = useState(false);
  const [issueCashConfirmLoading, setIssueCashConfirmLoading] = useState(false);
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
  const [maintenanceEditorLoading, setMaintenanceEditorLoading] = useState(false);
  const [maintenanceAssets, setMaintenanceAssets] = useState<AssetItemFromApi[]>([]);
  const [maintenanceAssetsLoading, setMaintenanceAssetsLoading] = useState(false);
  const [editorConditionPercent, setEditorConditionPercent] = useState("");
  const [editorNote, setEditorNote] = useState("");
  const [editorUpdateAt, setEditorUpdateAt] = useState("");
  const [editorImageUrls, setEditorImageUrls] = useState<string[]>([]);
  const [editorServerImages, setEditorServerImages] = useState<AssetItemImageFromApi[]>([]);
  /** Ảnh từ BE lúc mở editor — chỉ trong phiên ca: UI ẩn, không hiển thị trong modal (chỉ ảnh chụp mới phiên). */
  const baselineEditorImageIdsRef = useRef<Set<string>>(new Set());
  const [editorImagesVersion, setEditorImagesVersion] = useState(0);
  /** Không POST ảnh phiên lên asset item (tránh BE ghi đè/xóa ảnh cũ trên web); chỉ gửi qua event sau batch. */
  const editorImageUploading = false;
  const [editorDeletingImageId, setEditorDeletingImageId] = useState<string | null>(null);
  const [imageCaptureVisible, setImageCaptureVisible] = useState(false);
  const [inspectionContractId, setInspectionContractId] = useState<string | null>(null);
  const [checkInBaselineByAssetId, setCheckInBaselineByAssetId] = useState<
    Record<string, { conditionPercent?: number | null; note?: string | null }>
  >({});
  const [inspectionSessionPhotoUrls, setInspectionSessionPhotoUrls] = useState<string[]>([]);
  /** Ảnh vừa chụp/chọn — hiển thị tạm; gửi BE qua POST `events/:eventId/images` sau batch (không POST lên asset item). */
  const [editorPendingLocalUris, setEditorPendingLocalUris] = useState<string[]>([]);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [editorMarkBroken, setEditorMarkBroken] = useState(false);
  /** Số ảnh đã thêm (upload) trong lần mở modal này — giới hạn MAX, không trừ ảnh cũ trên asset. */
  const [maintenanceEditorSessionImageCount, setMaintenanceEditorSessionImageCount] = useState(0);

  const editorServerImagesRef = useRef(editorServerImages);
  editorServerImagesRef.current = editorServerImages;
  const selectedMaintenanceAssetIdRef = useRef(selectedMaintenanceAssetId);
  selectedMaintenanceAssetIdRef.current = selectedMaintenanceAssetId;
  const editorDeletingImageIdRef = useRef(editorDeletingImageId);
  editorDeletingImageIdRef.current = editorDeletingImageId;
  /** Hàng đợi upload lên server (tuần tự để merge/ref không lệch); không chặn lần chụp/chọn tiếp theo. */
  const maintenanceImageUploadQueueRef = useRef(Promise.resolve());
  const maintenanceSessionImageCountRef = useRef(0);
  /**
   * User xóa thumbnail local tạm trước khi tới lượt upload — URI gắn vào đây để `uploadEditorImages` bỏ qua
   * (không POST file đã bỏ, trả slot chụp lại).
   */
  const uploadCancelledLocalUrisRef = useRef<Set<string>>(new Set());
  /**
   * File local (chưa POST lên asset item) gom theo asset — sau batch nhận `eventId` thì POST
   * `POST /assets/events/:eventId/images`. Không upload item ảnh để web vẫn giữ ảnh cũ để so sánh.
   */
  const maintenanceEventImagesByAssetRef = useRef<Record<string, AssetItemImageToUpload[]>>({});
  /** Cặp assetId/eventId từ response batch (N asset cập nhật → thường N phần tử) — POST ảnh khi Hoàn thành / Xác nhận kiểm định. */
  const pendingMaintenanceBatchEventsRef = useRef<Array<{ assetId: string; eventId: string }>>([]);

  /**
   * Với từng phần tử trong `data.events` (đã chuẩn hóa ở API): một `eventId` ứng một `assetId`.
   * Ảnh local đã gắn theo `assetId` (ref map) — POST lên `POST /assets/events/:eventId/images` tương ứng, tuần tự từng cặp.
   * Trả về true nếu có lần POST lỗi (cặp lỗi còn trong ref để retry lần sau nếu có).
   */
  const uploadPendingMaintenanceEventImages = useCallback(async (): Promise<boolean> => {
    const events = pendingMaintenanceBatchEventsRef.current;
    if (!events.length) return false;
    const byAsset = maintenanceEventImagesByAssetRef.current;
    let failed = false;
    const remaining: Array<{ assetId: string; eventId: string }> = [];
    for (const ev of events) {
      const assetKey = normalizeId(ev.assetId);
      const eventId = normalizeId(ev.eventId);
      if (!assetKey || !eventId) continue;
      const rows = byAsset[assetKey];
      if (!rows?.length) continue;
      const files: AssetItemImageToUpload[] = rows.map((r) => ({
        uri: r.uri,
        fileName: r.fileName,
        mimeType: r.mimeType,
      }));
      try {
        await uploadAssetEventImages(eventId, files);
        delete byAsset[assetKey];
        const uploadedUris = new Set(files.map((f) => String(f.uri ?? "").trim()).filter(Boolean));
        if (uploadedUris.size > 0) {
          setEditorPendingLocalUris((prev) => prev.filter((u) => !uploadedUris.has(u)));
        }
      } catch {
        failed = true;
        remaining.push({ assetId: assetKey, eventId });
      }
    }
    pendingMaintenanceBatchEventsRef.current = remaining;
    return failed;
  }, []);

  const currentHouseId = isIssueSlot ? ticket?.houseId : job?.houseId;
  const houseByIdQuery = useHouseById(currentHouseId);
  const currentHouseName = useMemo(() => {
    if (!currentHouseId?.trim()) return "";
    const name =
      houseByIdQuery.data?.success !== false && houseByIdQuery.data?.data?.name?.trim()
        ? houseByIdQuery.data.data.name.trim()
        : "";
    if (name) return name;
    if (houseByIdQuery.isPending) return "";
    return "—";
  }, [currentHouseId, houseByIdQuery.data, houseByIdQuery.isPending]);
  const houseNameRowLoading = Boolean(currentHouseId?.trim()) && houseByIdQuery.isPending;

  const issueAssetQuery = useAssetItemById(isIssueSlot ? ticket?.assetId : undefined);
  const assetIssueNameLoading =
    Boolean(isIssueSlot && ticket?.assetId?.trim()) && issueAssetQuery.isPending;
  const assetIssueDisplayName = useMemo(() => {
    if (!isIssueSlot || !ticket?.assetId?.trim()) return "";
    const n = issueAssetQuery.data?.displayName?.trim();
    if (n) return n;
    if (issueAssetQuery.isPending) return "";
    return "—";
  }, [isIssueSlot, issueAssetQuery.data, issueAssetQuery.isPending, ticket?.assetId]);

  const editorSessionImagesOnly = useMemo(
    () => editorServerImages.filter((img) => !baselineEditorImageIdsRef.current.has(img.id)),
    [editorServerImages, editorImagesVersion]
  );
  const { data: maintenanceAreasResp } = useFunctionalAreasByHouseId(currentHouseId ?? "");
  const maintenanceAreas = (maintenanceAreasResp?.data ?? []) as FunctionalAreaFromApi[];

  /**
   * Tải lại job/ticket/inspection từ API — dùng khi focus màn và khi kéo làm mới.
   */
  const refetchItem = useCallback(async () => {
    if (!slot.ticketId?.trim()) return;
    if (isIssueSlot) {
      setInspectionNote(null);
      setInspectionType(null);
      try {
        const res = await getIssueTicketById(slot.ticketId);
        if (!res?.success || !res?.data) return;
        setTicket(res.data);
        setJob(null);
        const st = String(res.data.status ?? "").toUpperCase();
        setIssueRepairSubmitted(
          (st === "IN_PROGRESS" || st === "WAITING_STAFF_COMPLETION") &&
            submittedIssueRepairTicketIdsInSession.has(res.data.id)
        );
      } catch {
        /* ignore */
      }
      return;
    }

    if (isInspectionSlot) {
      try {
        const res = await getInspectionById(slot.ticketId);
        if (!res?.success || !res?.data) return;
        setJob(mapInspectionToJobFromApi(res.data));
        setTicket(null);
        const n = res.data.note?.trim();
        setInspectionNote(n ? n : null);
        const tp = res.data.type?.trim();
        setInspectionType(tp ? tp : null);
        const cid = res.data.contractId?.trim();
        setInspectionContractId(cid && cid.length > 0 ? cid : null);
      } catch {
        /* ignore */
      }
      return;
    }

    setInspectionNote(null);
    setInspectionType(null);
    try {
      const res = await getJobById(slot.ticketId);
      if (!res?.success || !res?.data) return;
      setJob(res.data);
      setTicket(null);
    } catch {
      /* ignore */
    }
  }, [isInspectionSlot, isIssueSlot, slot.ticketId]);

  const onDetailRefresh = useCallback(() => {
    setDetailRefreshing(true);
    void refetchItem()
      .catch(() => {})
      .finally(() => setDetailRefreshing(false));
  }, [refetchItem]);

  /** CHECK_OUT: baseline CHECK_IN theo contractId + assets/events. */
  useEffect(() => {
    if (!isInspectionSlot || !job?.id) return;
    const typ = (inspectionType ?? "").trim().toUpperCase();
    if (typ !== "CHECK_OUT") {
      setCheckInBaselineByAssetId({});
      return;
    }
    const cid = inspectionContractId?.trim();
    if (!cid) {
      logInspectionDebug("[Inspection]", "CHECK_OUT missing contractId on inspection payload");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const listRes = await listInspections({ contractId: cid, type: "CHECK_IN" });
        const rows = Array.isArray(listRes?.data) ? listRes.data : [];
        const checkIn = rows[0];
        if (!checkIn?.id) {
          logInspectionDebug("[Inspection]", "no CHECK_IN inspection for contract", { contractId: cid });
          if (!cancelled) setCheckInBaselineByAssetId({});
          return;
        }
        const evRes = await getAssetEventsByJobId(checkIn.id);
        const events = Array.isArray(evRes?.data) ? evRes.data : [];
        const map: Record<string, { conditionPercent?: number | null; note?: string | null }> = {};
        for (const e of events) {
          if (e.assetId) {
            map[e.assetId] = { conditionPercent: e.conditionPercent, note: e.note };
          }
        }
        if (!cancelled) setCheckInBaselineByAssetId(map);
      } catch {
        if (!cancelled) setCheckInBaselineByAssetId({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isInspectionSlot, job?.id, inspectionContractId, inspectionType]);

  const navigateCalendarAfterCompletion = useCallback(
    (startTimeIso: string | null) => {
      let ymd: string | null = startTimeIso ? isoLocalDateToYmd(startTimeIso) : null;
      if (!ymd) {
        const parts = slot.date.split("/");
        if (parts.length === 2) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const now = new Date();
          if (Number.isFinite(day) && Number.isFinite(month)) {
            ymd = `${now.getFullYear()}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          }
        }
      }
      (navigation as { navigate: (name: "Main", p: object) => void }).navigate("Main", {
        screen: "Calendar",
        params: ymd ? { focusDateYmd: ymd, focusWorkSlotId: slot.id } : { focusWorkSlotId: slot.id },
      });
    },
    [navigation, slot.date, slot.id]
  );

  /**
   * Staff bấm «Xác nhận hoàn thành» (IN_PROGRESS + đã ghi nhận sửa chữa) hoặc «Chọn phương thức thanh toán» (WAITING_STAFF_COMPLETION).
   * - IN_PROGRESS: POST repair-complete → ticket thường chuyển WAITING_STAFF_COMPLETION → mở modal chọn Cash/VNPay.
   * - WAITING_STAFF_COMPLETION: chỉ mở modal (đã gọi repair-complete trước đó).
   */
  const handleIssuePaymentEntryPress = async () => {
    if (!ticket?.id || !slot.ticketId) return;
    const st = normalizeScheduleStatusKey(ticket.status);
    if (st === "WAITING_STAFF_COMPLETION") {
      setIssuePaymentModalVisible(true);
      return;
    }
    if (st !== "IN_PROGRESS" || !issueRepairSubmitted) return;

    setUpdateLoading(true);
    try {
      const repairRes = await postIssueTicketRepairComplete(ticket.id);
      if (repairRes && repairRes.success === false) {
        throw new Error(repairRes.message || t("staff_work_slot_detail.update_error"));
      }
      const fresh = await getIssueTicketById(ticket.id);
      if (fresh?.success && fresh.data) {
        setTicket(fresh.data);
        const nst = String(fresh.data.status ?? "").toUpperCase();
        setIssueRepairSubmitted(
          (nst === "IN_PROGRESS" || nst === "WAITING_STAFF_COMPLETION") &&
            submittedIssueRepairTicketIdsInSession.has(fresh.data.id)
        );
      }
      setIssuePaymentModalVisible(true);
    } catch (err) {
      CustomAlert.alert(
        t("staff_work_slot_detail.update_error"),
        err instanceof Error ? err.message : "",
        [{ text: t("common.close") }]
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  /**
   * Modal: tiền mặt — chỉ PUT WAITING_CASH_PAYMENT; staff xác nhận đã nhận tiền trên màn chi tiết (POST confirm).
   */
  const handleIssuePaymentCash = async () => {
    if (!ticket?.id || !slot.ticketId) return;
    setIssuePaymentChoiceLoading(true);
    try {
      await updateIssueTicketStatus(ticket.id, "WAITING_CASH_PAYMENT");
      setIssuePaymentModalVisible(false);
      const fresh = await getIssueTicketById(ticket.id);
      if (fresh?.success && fresh.data) {
        setTicket(fresh.data);
        const nst = String(fresh.data.status ?? "").toUpperCase();
        setIssueRepairSubmitted(
          (nst === "IN_PROGRESS" || nst === "WAITING_STAFF_COMPLETION") &&
            submittedIssueRepairTicketIdsInSession.has(fresh.data.id)
        );
      } else {
        void refetchItem();
      }
      CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
    } catch (err) {
      CustomAlert.alert(
        t("staff_work_slot_detail.update_error"),
        err instanceof Error ? err.message : "",
        [{ text: t("common.close") }]
      );
    } finally {
      setIssuePaymentChoiceLoading(false);
    }
  };

  /** Màn chi tiết: sau WAITING_CASH_PAYMENT — POST cash-payment/confirm (ticket DONE). */
  const handleIssueConfirmCashReceived = async () => {
    if (!ticket?.id || !slot.ticketId) return;
    setIssueCashConfirmLoading(true);
    try {
      const res = await confirmIssueTicketCashPayment(ticket.id);
      if (res && res.success === false) {
        throw new Error(res.message || t("staff_work_slot_detail.update_error"));
      }
      const ticketIdForSync = ticket.id;
      CustomAlert.alert(t("common.success"), t("staff_work_slot_detail.cash_confirm_success_message"), [
        {
          text: t("common.close"),
          onPress: () => {
            navigateCalendarAfterCompletion(null);
            void waitForWorkSlotCompletionSync({
              scheduleSlotId: slot.id,
              jobId: ticketIdForSync,
              kind: "issue",
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
              void refetchItem();
            });
          },
        },
      ]);
    } catch (err) {
      CustomAlert.alert(
        t("staff_work_slot_detail.update_error"),
        err instanceof Error ? err.message : "",
        [{ text: t("common.close") }]
      );
    } finally {
      setIssueCashConfirmLoading(false);
    }
  };

  /**
   * Modal: VNPay — PUT WAITING_PAYMENT; tenant app thanh toán theo luồng hiện có.
   */
  const handleIssuePaymentVnpay = async () => {
    if (!ticket?.id || !slot.ticketId) return;
    setIssuePaymentChoiceLoading(true);
    try {
      await updateIssueTicketStatus(ticket.id, "WAITING_PAYMENT");
      setIssuePaymentModalVisible(false);
      navigateCalendarAfterCompletion(null);
      void waitForWorkSlotCompletionSync({
        scheduleSlotId: slot.id,
        jobId: ticket.id,
        kind: "issue",
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
        void refetchItem();
      });
    } catch (err) {
      CustomAlert.alert(
        t("staff_work_slot_detail.update_error"),
        err instanceof Error ? err.message : "",
        [{ text: t("common.close") }]
      );
    } finally {
      setIssuePaymentChoiceLoading(false);
    }
  };

  const handleStartWork = async () => {
    if (!slot.ticketId) return;
    if (isIssueSlot) {
      if (!ticket?.id) return;
      const current = (ticket.status ?? "").toUpperCase();
      const newStatus = "IN_PROGRESS";
      if (current !== "SCHEDULED") {
        CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
        return;
      }
      setUpdateLoading(true);
      try {
        await updateIssueTicketStatus(ticket.id, newStatus);
        CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
        void refetchItem();
      } catch (err) {
        CustomAlert.alert(t("staff_work_slot_detail.update_error"), err instanceof Error ? err.message : "", [{ text: t("common.close") }]);
      } finally {
        setUpdateLoading(false);
      }
      return;
    }

    if (!job?.id) return;
    const current = (job.status ?? "").toUpperCase();

    let maintenanceNext: "IN_PROGRESS" | "COMPLETED" | null = null;
    /** Kiểm định: chỉ SCHEDULED → IN_PROGRESS; DONE qua màn InspectionConfirm. */
    let inspectionNext: "IN_PROGRESS" | null = null;
    if (current === "SCHEDULED") {
      maintenanceNext = "IN_PROGRESS";
      inspectionNext = "IN_PROGRESS";
    } else if (current === "IN_PROGRESS") {
      if (isInspectionSlot) {
        maintenanceNext = null;
        inspectionNext = null;
      } else {
        maintenanceNext = "COMPLETED";
      }
    }

    if (isInspectionSlot) {
      if (!inspectionNext) {
        CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
        return;
      }
    } else {
      if (!maintenanceNext) {
        CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
        return;
      }
    }

    setUpdateLoading(true);
    try {
      let maintenanceEventUploadFailed = false;
      if (!isInspectionSlot && maintenanceNext === "COMPLETED") {
        maintenanceEventUploadFailed = await uploadPendingMaintenanceEventImages();
      }
      if (isInspectionSlot) {
        const res = await updateInspectionStatus(job.id, inspectionNext!);
        if (!res?.success) {
          throw new Error(res?.message || t("staff_work_slot_detail.update_error"));
        }
      } else {
        await updateJobStatus(job.id, maintenanceNext!);
      }
      const startedNow = isInspectionSlot ? inspectionNext === "IN_PROGRESS" : maintenanceNext === "IN_PROGRESS";
      const finishedNow = !isInspectionSlot && maintenanceNext === "COMPLETED";
      if (startedNow) {
        setMaintenanceSubmitted(false);
        setMaintenanceDrafts({});
        maintenanceEventImagesByAssetRef.current = {};
        pendingMaintenanceBatchEventsRef.current = [];
        submittedMaintenanceJobIdsInSession.delete(job.id);
        setInspectionSessionPhotoUrls([]);
        setEditorPendingLocalUris([]);
        uploadCancelledLocalUrisRef.current.clear();
        maintenanceSessionImageCountRef.current = 0;
        setMaintenanceEditorSessionImageCount(0);
      } else if (finishedNow) {
        setMaintenanceSubmitted(false);
        submittedMaintenanceJobIdsInSession.delete(job.id);
      }

      if (finishedNow) {
        navigateCalendarAfterCompletion(null);
        if (maintenanceEventUploadFailed) {
          CustomAlert.alert(
            t("common.success"),
            t("staff_work_slot_detail.maintenance_event_images_partial"),
            [{ text: t("common.close") }]
          );
        }
        void waitForWorkSlotCompletionSync({
          scheduleSlotId: slot.id,
          jobId: job.id,
          kind: isInspectionSlot ? "inspection" : "maintenance",
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
          void refetchItem();
        });
      } else {
        CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
        void refetchItem();
      }
    } catch (err) {
      CustomAlert.alert(t("staff_work_slot_detail.update_error"), err instanceof Error ? err.message : "", [{ text: t("common.close") }]);
    } finally {
      setUpdateLoading(false);
    }
  };

  const navigateToInspectionConfirm = useCallback(async () => {
    if (!job?.id) return;
    setUpdateLoading(true);
    try {
      const uploadFailed = await uploadPendingMaintenanceEventImages();
      const typ = (inspectionType ?? "").trim().toUpperCase();
      const inspectionTypeParam: "CHECK_IN" | "CHECK_OUT" = typ === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN";
      const params = {
        inspectionId: job.id,
        inspectionType: inspectionTypeParam,
        photoUrls: inspectionSessionPhotoUrls,
        scheduleSlotId: slot.id,
        slotDate: slot.date,
        houseName:
          !houseNameRowLoading && currentHouseName && currentHouseName !== "—"
            ? currentHouseName
            : undefined,
      };
      if (uploadFailed) {
        CustomAlert.alert(
          t("common.success"),
          t("staff_work_slot_detail.maintenance_event_images_partial"),
          [{ text: t("common.close"), onPress: () => navigation.navigate("InspectionConfirm", params) }]
        );
      } else {
        navigation.navigate("InspectionConfirm", params);
      }
    } finally {
      setUpdateLoading(false);
    }
  }, [
    currentHouseName,
    houseNameRowLoading,
    inspectionSessionPhotoUrls,
    inspectionType,
    job?.id,
    navigation,
    slot.date,
    slot.id,
    t,
    uploadPendingMaintenanceEventImages,
  ]);

  const openMaintenanceModal = useCallback(() => {
    setMaintenanceSortFloor(null);
    setMaintenanceModalVisible(true);
  }, []);

  /**
   * Mở gallery ảnh toàn màn (vuốt trái/phải) từ thumbnail issue hoặc từ modal chỉnh thiết bị.
   */
  const openMaintenanceImageGallery = useCallback((uris: string[], initialIndex: number) => {
    setMaintenanceImageGallery({ uris, initialIndex });
  }, []);

  const closeMaintenanceModal = useCallback(() => {
    if (maintenanceSubmitting) return;
    setMaintenanceModalVisible(false);
  }, [maintenanceSubmitting]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!maintenanceModalVisible || !currentHouseId) return;
      setMaintenanceAssetsLoading(true);
      try {
        const res = await getAssetItemsByHouseId(currentHouseId);
        if (!cancelled) setMaintenanceAssets(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setMaintenanceAssets([]);
      } finally {
        if (!cancelled) setMaintenanceAssetsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [maintenanceModalVisible, currentHouseId]);

  const handleMaintenanceAssetSelect = useCallback(
    (_sectionId: string, itemId: string | null) => {
      if (!itemId) return;
      setSelectedMaintenanceAssetId(itemId);
      setMaintenanceEditorVisible(true);
    },
    []
  );

  /**
   * Tải lại danh sách ảnh từ BE cho asset đang sửa.
   * Dùng GET /api/assets/items/:id/images (đầy đủ) — trường `images` nhúng trong GET item đôi khi
   * không liệt kê hết ảnh, khiến UI chỉ còn 1 thumbnail dù đã upload nhiều và bộ đếm phiên vẫn tăng.
   * Gán `editorServerImagesRef` đồng bộ với mảng mới — hàng đợi upload chạy ngay sau `await`
   * (trước khi React re-render) nên không được dựa vào `editorServerImages` state/ref theo render.
   */
  const refreshEditorImages = useCallback(async (assetId: string): Promise<AssetItemImageFromApi[]> => {
    const id = String(assetId ?? "").trim();
    if (!id) return [];
    /** POST ảnh gọi invalidate trong API; gọi thêm ở đây trước GET để form luôn gắn với bản mới. */
    invalidateAssetItemImagesCache(id);
    const images = await getAssetItemImages(id, Date.now());
    const urls = images.map((img) => img.url).filter((url) => url.trim().length > 0);
    editorServerImagesRef.current = images;
    setEditorServerImages(images);
    setEditorImageUrls(urls);
    setEditorImagesVersion((v) => v + 1);
    return images;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!maintenanceEditorVisible || !selectedMaintenanceAssetId) return;
      setMaintenanceEditorLoading(true);
      try {
        const asset = await getAssetItemById(selectedMaintenanceAssetId);
        if (cancelled) return;
        const images = await getAssetItemImages(selectedMaintenanceAssetId, Date.now());
        if (cancelled) return;
        baselineEditorImageIdsRef.current = new Set(images.map((i) => i.id));
        editorServerImagesRef.current = images;
        setEditorServerImages(images);
        setEditorImageUrls(images.map((img) => img.url).filter((url) => url.trim().length > 0));
        setEditorImagesVersion((v) => v + 1);
        if (!asset) return;
        const existingDraft = maintenanceDraftsRef.current[selectedMaintenanceAssetId];
        setEditorMarkBroken(existingDraft?.markBroken ?? false);
        setEditorConditionPercent(
          String(existingDraft?.conditionPercent ?? asset.conditionPercent ?? "")
        );
        setEditorNote(existingDraft?.note ?? asset.note ?? "");
        {
          const rawUpdate = existingDraft?.updateAt ?? asset.updateAt;
          if (!rawUpdate) {
            setEditorUpdateAt(t("staff_work_slot_detail.maintenance_update_at_empty"));
          } else {
            const parsed = new Date(rawUpdate);
            setEditorUpdateAt(
              Number.isNaN(parsed.getTime())
                ? t("staff_work_slot_detail.maintenance_update_at_empty")
                : formatDdMmYyyyHms24(parsed)
            );
          }
        }
      } catch {
        if (!cancelled) {
          baselineEditorImageIdsRef.current = new Set();
          setEditorConditionPercent("");
          setEditorNote("");
          setEditorUpdateAt(t("staff_work_slot_detail.maintenance_update_at_empty"));
          editorServerImagesRef.current = [];
          setEditorServerImages([]);
          setEditorImageUrls([]);
        }
      } finally {
        if (!cancelled) setMaintenanceEditorLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [maintenanceEditorVisible, selectedMaintenanceAssetId, t]);

  /** Đóng camera khi đóng modal bảo trì — tránh ImageCaptureModal còn mở phía sau. */
  useEffect(() => {
    if (!maintenanceEditorVisible) {
      setImageCaptureVisible(false);
    }
  }, [maintenanceEditorVisible]);

  /** Mỗi lần mở modal sửa thiết bị / đổi asset: reset bộ đếm ảnh thêm trong phiên (không liên quan ảnh cũ trên server). */
  useEffect(() => {
    if (!maintenanceEditorVisible || !selectedMaintenanceAssetId) return;
    maintenanceSessionImageCountRef.current = 0;
    setMaintenanceEditorSessionImageCount(0);
    setEditorPendingLocalUris([]);
    uploadCancelledLocalUrisRef.current.clear();
  }, [maintenanceEditorVisible, selectedMaintenanceAssetId]);

  const handleSubmitMaintenanceBatch = useCallback(() => {
    if (!job?.id) return;
    const updates = Object.values(maintenanceDrafts);
    if (updates.length === 0) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_work_slot_detail.maintenance_empty_updates"),
        [{ text: t("common.close") }]
      );
      return;
    }
    CustomAlert.alert(
      t("staff_work_slot_detail.maintenance_confirm_title"),
      t("staff_work_slot_detail.maintenance_confirm_message", { count: updates.length }),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async () => {
            setMaintenanceSubmitting(true);
            try {
              const res = await updateAssetItemsMaintenanceBatch({
                jobId: job.id,
                updates: updates.map((it) => ({
                  assetId: it.assetId,
                  conditionPercent: it.conditionPercent,
                  note: it.note,
                  ...(it.markBroken ? { status: "BROKEN" } : {}),
                })),
              });
              if (!res?.success) {
                throw new Error(res?.message || t("staff_work_slot_detail.maintenance_batch_error"));
              }
              /**
               * `data.events`: mỗi asset đã gửi trong batch 1 cặp (assetId, eventId) — đồng bộ với sau khi normalize ở assetItemApi.
               */
              pendingMaintenanceBatchEventsRef.current = (res.data?.events ?? []).map((row) => ({
                assetId: normalizeId(row.assetId),
                eventId: normalizeId(row.eventId),
              })).filter((row) => row.assetId.length > 0 && row.eventId.length > 0);
              // Ghi nhớ trong phiên để quay lại màn vẫn hiện nút "Hoàn thành".
              submittedMaintenanceJobIdsInSession.add(job.id);
              setMaintenanceSubmitted(true);
              setMaintenanceModalVisible(false);
              CustomAlert.alert(
                t("common.success"),
                t("staff_work_slot_detail.maintenance_batch_success"),
                [{ text: t("common.close") }]
              );
            } catch (err) {
              CustomAlert.alert(
                t("common.error"),
                err instanceof Error
                  ? err.message
                  : t("staff_work_slot_detail.maintenance_batch_error"),
                [{ text: t("common.close") }]
              );
            } finally {
              setMaintenanceSubmitting(false);
            }
          },
        },
      ]
    );
  }, [job?.id, maintenanceDrafts, t]);

  useEffect(() => {
    if (!slot.ticketId?.trim()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);

    const run = async () => {
      try {
        if (isIssueSlot) {
          const res = await getIssueTicketById(slot.ticketId!);
          if (cancelled || !res?.success || !res?.data) return;
          const issue = res.data;
          setTicket(issue);
          setJob(null);
          setInspectionNote(null);
          setInspectionType(null);
          const issueSt = String(issue.status ?? "").toUpperCase();
          setIssueRepairSubmitted(
            issueSt === "IN_PROGRESS" && submittedIssueRepairTicketIdsInSession.has(issue.id)
          );
          return;
        }

        if (isInspectionSlot) {
          const res = await getInspectionById(slot.ticketId!);
          if (cancelled || !res?.success || !res?.data) return;
          const nextJob = mapInspectionToJobFromApi(res.data);
          setJob(nextJob);
          setTicket(null);
          const n = res.data.note?.trim();
          setInspectionNote(n ? n : null);
          const tp = res.data.type?.trim();
          setInspectionType(tp ? tp : null);
          const rememberedSubmitted =
            String(nextJob.status ?? "").toUpperCase() === "IN_PROGRESS" &&
            submittedMaintenanceJobIdsInSession.has(nextJob.id);
          setMaintenanceSubmitted(rememberedSubmitted);
          return;
        }

        const res = await getJobById(slot.ticketId!);
        if (cancelled || !res?.success || !res?.data) return;
        const nextJob = res.data;
        setJob(nextJob);
        setTicket(null);
        setInspectionNote(null);
        setInspectionType(null);
        const rememberedSubmitted =
          String(nextJob.status ?? "").toUpperCase() === "IN_PROGRESS" &&
          submittedMaintenanceJobIdsInSession.has(nextJob.id);
        setMaintenanceSubmitted(rememberedSubmitted);
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          const message =
            status === 404
              ? t("staff_work_slot_detail.job_not_found")
              : err instanceof Error
                ? err.message
                : t("staff_work_slot_detail.job_load_error");
          setError(message);
          setTicket(null);
          setJob(null);
          setInspectionNote(null);
          setInspectionType(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isIssueSlot, isInspectionSlot, slot.ticketId, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isIssueSlot || !ticket?.id) {
        setTicketImages([]);
        return;
      }

      setTicketImagesLoading(true);
      try {
        const imgs = await getIssueTicketImages(ticket.id);
        if (!cancelled) setTicketImages(imgs);
      } catch (e) {
        console.error("[WorkSlotDetail] load ticket images failed", e);
        if (!cancelled) setTicketImages([]);
      } finally {
        if (!cancelled) setTicketImagesLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isIssueSlot, ticket?.id]);

  const areaFloorMap = useMemo(() => {
    const map = new Map<string, string>();
    maintenanceAreas.forEach((area) => {
      const floor = normalizeFloorForSort(area.floorNo);
      if (!floor) return;
      const rawId = area.id;
      const normalizedAreaId = normalizeId(area.id);
      if (rawId) map.set(rawId, floor);
      if (normalizedAreaId) map.set(normalizedAreaId, floor);
    });
    return map;
  }, [maintenanceAreas]);

  const hasFloorAreas = maintenanceAreas.length > 0;

  const maintenanceAssetsSorted = useMemo(() => {
    return [...maintenanceAssets]
      .filter(
        (asset) =>
          normalizeAssetItemStatusFromApi(asset.status) !== "WAITING_MANAGER_CONFIRM"
      )
      .map((asset) => ({
        ...asset,
        floorNo:
          areaFloorMap.get(asset.functionAreaId ?? "")
          ?? areaFloorMap.get(normalizeId(asset.functionAreaId))
          ?? null,
      }))
      .sort((a, b) => {
        if (hasFloorAreas) {
          if (a.floorNo && b.floorNo) {
            const byFloor = compareFloor(a.floorNo, b.floorNo);
            if (byFloor !== 0) return byFloor;
          } else if (a.floorNo && !b.floorNo) {
            return -1;
          } else if (!a.floorNo && b.floorNo) {
            return 1;
          }
        }
        return String(a.displayName ?? "").localeCompare(String(b.displayName ?? ""), undefined, {
          sensitivity: "base",
        });
      });
  }, [maintenanceAssets, areaFloorMap, hasFloorAreas]);

  const maintenanceFloorOptions = useMemo(() => {
    if (!hasFloorAreas) return [];
    const set = new Set<string>();
    maintenanceAreas.forEach((area) => {
      const floor = normalizeFloorForSort(area.floorNo);
      if (floor) set.add(floor);
    });
    return Array.from(set).sort(compareFloor);
  }, [hasFloorAreas, maintenanceAreas]);

  const filteredMaintenanceAssets = useMemo(() => {
    if (maintenanceSortFloor == null) return maintenanceAssetsSorted;
    return maintenanceAssetsSorted.filter((asset) => asset.floorNo === maintenanceSortFloor);
  }, [maintenanceAssetsSorted, maintenanceSortFloor]);

  const maintenanceAssetSection = useMemo<DropdownBoxSection | null>(() => {
    if (!maintenanceModalVisible || filteredMaintenanceAssets.length === 0) return null;
    return {
      id: "maintenance_asset",
      title: t("staff_work_slot_detail.maintenance_asset_picker_title"),
      selectedId: null,
      showAllOption: false,
      items: filteredMaintenanceAssets.map((asset) => {
        const floorDetail =
          hasFloorAreas && asset.floorNo
            ? t("staff_work_slot_detail.maintenance_floor_label", { floor: asset.floorNo })
            : "";
        const serialDetail = asset.serialNumber || "-";
        return {
          id: asset.id,
          label: asset.displayName || asset.id,
          detail: floorDetail ? `${floorDetail} · ${serialDetail}` : serialDetail,
          listShowDoneTick:
            Boolean(maintenanceDrafts[asset.id]) ||
            (job?.id != null && submittedMaintenanceJobIdsInSession.has(job.id)),
        };
      }),
    };
  }, [filteredMaintenanceAssets, hasFloorAreas, job?.id, maintenanceDrafts, maintenanceModalVisible, t]);

  const maintenanceAssetSummary = useMemo(
    () =>
      t("staff_work_slot_detail.maintenance_asset_picker_summary", {
        count: filteredMaintenanceAssets.length,
      }),
    [filteredMaintenanceAssets.length, t]
  );

  /** Vùng cuộn trong modal bảo trì (dropdown + draft) — không đẩy nội dung ra ngoài viewport. */
  const maintenanceModalBodyScrollMaxH = useMemo(
    () =>
      Math.max(
        260,
        Math.round(windowHeight * 0.88) - 188 - Math.min(insets.bottom, 32)
      ),
    [windowHeight, insets.bottom]
  );

  /** Giới hạn chiều cao danh sách trong DropdownBox để chip tầng vẫn nhìn thấy khi cuộn modal. */
  const maintenanceDropdownResultsMaxH = useMemo(
    () => Math.min(220, Math.max(168, Math.round(windowHeight * 0.26))),
    [windowHeight]
  );

  const selectedMaintenanceAsset = useMemo(
    () => maintenanceAssetsSorted.find((asset) => asset.id === selectedMaintenanceAssetId) ?? null,
    [maintenanceAssetsSorted, selectedMaintenanceAssetId]
  );

  /**
   * Gom file vừa chụp/chọn vào `maintenanceEventImagesByAssetRef` để sau khi gửi batch (có `eventId`) POST
   * lên `POST /assets/events/:eventId/images` — **không** gọi POST ảnh lên asset item (tránh BE xóa/ghi đè ảnh cũ trên web).
   * Thumbnail: `editorPendingLocalUris` (đã set ở `handleEditorImagesPicked`). Các URI trong
   * `uploadCancelledLocalUrisRef` bỏ qua.
   */
  const uploadEditorImages = useCallback((assetId: string, files: AssetItemImageToUpload[]) => {
    if (!assetId?.trim() || files.length === 0) return;
    const filesActive = files.filter(
      (f) => !uploadCancelledLocalUrisRef.current.has(String(f.uri ?? "").trim())
    );
    if (filesActive.length === 0) return;
    const mapKey = normalizeId(assetId);
    const prev = maintenanceEventImagesByAssetRef.current[mapKey] ?? [];
    const seen = new Set(prev.map((p) => String(p.uri ?? "").trim()).filter(Boolean));
    const toAdd = filesActive.filter((f) => {
      const u = String(f.uri ?? "").trim();
      return u.length > 0 && !seen.has(u);
    });
    if (toAdd.length === 0) return;
    for (const t of toAdd) seen.add(String(t.uri ?? "").trim());
    maintenanceEventImagesByAssetRef.current[mapKey] = [...prev, ...toAdd];
  }, []);

  /**
   * Xóa ảnh vừa chụp/chọn (chưa hoặc đang chờ upload): gỡ UI, trả 1 slot trong giới hạn, đánh dấu URI
   * để hàng đợi `uploadEditorImages` bỏ qua nếu chưa gửi; kiểm định: gỡ luôn khỏi `inspectionSessionPhotoUrls`.
   */
  const handleRemovePendingLocalImage = useCallback((uri: string) => {
    const u = String(uri ?? "").trim();
    if (!u) return;
    uploadCancelledLocalUrisRef.current.add(u);
    setEditorPendingLocalUris((prev) => {
      const i = prev.indexOf(u);
      if (i < 0) return prev;
      return [...prev.slice(0, i), ...prev.slice(i + 1)];
    });
    setInspectionSessionPhotoUrls((prev) => prev.filter((x) => x !== u));
    const aid = selectedMaintenanceAssetIdRef.current;
    if (aid) {
      const k = normalizeId(aid);
      const list = maintenanceEventImagesByAssetRef.current[k];
      if (list?.length) {
        maintenanceEventImagesByAssetRef.current[k] = list.filter((x) => String(x.uri ?? "").trim() !== u);
      }
    }
    maintenanceSessionImageCountRef.current = Math.max(
      0,
      maintenanceSessionImageCountRef.current - 1
    );
    setMaintenanceEditorSessionImageCount((c) => Math.max(0, c - 1));
  }, []);

  const handleOpenMaintenanceImageCapture = useCallback(() => {
    if (editorDeletingImageId != null) {
      CustomAlert.alert(t("common.error"), t("common.loading"), [{ text: t("common.close") }]);
      return;
    }
    setImageCaptureVisible(true);
  }, [editorDeletingImageId, t]);

  /**
   * Ảnh từ camera/thư viện: trừ slot ngay; hàng đợi gom file vào ref (POST event sau batch) — không POST lên asset item.
   */
  const handleEditorImagesPicked = useCallback(
    (assets: ImagePicker.ImagePickerAsset[], _source: "camera" | "library") => {
      const assetId = selectedMaintenanceAssetIdRef.current;
      if (!assetId) return;
      if (editorDeletingImageIdRef.current != null) return;

      const filtered = assets.filter((a) => Boolean(a.uri));
      if (filtered.length === 0) return;

      const sessionCount = maintenanceSessionImageCountRef.current;
      const room = Math.max(0, MAX_MAINTENANCE_ASSET_IMAGES - sessionCount);
      if (room <= 0) {
        CustomAlert.alert(
          t("common.images_limit_title"),
          t("common.images_limit_max_message", { max: MAX_MAINTENANCE_ASSET_IMAGES }),
          [{ text: t("common.close") }]
        );
        return;
      }

      const slice = filtered.slice(0, room);
      if (filtered.length > slice.length) {
        CustomAlert.alert(
          t("common.images_limit_title"),
          t("common.images_limit_truncated_message", {
            added: slice.length,
            max: MAX_MAINTENANCE_ASSET_IMAGES,
          }),
          [{ text: t("common.close") }]
        );
      }

      const files: AssetItemImageToUpload[] = slice.map((a, idx) => ({
        uri: a.uri as string,
        fileName: a.fileName ?? `maintenance-${assetId}-${Date.now()}-${idx}.jpg`,
        mimeType: a.mimeType ?? "image/jpeg",
      }));

      if (files.length === 0) return;

      const newLocalUris = files.map((f) => f.uri).filter((u) => u.trim().length > 0);
      setEditorPendingLocalUris((prev) => [...prev, ...newLocalUris]);
      if (isInspectionSlot) {
        setInspectionSessionPhotoUrls((prev) => [...new Set([...prev, ...newLocalUris])]);
      }

      const reserved = files.length;
      maintenanceSessionImageCountRef.current += reserved;
      setMaintenanceEditorSessionImageCount((c) => c + reserved);

      const filesForUpload = files;
      maintenanceImageUploadQueueRef.current = maintenanceImageUploadQueueRef.current.then(() => {
        uploadEditorImages(assetId, filesForUpload);
      });
    },
    [t, uploadEditorImages, isInspectionSlot]
  );

  const handleDeleteEditorImage = useCallback(
    async (imageId: string) => {
      if (!selectedMaintenanceAssetId) return;
      setEditorDeletingImageId(imageId);
      try {
        await deleteAssetItemImage(selectedMaintenanceAssetId, imageId);
        await refreshEditorImages(selectedMaintenanceAssetId);
      } catch (err) {
        CustomAlert.alert(
          t("common.error"),
          err instanceof Error ? err.message : t("staff_item_edit.delete_image_error"),
          [{ text: t("common.close") }]
        );
      } finally {
        setEditorDeletingImageId(null);
      }
    },
    [refreshEditorImages, selectedMaintenanceAssetId, t]
  );

  const handleSaveMaintenanceAssetDraft = useCallback(async () => {
    const targetAsset =
      maintenanceAssetsSorted.find((asset) => asset.id === selectedMaintenanceAssetId) ?? null;
    if (!targetAsset) return;
    if (editorDeletingImageId != null) {
      CustomAlert.alert(
        t("common.error"),
        t("common.loading"),
        [{ text: t("common.close") }]
      );
      return;
    }
    const parsed = Number(editorConditionPercent);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_work_slot_detail.maintenance_condition_invalid"),
        [{ text: t("common.close") }]
      );
      return;
    }
    const updateAtRaw = targetAsset.updateAt ?? null;
    await refreshEditorImages(targetAsset.id);
    setMaintenanceDrafts((prev) => ({
      ...prev,
      [targetAsset.id]: {
        assetId: targetAsset.id,
        displayName: targetAsset.displayName ?? targetAsset.id,
        floorNo: targetAsset.floorNo ?? null,
        conditionPercent: Math.round(parsed),
        note: editorNote.trim(),
        updateAt: updateAtRaw,
        markBroken: editorMarkBroken,
      },
    }));
    setMaintenanceEditorVisible(false);
    setSelectedMaintenanceAssetId(null);
  }, [
    editorConditionPercent,
    editorDeletingImageId,
    editorMarkBroken,
    editorNote,
    maintenanceAssetsSorted,
    refreshEditorImages,
    selectedMaintenanceAssetId,
    t,
  ]);

  const slotStatusLabel = getJobStatusLabel(slot.status, t);
  const itemStatusLabel = isIssueSlot
    ? ticket
      ? getIssueStatusLabel(ticket.status, t)
      : getJobStatusLabel(slot.status, t)
    : getJobStatusLabel(job?.status ?? slot.status, t);

  const hasDetailItem = isIssueSlot ? !!ticket : !!job;
  const issueTicketStatusNorm =
    isIssueSlot && ticket ? normalizeScheduleStatusKey(ticket.status) : "";
  const canShowActions = isIssueSlot
    ? !!ticket &&
      (issueTicketStatusNorm === "SCHEDULED" ||
        issueTicketStatusNorm === "IN_PROGRESS" ||
        issueTicketStatusNorm === "WAITING_STAFF_COMPLETION" ||
        issueTicketStatusNorm === "WAITING_CASH_PAYMENT")
    : !!job && (job.status === "SCHEDULED" || job.status === "IN_PROGRESS");

  const inspectionTypeUpper = (inspectionType ?? "").trim().toUpperCase();

  useFocusEffect(
    useCallback(() => {
      if (isInspectionSlot) {
        pushInspectionFlowDebugSession();
      }
      void refetchItem();
      return () => {
        if (isInspectionSlot) {
          popInspectionFlowDebugSession();
        }
      };
    }, [slot.ticketId, isIssueSlot, isInspectionSlot, refetchItem])
  );

  return (
    <View style={staffWorkSlotStyles.container}>
      <StackScreenTitleHeaderStrip>
        <View style={stackScreenTitleRowStyle}>
          <View style={stackScreenTitleSideSlotStyle}>
            <TouchableOpacity
              style={stackScreenTitleBackBtnOnBrand}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icons.chevronBack size={28} color={stackScreenTitleOnBrandIconColor} />
            </TouchableOpacity>
          </View>
          <View style={stackScreenTitleCenterSlotStyle}>
            <StackScreenTitleBadge numberOfLines={1}>
              {t("staff_work_slot_detail.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={detailRefreshing} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            staffWorkSlotStyles.scrollContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <PullToRefreshControl refreshing={detailRefreshing} onRefresh={onDetailRefresh} />
          }
        >
        {/* Hero banner
        <View style={staffWorkSlotStyles.heroBanner}>
          <Text style={staffWorkSlotStyles.heroTime}>{slot.timeRange}</Text>
          <Text style={staffWorkSlotStyles.heroDate}>{slot.date}</Text>
          <Text style={staffWorkSlotStyles.heroJobType}>
            {slot.taskKey ? t(slot.taskKey) : slot.task}
          </Text>
        </View> */}

        <WorkSlotDetailWorkSlotSection t={t} slot={slot} slotStatusLabel={slotStatusLabel} />

        {/* Job (từ API) */}
        <View style={staffWorkSlotStyles.section}>
          <View style={[staffWorkSlotStyles.sectionHeader, { borderBottomColor: brandTintBg }]}>
            <View style={[iconStyles.workSlotSectionIconWrap, iconStyles.workSlotSectionIconWrapJob]}>
              <Icons.assignment size={20} color={neutral.iconMuted} />
            </View>
            <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.job_section")}</Text>
          </View>
          {loading ? (
            <View style={[staffWorkSlotStyles.loadingWrap, { position: "relative", minHeight: 200 }]}>
              <RefreshLogoOverlay visible mode="page" />
            </View>
          ) : error ? (
            <View style={staffWorkSlotStyles.errorCard}>
              <Text style={staffWorkSlotStyles.errorText}>{error}</Text>
            </View>
          ) : hasDetailItem ? (
            <View style={staffWorkSlotStyles.card}>
              <WorkSlotDetailInfoRow
                icon={<Icons.home size={18} color={neutral.slate500} />}
                label={isIssueSlot ? t("staff_ticket_detail.building") : t("staff_work_slot_detail.house_id")}
                value={currentHouseName}
                valueLoading={houseNameRowLoading}
              />
              {isIssueSlot ? (
                <>
                  <WorkSlotDetailInfoRow
                    icon={<Icons.assignment size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.title_label")}
                    value={ticket?.title ?? ""}
                  />
                  <WorkSlotDetailInfoRow
                    icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.description")}
                    value={ticket?.description ?? ""}
                  />
                  <WorkSlotDetailInfoRow
                    icon={<Icons.tag size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.device")}
                    value={assetIssueDisplayName}
                    valueLoading={assetIssueNameLoading}
                  />
                  <WorkSlotDetailInfoRow
                    icon={<Icons.calendar size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.created_at")}
                    value={ticket?.createdAt ? formatDdMmYyyy(new Date(ticket.createdAt)) : ""}
                  />

                  <View style={{ marginTop: 6 }}>
                    <Text style={staffWorkSlotStyles.imageSectionTitle}>
                      {t("staff_ticket_detail.images_label")}
                    </Text>
                    {ticketImagesLoading ? (
                      <View
                        style={[
                          staffWorkSlotStyles.imageLoadingRow,
                          { flexDirection: "column", alignItems: "flex-start" },
                        ]}
                      >
                        <RefreshLogoInline logoPx={18} showLabel />
                      </View>
                    ) : ticketImages.length > 0 ? (
                      <>
                        <ScrollView
                          horizontal
                          nestedScrollEnabled
                          showsHorizontalScrollIndicator={false}
                          style={staffWorkSlotStyles.ticketImagesScroll}
                          contentContainerStyle={staffWorkSlotStyles.ticketImagesStrip}
                        >
                          {ticketImages.map((img) => (
                            <TouchableOpacity
                              key={img.id}
                              style={[
                                staffWorkSlotStyles.ticketImageThumb,
                                staffWorkSlotStyles.ticketImageThumbHorizontal,
                              ]}
                              activeOpacity={0.85}
                              onPress={() => {
                                const uris = ticketImages.map((x) => x.url);
                                const i = ticketImages.findIndex((x) => x.id === img.id);
                                openMaintenanceImageGallery(uris, i < 0 ? 0 : i);
                              }}
                            >
                              <Image source={{ uri: img.url }} style={staffWorkSlotStyles.ticketImage} resizeMode="cover" />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    ) : (
                      <Text style={staffWorkSlotStyles.imageEmptyText}>{t("staff_ticket_detail.images_empty")}</Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <WorkSlotDetailInfoRow
                    icon={<Icons.event size={18} color={neutral.slate500} />}
                    label={
                      isInspectionSlot
                        ? t("staff_work_slot_detail.inspection_period_label")
                        : t("staff_work_slot_detail.period_start")
                    }
                    value={job?.periodStartDate ? formatYmdStringToDdMmYyyy(job.periodStartDate) : ""}
                  />
                  {isInspectionSlot ? (
                    <WorkSlotDetailInfoRow
                      icon={<Icons.tag size={18} color={neutral.slate500} />}
                      label={t("staff_work_slot_detail.inspection_type_label")}
                      value={getInspectionTypeDisplay(inspectionType, t)}
                    />
                  ) : null}
                  {isInspectionSlot && inspectionNote ? (
                    <WorkSlotDetailInfoRow
                      icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                      label={t("staff_work_slot_detail.inspection_note_label")}
                      value={inspectionNote}
                    />
                  ) : null}
                </>
              )}
              <WorkSlotDetailInfoRow
                icon={<Icons.flag size={18} color={neutral.slate500} />}
                label={isIssueSlot ? t("staff_ticket_detail.status") : t("staff_work_slot_detail.job_status")}
                value={itemStatusLabel}
                isStatus
                statusRaw={isIssueSlot ? ticket?.status ?? slot.status : job?.status ?? slot.status}
              />
              {canShowActions ? (
                <View style={[staffWorkSlotStyles.actionRow, { marginTop: 16 }]}>
                  {isIssueSlot && issueTicketStatusNorm === "SCHEDULED" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnStart, { marginRight: 6 }]}
                      onPress={handleStartWork}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <RefreshLogoInline logoPx={18} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {isIssueSlot
                            ? t("staff_work_slot_detail.btn_start_issue")
                            : t("staff_work_slot_detail.btn_start_maintenance")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  {isIssueSlot && issueTicketStatusNorm === "IN_PROGRESS" ? (
                    issueRepairSubmitted ? (
                      <TouchableOpacity
                        style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                        onPress={() => void handleIssuePaymentEntryPress()}
                        disabled={updateLoading || issuePaymentChoiceLoading}
                      >
                        {updateLoading ? (
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={staffWorkSlotStyles.actionBtnText}>
                            {t("staff_work_slot_detail.btn_confirm_complete")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnRepairNote, { marginRight: 6 }]}
                        onPress={() => {
                          if (ticket?.id && ticket.houseId && ticket.assetId) {
                            navigation.navigate("StaffIssueNote", {
                              issueId: ticket.id,
                              houseId: ticket.houseId,
                              assetId: ticket.assetId,
                            });
                            return;
                          }
                          CustomAlert.alert(
                            t("common.error"),
                            "Thiếu thông tin issue để ghi nhận sửa chữa.",
                            [{ text: t("common.close") }]
                          );
                        }}
                        disabled={updateLoading}
                      >
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {t("staff_work_slot_detail.btn_issue_repair_flow")}
                        </Text>
                      </TouchableOpacity>
                    )
                  ) : null}
                  {isIssueSlot && issueTicketStatusNorm === "WAITING_STAFF_COMPLETION" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={() => void handleIssuePaymentEntryPress()}
                      disabled={updateLoading || issuePaymentChoiceLoading || issueCashConfirmLoading}
                    >
                      {updateLoading ? (
                        <RefreshLogoInline logoPx={18} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {t("staff_work_slot_detail.btn_select_payment")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  {isIssueSlot && issueTicketStatusNorm === "WAITING_CASH_PAYMENT" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={() => void handleIssueConfirmCashReceived()}
                      disabled={updateLoading || issueCashConfirmLoading || issuePaymentChoiceLoading}
                    >
                      {issueCashConfirmLoading ? (
                        <RefreshLogoInline logoPx={18} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {t("staff_work_slot_detail.btn_confirm_cash_received")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {!isIssueSlot && job?.status === "SCHEDULED" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnStart, { marginRight: 6 }]}
                      onPress={handleStartWork}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <RefreshLogoInline logoPx={18} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {t(
                            isInspectionSlot
                              ? "staff_work_slot_detail.btn_start_inspection"
                              : "staff_work_slot_detail.btn_start_maintenance"
                          )}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {!isIssueSlot && job?.status === "IN_PROGRESS" ? (
                    isInspectionSlot ? (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                          flex: 1,
                          minWidth: "100%",
                          marginRight: 6,
                        }}
                      >
                        {maintenanceSubmitted ? (
                          <TouchableOpacity
                            style={[
                              staffWorkSlotStyles.actionBtn,
                              staffWorkSlotStyles.actionBtnVerify,
                              { flex: 1, minWidth: 140 },
                            ]}
                            onPress={() => void navigateToInspectionConfirm()}
                            disabled={updateLoading}
                          >
                            {updateLoading ? (
                              <RefreshLogoInline logoPx={18} />
                            ) : (
                              <Text style={staffWorkSlotStyles.actionBtnText}>
                                {t("staff_work_slot_detail.btn_confirm_inspection")}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[
                              staffWorkSlotStyles.actionBtn,
                              staffWorkSlotStyles.actionBtnStartUpdate,
                              { flex: 1, minWidth: 140 },
                            ]}
                            onPress={openMaintenanceModal}
                            disabled={updateLoading}
                          >
                            {updateLoading ? (
                              <RefreshLogoInline logoPx={18} />
                            ) : (
                              <Text style={staffWorkSlotStyles.actionBtnText}>
                                {t("staff_work_slot_detail.btn_start_update")}
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          staffWorkSlotStyles.actionBtn,
                          !maintenanceSubmitted
                            ? staffWorkSlotStyles.actionBtnStartUpdate
                            : staffWorkSlotStyles.actionBtnSuccess,
                          { marginRight: 6 },
                        ]}
                        onPress={maintenanceSubmitted ? handleStartWork : openMaintenanceModal}
                        disabled={updateLoading}
                      >
                        {updateLoading ? (
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={staffWorkSlotStyles.actionBtnText}>
                            {maintenanceSubmitted
                              ? t("staff_work_slot_detail.btn_complete")
                              : t("staff_work_slot_detail.btn_start_update")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={staffWorkSlotStyles.emptyCard}>
              <Text style={staffWorkSlotStyles.emptyText}>{t("staff_work_slot_detail.no_job")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      </View>

      <IssueRepairPaymentTypeModal
        visible={issuePaymentModalVisible}
        loading={issuePaymentChoiceLoading}
        onClose={() => {
          if (!issuePaymentChoiceLoading) setIssuePaymentModalVisible(false);
        }}
        onSelectCash={handleIssuePaymentCash}
        onSelectVnpay={handleIssuePaymentVnpay}
      />

      {!isInspectionSlot ? (
        <WorkSlotMaintenanceModalFlow
          t={t}
          insetsTop={insets.top}
          currentHouseName={currentHouseName}
          maintenanceModalVisible={maintenanceModalVisible}
          closeMaintenanceModal={closeMaintenanceModal}
          maintenanceSubmitting={maintenanceSubmitting}
          maintenanceModalBodyScrollMaxH={maintenanceModalBodyScrollMaxH}
          maintenanceDropdownResultsMaxH={maintenanceDropdownResultsMaxH}
          maintenanceFloorOptions={maintenanceFloorOptions}
          maintenanceSortFloor={maintenanceSortFloor}
          setMaintenanceSortFloor={setMaintenanceSortFloor}
          maintenanceAssetsLoading={maintenanceAssetsLoading}
          maintenanceAssetSection={maintenanceAssetSection}
          maintenanceAssetSummary={maintenanceAssetSummary}
          onMaintenanceAssetSelect={handleMaintenanceAssetSelect}
          maintenanceDrafts={maintenanceDrafts}
          onSubmitMaintenanceBatch={handleSubmitMaintenanceBatch}
          maintenanceEditorVisible={maintenanceEditorVisible}
          setMaintenanceEditorVisible={setMaintenanceEditorVisible}
          maintenanceEditorLoading={maintenanceEditorLoading}
          selectedMaintenanceAsset={selectedMaintenanceAsset}
          editorConditionPercent={editorConditionPercent}
          setEditorConditionPercent={setEditorConditionPercent}
          editorNote={editorNote}
          setEditorNote={setEditorNote}
          editorMarkBroken={editorMarkBroken}
          setEditorMarkBroken={setEditorMarkBroken}
          editorUpdateAt={editorUpdateAt}
          editorServerImages={editorSessionImagesOnly}
          editorPendingLocalUris={editorPendingLocalUris}
          editorImagesVersion={editorImagesVersion}
          onDeleteEditorImage={handleDeleteEditorImage}
          onRemovePendingLocalImage={handleRemovePendingLocalImage}
          editorImageUploading={editorImageUploading}
          editorDeletingImageId={editorDeletingImageId}
          onOpenMaintenanceImageCapture={handleOpenMaintenanceImageCapture}
          onSaveMaintenanceAssetDraft={handleSaveMaintenanceAssetDraft}
          imageCaptureVisible={imageCaptureVisible}
          setImageCaptureVisible={setImageCaptureVisible}
          onEditorImagesPicked={handleEditorImagesPicked}
          onOpenImageGallery={openMaintenanceImageGallery}
          hasFloorAreas={hasFloorAreas}
          maintenanceSessionImageCount={maintenanceEditorSessionImageCount}
        />
      ) : inspectionTypeUpper === "CHECK_OUT" ? (
        <WorkSlotInspectionCheckOutModalFlow
          t={t}
          insetsTop={insets.top}
          currentHouseName={currentHouseName}
          maintenanceModalVisible={maintenanceModalVisible}
          closeMaintenanceModal={closeMaintenanceModal}
          maintenanceSubmitting={maintenanceSubmitting}
          maintenanceModalBodyScrollMaxH={maintenanceModalBodyScrollMaxH}
          maintenanceDropdownResultsMaxH={maintenanceDropdownResultsMaxH}
          maintenanceFloorOptions={maintenanceFloorOptions}
          maintenanceSortFloor={maintenanceSortFloor}
          setMaintenanceSortFloor={setMaintenanceSortFloor}
          maintenanceAssetsLoading={maintenanceAssetsLoading}
          maintenanceAssetSection={maintenanceAssetSection}
          maintenanceAssetSummary={maintenanceAssetSummary}
          onMaintenanceAssetSelect={handleMaintenanceAssetSelect}
          maintenanceDrafts={maintenanceDrafts}
          onSubmitMaintenanceBatch={handleSubmitMaintenanceBatch}
          maintenanceEditorVisible={maintenanceEditorVisible}
          setMaintenanceEditorVisible={setMaintenanceEditorVisible}
          maintenanceEditorLoading={maintenanceEditorLoading}
          selectedMaintenanceAsset={selectedMaintenanceAsset}
          selectedMaintenanceAssetId={selectedMaintenanceAssetId}
          checkInBaselineByAssetId={checkInBaselineByAssetId}
          editorConditionPercent={editorConditionPercent}
          setEditorConditionPercent={setEditorConditionPercent}
          editorNote={editorNote}
          setEditorNote={setEditorNote}
          editorUpdateAt={editorUpdateAt}
          editorMarkBroken={editorMarkBroken}
          setEditorMarkBroken={setEditorMarkBroken}
          editorServerImages={editorSessionImagesOnly}
          editorPendingLocalUris={editorPendingLocalUris}
          editorImagesVersion={editorImagesVersion}
          onDeleteEditorImage={handleDeleteEditorImage}
          onRemovePendingLocalImage={handleRemovePendingLocalImage}
          editorImageUploading={editorImageUploading}
          editorDeletingImageId={editorDeletingImageId}
          onOpenMaintenanceImageCapture={handleOpenMaintenanceImageCapture}
          onSaveMaintenanceAssetDraft={handleSaveMaintenanceAssetDraft}
          imageCaptureVisible={imageCaptureVisible}
          setImageCaptureVisible={setImageCaptureVisible}
          onEditorImagesPicked={handleEditorImagesPicked}
          onOpenImageGallery={openMaintenanceImageGallery}
          hasFloorAreas={hasFloorAreas}
          maintenanceSessionImageCount={maintenanceEditorSessionImageCount}
        />
      ) : (
        <WorkSlotInspectionCheckInModalFlow
          t={t}
          insetsTop={insets.top}
          currentHouseName={currentHouseName}
          maintenanceModalVisible={maintenanceModalVisible}
          closeMaintenanceModal={closeMaintenanceModal}
          maintenanceSubmitting={maintenanceSubmitting}
          maintenanceModalBodyScrollMaxH={maintenanceModalBodyScrollMaxH}
          maintenanceDropdownResultsMaxH={maintenanceDropdownResultsMaxH}
          maintenanceFloorOptions={maintenanceFloorOptions}
          maintenanceSortFloor={maintenanceSortFloor}
          setMaintenanceSortFloor={setMaintenanceSortFloor}
          maintenanceAssetsLoading={maintenanceAssetsLoading}
          maintenanceAssetSection={maintenanceAssetSection}
          maintenanceAssetSummary={maintenanceAssetSummary}
          onMaintenanceAssetSelect={handleMaintenanceAssetSelect}
          maintenanceDrafts={maintenanceDrafts}
          onSubmitMaintenanceBatch={handleSubmitMaintenanceBatch}
          maintenanceEditorVisible={maintenanceEditorVisible}
          setMaintenanceEditorVisible={setMaintenanceEditorVisible}
          maintenanceEditorLoading={maintenanceEditorLoading}
          selectedMaintenanceAsset={selectedMaintenanceAsset}
          editorConditionPercent={editorConditionPercent}
          setEditorConditionPercent={setEditorConditionPercent}
          editorNote={editorNote}
          setEditorNote={setEditorNote}
          editorUpdateAt={editorUpdateAt}
          editorMarkBroken={editorMarkBroken}
          setEditorMarkBroken={setEditorMarkBroken}
          editorServerImages={editorSessionImagesOnly}
          editorPendingLocalUris={editorPendingLocalUris}
          editorImagesVersion={editorImagesVersion}
          onDeleteEditorImage={handleDeleteEditorImage}
          onRemovePendingLocalImage={handleRemovePendingLocalImage}
          editorImageUploading={editorImageUploading}
          editorDeletingImageId={editorDeletingImageId}
          onOpenMaintenanceImageCapture={handleOpenMaintenanceImageCapture}
          onSaveMaintenanceAssetDraft={handleSaveMaintenanceAssetDraft}
          imageCaptureVisible={imageCaptureVisible}
          setImageCaptureVisible={setImageCaptureVisible}
          onEditorImagesPicked={handleEditorImagesPicked}
          onOpenImageGallery={openMaintenanceImageGallery}
          hasFloorAreas={hasFloorAreas}
          maintenanceSessionImageCount={maintenanceEditorSessionImageCount}
        />
      )}

      <WorkSlotImageGalleryModal
        visible={maintenanceImageGallery != null}
        uris={maintenanceImageGallery?.uris ?? []}
        initialIndex={maintenanceImageGallery?.initialIndex ?? 0}
        onClose={() => setMaintenanceImageGallery(null)}
      />
    </View>
  );
}
