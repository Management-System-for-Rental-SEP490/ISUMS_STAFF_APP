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
  getIssueTicketById,
  getIssueTicketImages,
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
import { RefreshLogoInline, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import {
  mapInspectionToJobFromApi,
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
import { staffWorkSlotStyles, STATUS_COLORS } from "./staffWorkSlotStyles";
import { brandPrimary, brandTintBg, neutral } from "../../../../shared/theme/color";
import {
  formatDdMmYyyy,
  formatHmAmPmDdMmYyyy,
  formatYmdStringToDdMmYyyy,
} from "../../../../shared/utils";
import { SCHEDULE_DATA_KEYS } from "../../hooks/useStaffScheduleData";
import {
  isoLocalDateToYmd,
  waitForWorkSlotCompletionSync,
} from "../../utils/workSlotCompletionSync";
import { WorkSlotInspectionCheckInModalFlow } from "./WorkSlotInspectionCheckInModalFlow";
import { WorkSlotInspectionCheckOutModalFlow } from "./WorkSlotInspectionCheckOutModalFlow";
import { WorkSlotMaintenanceModalFlow } from "./WorkSlotMaintenanceModalFlow";
import { submittedIssueRepairTicketIdsInSession } from "./issueRepairSession";
import { MAX_MAINTENANCE_ASSET_IMAGES, type MaintenanceDraft } from "./staffWorkSlotModalTypes";
import { useFunctionalAreasByHouseId, useHouseById } from "../../../../shared/hooks/useHouses";
import {
  getAssetItemsByHouseId,
  getAssetItemById,
  getImagesFromAssetItem,
  deleteAssetItemImage,
  uploadAssetItemImages,
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
  "BOOKED",
  "BLOCKED",
  "NEED_RESCHEDULE",
  "CANCELLED",
  "DONE",
  "CREATED",
  "CONFIRMED",
  "SCHEDULED",
  "IN_PROGRESS",
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

function getStatusColors(status: string | undefined): { bg: string; text: string } {
  const key = normalizeScheduleStatusKey(status) || "OTHER";
  return STATUS_COLORS[key] ?? STATUS_COLORS.OTHER;
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
  const [assetDisplayName, setAssetDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(!!slot.ticketId);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [ticketImages, setTicketImages] = useState<IssueTicketImageFromApi[]>([]);
  const [ticketImagesLoading, setTicketImagesLoading] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
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
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
  const [maintenanceEditorLoading, setMaintenanceEditorLoading] = useState(false);
  const [maintenanceAssets, setMaintenanceAssets] = useState<AssetItemFromApi[]>([]);
  const [maintenanceAssetsLoading, setMaintenanceAssetsLoading] = useState(false);
  const [editorConditionPercent, setEditorConditionPercent] = useState("");
  const [editorNote, setEditorNote] = useState("");
  const [editorUpdateAt, setEditorUpdateAt] = useState("");
  const [editorImageUrls, setEditorImageUrls] = useState<string[]>([]);
  const [editorServerImages, setEditorServerImages] = useState<AssetItemImageFromApi[]>([]);
  const [editorImagesVersion, setEditorImagesVersion] = useState(0);
  const [editorImageUploading, setEditorImageUploading] = useState(false);
  const [editorDeletingImageId, setEditorDeletingImageId] = useState<string | null>(null);
  const [imageCaptureVisible, setImageCaptureVisible] = useState(false);
  const [inspectionContractId, setInspectionContractId] = useState<string | null>(null);
  const [checkInBaselineByAssetId, setCheckInBaselineByAssetId] = useState<
    Record<string, { conditionPercent?: number | null; note?: string | null }>
  >({});
  const [inspectionSessionPhotoUrls, setInspectionSessionPhotoUrls] = useState<string[]>([]);
  const [editorMarkBroken, setEditorMarkBroken] = useState(false);
  /** Số ảnh đã thêm (upload) trong lần mở modal này — giới hạn MAX, không trừ ảnh cũ trên asset. */
  const [maintenanceEditorSessionImageCount, setMaintenanceEditorSessionImageCount] = useState(0);

  const editorServerImagesRef = useRef(editorServerImages);
  editorServerImagesRef.current = editorServerImages;
  const selectedMaintenanceAssetIdRef = useRef(selectedMaintenanceAssetId);
  selectedMaintenanceAssetIdRef.current = selectedMaintenanceAssetId;
  const editorDeletingImageIdRef = useRef(editorDeletingImageId);
  editorDeletingImageIdRef.current = editorDeletingImageId;
  /** Chuỗi xử lý pick ảnh tuần tự — tránh bỏ qua lần chụp khi upload trước chưa xong. */
  const editorImagePickQueueRef = useRef(Promise.resolve());
  const maintenanceSessionImageCountRef = useRef(0);
  /**
   * Ảnh đã upload lên asset trong phiên bảo trì, map theo `serverImageId` để xóa khỏi danh sách
   * khi user xóa ảnh; sau batch BE trả `eventId` thì POST cùng file local lên sự kiện tương ứng.
   */
  const maintenanceEventImagesByAssetRef = useRef<
    Record<string, Array<AssetItemImageToUpload & { serverImageId: string }>>
  >({});
  /** Cặp assetId/eventId từ response batch — POST ảnh lên event khi Hoàn thành / Xác nhận kiểm định. */
  const pendingMaintenanceBatchEventsRef = useRef<Array<{ assetId: string; eventId: string }>>([]);

  /** Gắn ảnh theo từng asset vào đúng `eventId` (sau khi batch đã trả events). Trả về true nếu có lần POST lỗi. */
  const uploadPendingMaintenanceEventImages = useCallback(async (): Promise<boolean> => {
    const events = pendingMaintenanceBatchEventsRef.current;
    if (!events.length) return false;
    const byAsset = maintenanceEventImagesByAssetRef.current;
    let failed = false;
    const remaining: Array<{ assetId: string; eventId: string }> = [];
    for (const ev of events) {
      const rows = byAsset[ev.assetId];
      if (!rows?.length) continue;
      const files: AssetItemImageToUpload[] = rows.map(({ serverImageId: _sid, ...rest }) => rest);
      try {
        await uploadAssetEventImages(ev.eventId, files);
        delete byAsset[ev.assetId];
      } catch {
        failed = true;
        remaining.push(ev);
      }
    }
    pendingMaintenanceBatchEventsRef.current = remaining;
    return failed;
  }, []);

  const currentHouseId = isIssueSlot ? ticket?.houseId : job?.houseId;
  const { data: houseByIdResp } = useHouseById(currentHouseId);
  const currentHouseName = useMemo(() => {
    if (!currentHouseId?.trim()) return "";
    const ok = houseByIdResp?.success !== false;
    const name = ok ? houseByIdResp?.data?.name?.trim() : "";
    return name || currentHouseId;
  }, [currentHouseId, houseByIdResp]);
  const { data: maintenanceAreasResp } = useFunctionalAreasByHouseId(currentHouseId ?? "");
  const maintenanceAreas = (maintenanceAreasResp?.data ?? []) as FunctionalAreaFromApi[];

  const refetchItem = () => {
    if (!slot.ticketId?.trim()) return;
    if (isIssueSlot) {
      setInspectionNote(null);
      setInspectionType(null);
      getIssueTicketById(slot.ticketId)
        .then(async (res) => {
          if (!res?.success || !res?.data) return;
          setTicket(res.data);
          setJob(null);
          const st = String(res.data.status ?? "").toUpperCase();
          setIssueRepairSubmitted(
            st === "IN_PROGRESS" && submittedIssueRepairTicketIdsInSession.has(res.data.id)
          );
          // Asset display name (optional) - BE có thể không trả đủ assetName trong ticket
          if (res.data.assetId?.trim()) {
            const asset = await getAssetItemById(res.data.assetId);
            setAssetDisplayName(asset?.displayName ?? res.data.assetId);
          } else {
            setAssetDisplayName("");
          }
        })
        .catch(() => {});
      return;
    }

    if (isInspectionSlot) {
      getInspectionById(slot.ticketId)
        .then((res) => {
          if (!res?.success || !res?.data) return;
          setJob(mapInspectionToJobFromApi(res.data));
          setTicket(null);
          setAssetDisplayName("");
          const n = res.data.note?.trim();
          setInspectionNote(n ? n : null);
          const tp = res.data.type?.trim();
          setInspectionType(tp ? tp : null);
          const cid = res.data.contractId?.trim();
          setInspectionContractId(cid && cid.length > 0 ? cid : null);
        })
        .catch(() => {});
      return;
    }

    setInspectionNote(null);
    setInspectionType(null);
    getJobById(slot.ticketId)
      .then((res) => {
        if (!res?.success || !res?.data) return;
        setJob(res.data);
        setTicket(null);
        setAssetDisplayName("");
      })
      .catch(() => {});
  };

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

  const handleCompleteIssueWorkSlot = async () => {
    if (!ticket?.id || !slot.ticketId) return;
    setUpdateLoading(true);
    try {
      await updateIssueTicketStatus(ticket.id, "DONE");
      const { startTimeIso } = await waitForWorkSlotCompletionSync({
        scheduleSlotId: slot.id,
        jobId: ticket.id,
        kind: "issue",
      });
      await queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
      refetchItem();
      CustomAlert.alert(
        t("staff_work_slot_detail.completion_alert_title"),
        "",
        [
          {
            text: t("common.close"),
            onPress: () => navigateCalendarAfterCompletion(startTimeIso),
          },
        ]
      );
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
        refetchItem();
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
        maintenanceSessionImageCountRef.current = 0;
        setMaintenanceEditorSessionImageCount(0);
      } else if (finishedNow) {
        setMaintenanceSubmitted(false);
        submittedMaintenanceJobIdsInSession.delete(job.id);
      }

      if (finishedNow) {
        const { startTimeIso } = await waitForWorkSlotCompletionSync({
          scheduleSlotId: slot.id,
          jobId: job.id,
          kind: isInspectionSlot ? "inspection" : "maintenance",
        });
        await queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
        refetchItem();
        CustomAlert.alert(
          t("staff_work_slot_detail.completion_alert_title"),
          maintenanceEventUploadFailed
            ? t("staff_work_slot_detail.maintenance_event_images_partial")
            : "",
          [
            {
              text: t("common.close"),
              onPress: () => navigateCalendarAfterCompletion(startTimeIso),
            },
          ]
        );
      } else {
        CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
        refetchItem();
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
        houseName: currentHouseName || undefined,
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
   * Gán `editorServerImagesRef` đồng bộ với mảng mới — hàng đợi upload chạy ngay sau `await`
   * (trước khi React re-render) nên không được dựa vào `editorServerImages` state/ref theo render.
   */
  const refreshEditorImages = useCallback(async (assetId: string): Promise<AssetItemImageFromApi[]> => {
    const asset = await getAssetItemById(assetId);
    const images = getImagesFromAssetItem(asset);
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
        const images = getImagesFromAssetItem(asset);
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
                : formatHmAmPmDdMmYyyy(parsed)
            );
          }
        }
      } catch {
        if (!cancelled) {
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
              pendingMaintenanceBatchEventsRef.current = res.data?.events ?? [];
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
          if (issue.assetId?.trim()) {
            const asset = await getAssetItemById(issue.assetId);
            if (!cancelled) setAssetDisplayName(asset?.displayName ?? issue.assetId);
          } else if (!cancelled) {
            setAssetDisplayName("");
          }
          return;
        }

        if (isInspectionSlot) {
          const res = await getInspectionById(slot.ticketId!);
          if (cancelled || !res?.success || !res?.data) return;
          const nextJob = mapInspectionToJobFromApi(res.data);
          setJob(nextJob);
          setTicket(null);
          setAssetDisplayName("");
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
        setAssetDisplayName("");
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
        };
      }),
    };
  }, [filteredMaintenanceAssets, hasFloorAreas, maintenanceModalVisible, t]);

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
   * Upload ảnh lên asset đang mở trong modal; `assetId` truyền rõ để chuỗi hàng đợi không lệch khi đổi thiết bị.
   */
  const uploadEditorImages = useCallback(
    async (assetId: string, files: AssetItemImageToUpload[]) => {
      if (!assetId?.trim() || files.length === 0) return;
      setEditorImageUploading(true);
      try {
        const beforeAsset = await getAssetItemById(assetId);
        const beforeIds = new Set(getImagesFromAssetItem(beforeAsset).map((i) => i.id));
        await uploadAssetItemImages(assetId, files);
        const added = files.length;
        maintenanceSessionImageCountRef.current += added;
        setMaintenanceEditorSessionImageCount((c) => c + added);
        const afterImages = await refreshEditorImages(assetId);
        const newImages = afterImages.filter((i) => !beforeIds.has(i.id));
        const n = Math.min(newImages.length, files.length);
        if (n > 0) {
          const prev = maintenanceEventImagesByAssetRef.current[assetId] ?? [];
          const merged = [...prev];
          for (let i = 0; i < n; i++) {
            const img = newImages[i];
            const f = files[i];
            merged.push({
              serverImageId: img.id,
              uri: f.uri,
              fileName: f.fileName,
              mimeType: f.mimeType,
            });
          }
          maintenanceEventImagesByAssetRef.current[assetId] = merged;
        }
        const newUrls = newImages
          .map((i) => i.url)
          .filter((u) => u.trim().length > 0);
        if (isInspectionSlot && newUrls.length > 0) {
          setInspectionSessionPhotoUrls((prev) => [...new Set([...prev, ...newUrls])]);
          logInspectionDebug("[InspectionUpload]", "session photos appended", {
            assetId,
            added: newUrls.length,
          });
        }
      } finally {
        setEditorImageUploading(false);
      }
    },
    [isInspectionSlot, refreshEditorImages]
  );

  const handleOpenMaintenanceImageCapture = useCallback(() => {
    if (editorDeletingImageId != null) {
      CustomAlert.alert(t("common.error"), t("common.loading"), [{ text: t("common.close") }]);
      return;
    }
    setImageCaptureVisible(true);
  }, [editorDeletingImageId, t]);

  /**
   * Xử lý ảnh từ camera/thư viện: hàng đợi tuần tự (không drop khi upload chưa xong).
   * Giới hạn MAX chỉ theo số ảnh đã thêm trong phiên mở modal (không trừ ảnh cũ trên asset).
   */
  const handleEditorImagesPicked = useCallback(
    (assets: ImagePicker.ImagePickerAsset[], _source: "camera" | "library") => {
      editorImagePickQueueRef.current = editorImagePickQueueRef.current
        .then(async () => {
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

          try {
            await uploadEditorImages(assetId, files);
          } catch (err) {
            CustomAlert.alert(
              t("common.error"),
              err instanceof Error ? err.message : t("staff_work_slot_detail.maintenance_batch_error"),
              [{ text: t("common.close") }]
            );
          }
        })
        .catch(() => {});
    },
    [t, uploadEditorImages]
  );

  const handleDeleteEditorImage = useCallback(
    async (imageId: string) => {
      if (!selectedMaintenanceAssetId) return;
      setEditorDeletingImageId(imageId);
      try {
        await deleteAssetItemImage(selectedMaintenanceAssetId, imageId);
        const list = maintenanceEventImagesByAssetRef.current[selectedMaintenanceAssetId];
        if (list?.length) {
          maintenanceEventImagesByAssetRef.current[selectedMaintenanceAssetId] = list.filter(
            (x) => x.serverImageId !== imageId
          );
        }
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
    if (editorImageUploading || editorDeletingImageId != null) {
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
    editorImageUploading,
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

  // Tên căn nhà hiển thị ở phần chi tiết công việc.
  const houseDisplayName = currentHouseName;
  const hasDetailItem = isIssueSlot ? !!ticket : !!job;
  const canShowActions = isIssueSlot
    ? !!ticket && (ticket.status === "SCHEDULED" || ticket.status === "IN_PROGRESS")
    : !!job && (job.status === "SCHEDULED" || job.status === "IN_PROGRESS");

  const inspectionTypeUpper = (inspectionType ?? "").trim().toUpperCase();

  useFocusEffect(
    useCallback(() => {
      if (isInspectionSlot) {
        pushInspectionFlowDebugSession();
      }
      refetchItem();
      return () => {
        if (isInspectionSlot) {
          popInspectionFlowDebugSession();
        }
      };
    }, [slot.ticketId, isIssueSlot, isInspectionSlot])
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

      <ScrollView
        contentContainerStyle={[
          staffWorkSlotStyles.scrollContent,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner
        <View style={staffWorkSlotStyles.heroBanner}>
          <Text style={staffWorkSlotStyles.heroTime}>{slot.timeRange}</Text>
          <Text style={staffWorkSlotStyles.heroDate}>{slot.date}</Text>
          <Text style={staffWorkSlotStyles.heroJobType}>
            {slot.taskKey ? t(slot.taskKey) : slot.task}
          </Text>
        </View> */}

        {/* Work Slot */}
        <View style={staffWorkSlotStyles.section}>
          <View style={staffWorkSlotStyles.sectionHeader}>
            <View style={iconStyles.workSlotSectionIconWrap}>
              <Icons.schedule size={20} color={neutral.iconMuted} />
            </View>
            <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.work_slot_section")}</Text>
          </View>
          <View style={staffWorkSlotStyles.card}>
            <InfoRow icon={<Icons.accessTime size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.time_range")} value={slot.timeRange} />
            <InfoRow icon={<Icons.calendar size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.date")} value={slot.date} />
            <InfoRow icon={<Icons.workOutline size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.job_type")} value={slot.taskKey ? t(slot.taskKey) : slot.task} />
            <InfoRow
              icon={<Icons.flag size={18} color={neutral.slate500} />}
              label={t("staff_work_slot_detail.status")}
              value={slotStatusLabel}
              isStatus
              statusRaw={slot.status}
            />
          </View>
        </View>

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
              <InfoRow
                icon={<Icons.home size={18} color={neutral.slate500} />}
                label={isIssueSlot ? t("staff_ticket_detail.building") : t("staff_work_slot_detail.house_id")}
                value={houseDisplayName}
              />
              {isIssueSlot ? (
                <>
                  <InfoRow
                    icon={<Icons.assignment size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.title_label")}
                    value={ticket?.title ?? ""}
                  />
                  <InfoRow
                    icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.description")}
                    value={ticket?.description ?? ""}
                  />
                  <InfoRow
                    icon={<Icons.tag size={18} color={neutral.slate500} />}
                    label={t("staff_ticket_detail.device")}
                    value={assetDisplayName || ticket?.assetId || ""}
                  />
                  <InfoRow
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
                              onPress={() => setActiveImageUrl(img.url)}
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
                  <InfoRow
                    icon={<Icons.event size={18} color={neutral.slate500} />}
                    label={
                      isInspectionSlot
                        ? t("staff_work_slot_detail.inspection_period_label")
                        : t("staff_work_slot_detail.period_start")
                    }
                    value={job?.periodStartDate ? formatYmdStringToDdMmYyyy(job.periodStartDate) : ""}
                  />
                  {isInspectionSlot ? (
                    <InfoRow
                      icon={<Icons.tag size={18} color={neutral.slate500} />}
                      label={t("staff_work_slot_detail.inspection_type_label")}
                      value={getInspectionTypeDisplay(inspectionType, t)}
                    />
                  ) : null}
                  {isInspectionSlot && inspectionNote ? (
                    <InfoRow
                      icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                      label={t("staff_work_slot_detail.inspection_note_label")}
                      value={inspectionNote}
                    />
                  ) : null}
                </>
              )}
              <InfoRow
                icon={<Icons.flag size={18} color={neutral.slate500} />}
                label={isIssueSlot ? t("staff_ticket_detail.status") : t("staff_work_slot_detail.job_status")}
                value={itemStatusLabel}
                isStatus
                statusRaw={isIssueSlot ? ticket?.status ?? slot.status : job?.status ?? slot.status}
              />
              {canShowActions ? (
                <View style={[staffWorkSlotStyles.actionRow, { marginTop: 16 }]}>
                  {isIssueSlot && ticket?.status === "SCHEDULED" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnPrimary, { marginRight: 6 }]}
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
                  {isIssueSlot && ticket?.status === "IN_PROGRESS" ? (
                    issueRepairSubmitted ? (
                      <TouchableOpacity
                        style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                        onPress={handleCompleteIssueWorkSlot}
                        disabled={updateLoading}
                      >
                        {updateLoading ? (
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={staffWorkSlotStyles.actionBtnText}>
                            {t("staff_work_slot_detail.btn_complete")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnPrimary, { marginRight: 6 }]}
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

                  {!isIssueSlot && job?.status === "SCHEDULED" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnPrimary, { marginRight: 6 }]}
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
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={
                        maintenanceSubmitted
                          ? isInspectionSlot
                            ? navigateToInspectionConfirm
                            : handleStartWork
                          : openMaintenanceModal
                      }
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <RefreshLogoInline logoPx={18} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {maintenanceSubmitted
                            ? isInspectionSlot
                              ? t("staff_work_slot_detail.btn_confirm_inspection")
                              : t("staff_work_slot_detail.btn_complete")
                            : t("staff_work_slot_detail.btn_start_update")}
                        </Text>
                      )}
                    </TouchableOpacity>
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
          editorServerImages={editorServerImages}
          editorImagesVersion={editorImagesVersion}
          onDeleteEditorImage={handleDeleteEditorImage}
          editorImageUploading={editorImageUploading}
          editorDeletingImageId={editorDeletingImageId}
          onOpenMaintenanceImageCapture={handleOpenMaintenanceImageCapture}
          onSaveMaintenanceAssetDraft={handleSaveMaintenanceAssetDraft}
          imageCaptureVisible={imageCaptureVisible}
          setImageCaptureVisible={setImageCaptureVisible}
          onEditorImagesPicked={handleEditorImagesPicked}
          activeImageUrl={activeImageUrl}
          setActiveImageUrl={setActiveImageUrl}
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
          editorServerImages={editorServerImages}
          editorImagesVersion={editorImagesVersion}
          onDeleteEditorImage={handleDeleteEditorImage}
          editorImageUploading={editorImageUploading}
          editorDeletingImageId={editorDeletingImageId}
          onOpenMaintenanceImageCapture={handleOpenMaintenanceImageCapture}
          onSaveMaintenanceAssetDraft={handleSaveMaintenanceAssetDraft}
          imageCaptureVisible={imageCaptureVisible}
          setImageCaptureVisible={setImageCaptureVisible}
          onEditorImagesPicked={handleEditorImagesPicked}
          activeImageUrl={activeImageUrl}
          setActiveImageUrl={setActiveImageUrl}
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
          editorServerImages={editorServerImages}
          editorImagesVersion={editorImagesVersion}
          onDeleteEditorImage={handleDeleteEditorImage}
          editorImageUploading={editorImageUploading}
          editorDeletingImageId={editorDeletingImageId}
          onOpenMaintenanceImageCapture={handleOpenMaintenanceImageCapture}
          onSaveMaintenanceAssetDraft={handleSaveMaintenanceAssetDraft}
          imageCaptureVisible={imageCaptureVisible}
          setImageCaptureVisible={setImageCaptureVisible}
          onEditorImagesPicked={handleEditorImagesPicked}
          activeImageUrl={activeImageUrl}
          setActiveImageUrl={setActiveImageUrl}
          hasFloorAreas={hasFloorAreas}
          maintenanceSessionImageCount={maintenanceEditorSessionImageCount}
        />
      )}
    </View>
  );
}

function InfoRow({
  label,
  value,
  mono,
  valueStyle,
  icon,
  isStatus,
  statusRaw,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueStyle?: object;
  icon?: React.ReactNode;
  isStatus?: boolean;
  statusRaw?: string;
}) {
  const colors = isStatus ? getStatusColors(statusRaw) : undefined;
  const valueStyles = isStatus && colors
    ? [staffWorkSlotStyles.statusBadge, staffWorkSlotStyles.statusText, { backgroundColor: colors.bg, color: colors.text }]
    : valueStyle;
  return (
    <View style={staffWorkSlotStyles.row}>
      {icon ? (
        <View style={iconStyles.workSlotRowIconWrap}>{icon}</View>
      ) : null}
      <View style={staffWorkSlotStyles.rowContent}>
        <Text style={staffWorkSlotStyles.label}>{label}</Text>
        <Text
          style={[
            staffWorkSlotStyles.value,
            mono && staffWorkSlotStyles.valueMono,
            valueStyles,
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
