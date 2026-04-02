/**
 * Màn hình Chi tiết Work Slot của Staff.
 * Hiển thị đầy đủ thông tin work slot và ticket/issue (lấy từ API GET /api/issues/tickets/{ticketId}).
 * ticketId lấy từ work slot API: GET /api/schedules/work_slots/staff/{staffId}.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
import { getJobById, updateJobStatus } from "../../../../shared/services/maintenanceApi";
import { CustomAlert } from "../../../../shared/components/alert";
import type {
  AssetItemFromApi,
  FunctionalAreaFromApi,
  HouseFromApi,
  IssueTicketFromApi,
  JobFromApi,
} from "../../../../shared/types/api";
import Icons from "../../../../shared/theme/icon";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import { staffWorkSlotStyles, STATUS_COLORS } from "./staffWorkSlotStyles";
import { brandPrimary, brandTintBg, neutral } from "../../../../shared/theme/color";
import { formatIsoDueDateVi, formatViTicketCreatedAt } from "../../../../shared/utils";
import { ImageCaptureModal } from "../../../modal/imageCapture/ImageCaptureModal";
import { useHouses } from "../../../../shared/hooks/useHouses";
import { useFunctionalAreasByHouseId } from "../../../../shared/hooks/useHouses";
import {
  getAssetItemsByHouseId,
  getAssetItemById,
  getAssetItemImages,
  deleteAssetItemImage,
  uploadAssetItemImages,
  type AssetItemImageFromApi,
  type AssetItemImageToUpload,
  updateAssetItemsMaintenanceBatch,
} from "../../../../shared/services/assetItemApi";
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
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";

/** Chuẩn hóa status từ BE (trim, uppercase, khoảng trắng → _). */
function normalizeScheduleStatusKey(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Work slot / job status từ API schedules (ISSUE & MAINTENANCE). */
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

type MaintenanceDraft = {
  assetId: string;
  displayName: string;
  floorNo: string | null;
  conditionPercent: number;
  note: string;
  updateAt?: string | null;
};

type WorkSlotDetailRouteProp = RouteProp<RootStackParamList, "WorkSlotDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "WorkSlotDetail">;

export default function WorkSlotDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<WorkSlotDetailRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { slot } = route.params;
  const isIssueSlot = String(slot.task || "").toUpperCase() === "ISSUE";

  const [job, setJob] = useState<JobFromApi | null>(null);
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
  const [maintenanceSubmitted, setMaintenanceSubmitted] = useState(false);
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

  // Danh sách houses từ BE (dùng để map houseId -> tên căn nhà hiển thị cho người dùng).
  const { data: housesResp } = useHouses();
  const houses: HouseFromApi[] = housesResp?.data ?? [];
  const currentHouseId = isIssueSlot ? ticket?.houseId : job?.houseId;
  const currentHouseName = currentHouseId
    ? houses.find((h) => h.id === currentHouseId)?.name ?? currentHouseId
    : "";
  const { data: maintenanceAreasResp } = useFunctionalAreasByHouseId(currentHouseId ?? "");
  const maintenanceAreas = (maintenanceAreasResp?.data ?? []) as FunctionalAreaFromApi[];

  const refetchItem = () => {
    if (!slot.ticketId?.trim()) return;
    if (isIssueSlot) {
      getIssueTicketById(slot.ticketId)
        .then(async (res) => {
          if (!res?.success || !res?.data) return;
          setTicket(res.data);
          setJob(null);
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

    getJobById(slot.ticketId)
      .then((res) => {
        if (!res?.success || !res?.data) return;
        setJob(res.data);
        setTicket(null);
        setAssetDisplayName("");
      })
      .catch(() => {});
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
    const newStatus = current === "IN_PROGRESS" ? "COMPLETED" : "IN_PROGRESS";
    if (newStatus === "IN_PROGRESS" && current !== "SCHEDULED") {
      CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
      return;
    }
    if (newStatus === "COMPLETED" && current !== "IN_PROGRESS") {
      CustomAlert.alert(t("staff_work_slot_detail.cannot_update_status"), "", [{ text: t("common.close") }]);
      return;
    }
    setUpdateLoading(true);
    try {
      await updateJobStatus(job.id, newStatus);
      if (newStatus === "IN_PROGRESS") {
        setMaintenanceSubmitted(false);
        setMaintenanceDrafts({});
      }
      CustomAlert.alert(t("staff_work_slot_detail.update_success"), "", [{ text: t("common.close") }]);
      refetchItem();
    } catch (err) {
      CustomAlert.alert(t("staff_work_slot_detail.update_error"), err instanceof Error ? err.message : "", [{ text: t("common.close") }]);
    } finally {
      setUpdateLoading(false);
    }
  };

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

  const refreshEditorImages = useCallback(async (assetId: string) => {
    const images = await getAssetItemImages(assetId, Date.now());
    const urls = images.map((img) => img.url).filter((url) => url.trim().length > 0);
    setEditorServerImages(images);
    setEditorImageUrls(urls);
    setEditorImagesVersion((v) => v + 1);
    setMaintenanceDrafts((prev) => {
      const draft = prev[assetId];
      if (!draft) return prev;
      return {
        ...prev,
        [assetId]: {
          ...draft,
        },
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!maintenanceEditorVisible || !selectedMaintenanceAssetId) return;
      setMaintenanceEditorLoading(true);
      try {
        const [asset, images] = await Promise.all([
          getAssetItemById(selectedMaintenanceAssetId),
          getAssetItemImages(selectedMaintenanceAssetId, Date.now()),
        ]);
        if (cancelled) return;
        // Ảnh luôn lấy theo API ảnh của thiết bị, không phụ thuộc API chi tiết item.
        setEditorServerImages(images);
        setEditorImageUrls(images.map((img) => img.url).filter((url) => url.trim().length > 0));
        setEditorImagesVersion((v) => v + 1);
        if (!asset) return;
        const existingDraft = maintenanceDrafts[selectedMaintenanceAssetId];
        setEditorConditionPercent(
          String(existingDraft?.conditionPercent ?? asset.conditionPercent ?? "")
        );
        setEditorNote(existingDraft?.note ?? asset.note ?? "");
        setEditorUpdateAt(
          existingDraft?.updateAt ??
            (asset.updateAt
              ? formatViTicketCreatedAt(new Date(asset.updateAt))
              : t("staff_work_slot_detail.maintenance_update_at_empty"))
        );
      } catch {
        if (!cancelled) {
          setEditorConditionPercent("");
          setEditorNote("");
          setEditorUpdateAt(t("staff_work_slot_detail.maintenance_update_at_empty"));
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
  }, [maintenanceEditorVisible, selectedMaintenanceAssetId, maintenanceDrafts, t]);

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
                })),
              });
              if (!res?.success) {
                throw new Error(res?.message || t("staff_work_slot_detail.maintenance_batch_error"));
              }
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
    (isIssueSlot ? getIssueTicketById(slot.ticketId) : getJobById(slot.ticketId))
      .then(async (res) => {
        if (cancelled || !res?.success || !res?.data) return;
        if (isIssueSlot) {
          const issue = res.data as IssueTicketFromApi;
          setTicket(issue);
          setJob(null);
          if (issue.assetId?.trim()) {
            const asset = await getAssetItemById(issue.assetId);
            if (!cancelled) setAssetDisplayName(asset?.displayName ?? issue.assetId);
          } else if (!cancelled) {
            setAssetDisplayName("");
          }
        } else {
          setJob(res.data as JobFromApi);
          setTicket(null);
          setAssetDisplayName("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const status = err?.response?.status;
          const message =
            status === 404
              ? t("staff_work_slot_detail.job_not_found")
              : err instanceof Error
                ? err.message
                : t("staff_work_slot_detail.job_load_error");
          setError(message);
          setTicket(null);
          setJob(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isIssueSlot, slot.ticketId, t]);

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

  const selectedMaintenanceAsset = useMemo(
    () => maintenanceAssetsSorted.find((asset) => asset.id === selectedMaintenanceAssetId) ?? null,
    [maintenanceAssetsSorted, selectedMaintenanceAssetId]
  );

  const uploadEditorImages = useCallback(
    async (files: AssetItemImageToUpload[]) => {
      if (!selectedMaintenanceAssetId || files.length === 0) return;
      setEditorImageUploading(true);
      try {
        await uploadAssetItemImages(selectedMaintenanceAssetId, files);
        await refreshEditorImages(selectedMaintenanceAssetId);
      } finally {
        setEditorImageUploading(false);
      }
    },
    [refreshEditorImages, selectedMaintenanceAssetId]
  );

  const handleEditorImagesPicked = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      const files: AssetItemImageToUpload[] = assets
        .filter((a) => Boolean(a.uri))
        .map((a, idx) => ({
          uri: a.uri as string,
          fileName: a.fileName ?? `maintenance-${selectedMaintenanceAssetId ?? "asset"}-${Date.now()}-${idx}.jpg`,
          mimeType: a.mimeType ?? "image/jpeg",
        }));

      void uploadEditorImages(files).catch((err) => {
        CustomAlert.alert(
          t("common.error"),
          err instanceof Error ? err.message : t("staff_work_slot_detail.maintenance_batch_error"),
          [{ text: t("common.close") }]
        );
      });
    },
    [selectedMaintenanceAssetId, t, uploadEditorImages]
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
      },
    }));
    setMaintenanceEditorVisible(false);
    setSelectedMaintenanceAssetId(null);
  }, [
    editorConditionPercent,
    editorDeletingImageId,
    editorImageUploading,
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

  useFocusEffect(
    useCallback(() => {
      refetchItem();
      return undefined;
    }, [slot.ticketId, isIssueSlot])
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
            <View style={staffWorkSlotStyles.loadingWrap}>
              <ActivityIndicator size="large" color={brandPrimary} />
              <Text style={staffWorkSlotStyles.loadingText}>{t("common.loading")}</Text>
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
                    value={ticket?.createdAt ? formatViTicketCreatedAt(new Date(ticket.createdAt)) : ""}
                  />

                  <View style={{ marginTop: 6 }}>
                    <Text style={staffWorkSlotStyles.imageSectionTitle}>
                      {t("staff_ticket_detail.images_label")}
                    </Text>
                    {ticketImagesLoading ? (
                      <View style={staffWorkSlotStyles.imageLoadingRow}>
                        <ActivityIndicator size="small" color={neutral.iconMuted} />
                        <Text style={staffWorkSlotStyles.imageEmptyText}>{t("common.loading")}</Text>
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
                  <InfoRow icon={<Icons.event size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.period_start")} value={job?.periodStartDate ?? ""} />
                  <InfoRow icon={<Icons.calendar size={18} color={neutral.slate500} />} label={t("staff_work_slot_detail.due_date")} value={job?.dueDate ? formatIsoDueDateVi(job.dueDate) : ""} />
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
                        <ActivityIndicator size="small" color={neutral.surface} />
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
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={() => {
                        if (isIssueSlot && ticket?.id && ticket.houseId && ticket.assetId) {
                          navigation.navigate("StaffIssueNote", {
                            issueId: ticket.id,
                            houseId: ticket.houseId,
                            assetId: ticket.assetId,
                          });
                          return;
                        }
                        if (isIssueSlot) {
                          CustomAlert.alert(
                            t("common.error"),
                            "Thiếu thông tin issue để ghi nhận sửa chữa.",
                            [{ text: t("common.close") }]
                          );
                          return;
                        }
                        void handleStartWork();
                      }}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color={neutral.surface} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {isIssueSlot ? "Đang sửa chữa" : t("staff_work_slot_detail.btn_complete")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {!isIssueSlot && job?.status === "SCHEDULED" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnPrimary, { marginRight: 6 }]}
                      onPress={handleStartWork}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color={neutral.surface} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {t("staff_work_slot_detail.btn_start_maintenance")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {!isIssueSlot && job?.status === "IN_PROGRESS" ? (
                    <TouchableOpacity
                      style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                      onPress={maintenanceSubmitted ? handleStartWork : openMaintenanceModal}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color={neutral.surface} />
                      ) : (
                        <Text style={staffWorkSlotStyles.actionBtnText}>
                          {maintenanceSubmitted
                            ? t("staff_work_slot_detail.btn_complete")
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

      <Modal
        visible={maintenanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMaintenanceModal}
      >
        <View style={staffWorkSlotStyles.maintenanceModalBackdrop}>
          <View style={staffWorkSlotStyles.maintenanceModalCard}>
            <View style={staffWorkSlotStyles.maintenanceModalHeader}>
              <Text style={staffWorkSlotStyles.maintenanceModalTitle}>
                {t("staff_work_slot_detail.maintenance_modal_title")}
              </Text>
              <TouchableOpacity
                style={staffWorkSlotStyles.maintenanceCloseBtn}
                onPress={closeMaintenanceModal}
                activeOpacity={0.85}
                disabled={maintenanceSubmitting}
              >
                <Text style={staffWorkSlotStyles.maintenanceCloseBtnText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={staffWorkSlotStyles.maintenanceModalSubtitle}>
              {t("staff_work_slot_detail.maintenance_modal_subtitle", {
                houseName: currentHouseName || "",
              })}
            </Text>

            {maintenanceFloorOptions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={staffWorkSlotStyles.floorSortScroll}
                contentContainerStyle={staffWorkSlotStyles.floorSortContent}
              >
                <TouchableOpacity
                  style={[
                    staffWorkSlotStyles.floorChip,
                    maintenanceSortFloor == null && staffWorkSlotStyles.floorChipSelected,
                  ]}
                  onPress={() => setMaintenanceSortFloor(null)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      staffWorkSlotStyles.floorChipText,
                      maintenanceSortFloor == null && staffWorkSlotStyles.floorChipTextSelected,
                    ]}
                  >
                    {t("staff_work_slot_detail.maintenance_floor_all")}
                  </Text>
                </TouchableOpacity>
                {maintenanceFloorOptions.map((floor) => {
                  const selected = maintenanceSortFloor === floor;
                  return (
                    <TouchableOpacity
                      key={floor}
                      style={[
                        staffWorkSlotStyles.floorChip,
                        selected && staffWorkSlotStyles.floorChipSelected,
                      ]}
                      onPress={() => setMaintenanceSortFloor(floor)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          staffWorkSlotStyles.floorChipText,
                          selected && staffWorkSlotStyles.floorChipTextSelected,
                        ]}
                      >
                        {t("staff_work_slot_detail.maintenance_floor_label", { floor })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {maintenanceAssetsLoading ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={brandPrimary} />
                <Text style={[staffWorkSlotStyles.maintenanceHintText, { marginTop: 8 }]}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : maintenanceAssetSection ? (
              <DropdownBox
                sections={[maintenanceAssetSection]}
                summary={maintenanceAssetSummary}
                onSelect={handleMaintenanceAssetSelect}
                itemLayout="list"
                searchAutoFocus={false}
              />
            ) : (
              <View style={staffWorkSlotStyles.maintenanceHintCard}>
                <Text style={staffWorkSlotStyles.maintenanceHintText}>
                  {t("staff_work_slot_detail.maintenance_assets_empty")}
                </Text>
              </View>
            )}

            <Text style={staffWorkSlotStyles.maintenanceDraftTitle}>
              {t("staff_work_slot_detail.maintenance_draft_title", {
                count: Object.keys(maintenanceDrafts).length,
              })}
            </Text>
            <ScrollView style={staffWorkSlotStyles.maintenanceDraftList}>
              {Object.values(maintenanceDrafts).length === 0 ? (
                <Text style={staffWorkSlotStyles.maintenanceHintText}>
                  {t("staff_work_slot_detail.maintenance_draft_empty")}
                </Text>
              ) : (
                Object.values(maintenanceDrafts).map((draft) => (
                  <View key={draft.assetId} style={staffWorkSlotStyles.maintenanceDraftRow}>
                    <Text style={staffWorkSlotStyles.maintenanceDraftName}>{draft.displayName}</Text>
                    <Text style={staffWorkSlotStyles.maintenanceDraftMeta}>
                      {hasFloorAreas && draft.floorNo
                        ? `${t("staff_work_slot_detail.maintenance_floor_label", { floor: draft.floorNo })} · `
                        : ""}
                      {t("staff_work_slot_detail.maintenance_condition_label")} {draft.conditionPercent}%
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={staffWorkSlotStyles.maintenanceActionsRow}>
              <TouchableOpacity
                style={staffWorkSlotStyles.maintenanceSecondaryBtn}
                onPress={closeMaintenanceModal}
                activeOpacity={0.85}
                disabled={maintenanceSubmitting}
              >
                <Text style={staffWorkSlotStyles.maintenanceSecondaryBtnText}>
                  {t("profile.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  staffWorkSlotStyles.maintenanceSubmitBtn,
                  (maintenanceSubmitting || Object.keys(maintenanceDrafts).length === 0)
                    && staffWorkSlotStyles.maintenanceSubmitBtnDisabled,
                ]}
                onPress={handleSubmitMaintenanceBatch}
                activeOpacity={0.85}
                disabled={maintenanceSubmitting || Object.keys(maintenanceDrafts).length === 0}
              >
                {maintenanceSubmitting ? (
                  <ActivityIndicator size="small" color={neutral.surface} />
                ) : (
                  <Text style={staffWorkSlotStyles.maintenanceSubmitBtnText}>
                    {t("staff_work_slot_detail.maintenance_submit_btn")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={maintenanceEditorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMaintenanceEditorVisible(false)}
      >
        <View style={staffWorkSlotStyles.editAssetModalBackdrop}>
          <View style={staffWorkSlotStyles.editAssetModalCard}>
            <View style={staffWorkSlotStyles.maintenanceModalHeader}>
              <Text style={staffWorkSlotStyles.maintenanceModalTitle}>
                {t("staff_work_slot_detail.maintenance_edit_title")}
              </Text>
              <TouchableOpacity
                style={staffWorkSlotStyles.maintenanceCloseBtn}
                onPress={() => setMaintenanceEditorVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={staffWorkSlotStyles.maintenanceCloseBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            {maintenanceEditorLoading ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={brandPrimary} />
                <Text style={[staffWorkSlotStyles.maintenanceHintText, { marginTop: 8 }]}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={staffWorkSlotStyles.editAssetFieldLabel}>
                  {t("staff_issue_note.device_label")}
                </Text>
                <TextInput
                  style={[staffWorkSlotStyles.editAssetInput, staffWorkSlotStyles.editAssetReadonly]}
                  editable={false}
                  value={selectedMaintenanceAsset?.displayName ?? ""}
                />

                <Text style={staffWorkSlotStyles.editAssetFieldLabel}>
                  {t("staff_work_slot_detail.maintenance_condition_label")}
                </Text>
                <TextInput
                  style={staffWorkSlotStyles.editAssetInput}
                  value={editorConditionPercent}
                  onChangeText={setEditorConditionPercent}
                  keyboardType="number-pad"
                  placeholder="0-100"
                  placeholderTextColor={neutral.slate400}
                />

                <Text style={staffWorkSlotStyles.editAssetFieldLabel}>
                  {t("staff_issue_note.notes_label")}
                </Text>
                <TextInput
                  style={[staffWorkSlotStyles.editAssetInput, staffWorkSlotStyles.editAssetNoteInput]}
                  value={editorNote}
                  onChangeText={setEditorNote}
                  multiline
                  textAlignVertical="top"
                  placeholder={t("staff_work_slot_detail.maintenance_note_placeholder")}
                  placeholderTextColor={neutral.slate400}
                />

                <Text style={staffWorkSlotStyles.editAssetFieldLabel}>
                  {t("staff_work_slot_detail.maintenance_update_at_label")}
                </Text>
                <TextInput
                  style={[staffWorkSlotStyles.editAssetInput, staffWorkSlotStyles.editAssetReadonly]}
                  editable={false}
                  value={editorUpdateAt}
                />

                <Text style={staffWorkSlotStyles.editAssetFieldLabel}>
                  {t("staff_work_slot_detail.maintenance_images_label")}
                </Text>
                {editorServerImages.length === 0 ? (
                  <Text style={[staffWorkSlotStyles.maintenanceHintText, { marginBottom: 8 }]}>
                    {t("staff_ticket_detail.images_empty")}
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={staffWorkSlotStyles.ticketImagesScroll}
                    contentContainerStyle={staffWorkSlotStyles.ticketImagesStrip}
                  >
                    {editorServerImages.map((img) => (
                      <View
                        key={img.id}
                        style={[
                          staffWorkSlotStyles.ticketImageThumb,
                          staffWorkSlotStyles.ticketImageThumbHorizontal,
                          staffWorkSlotStyles.maintenanceImageThumbWrap,
                        ]}
                      >
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          activeOpacity={0.85}
                          onPress={() => setActiveImageUrl(img.url)}
                        >
                          <Image
                            source={{
                              uri: `${img.url}${img.url.includes("?") ? "&" : "?"}t=${editorImagesVersion}`,
                            }}
                            style={staffWorkSlotStyles.ticketImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={staffWorkSlotStyles.maintenanceImageDeleteBtn}
                          onPress={() => void handleDeleteEditorImage(img.id)}
                          activeOpacity={0.85}
                          disabled={editorImageUploading || editorDeletingImageId === img.id}
                        >
                          {editorDeletingImageId === img.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={staffWorkSlotStyles.maintenanceImageDeleteBtnText}>×</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <View style={staffWorkSlotStyles.maintenanceActionsRow}>
                  <TouchableOpacity
                    style={staffWorkSlotStyles.maintenanceSecondaryBtn}
                    onPress={() => setImageCaptureVisible(true)}
                    activeOpacity={0.85}
                    disabled={editorImageUploading || editorDeletingImageId != null}
                  >
                    <Text style={staffWorkSlotStyles.maintenanceSecondaryBtnText}>
                      {t("staff_item_create.images_camera")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={staffWorkSlotStyles.maintenanceActionsRow}>
                  <TouchableOpacity
                    style={staffWorkSlotStyles.maintenanceSecondaryBtn}
                    onPress={() => setMaintenanceEditorVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={staffWorkSlotStyles.maintenanceSecondaryBtnText}>
                      {t("profile.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={staffWorkSlotStyles.maintenanceSubmitBtn}
                    onPress={() => void handleSaveMaintenanceAssetDraft()}
                    activeOpacity={0.85}
                    disabled={editorImageUploading || editorDeletingImageId != null}
                  >
                    <Text style={staffWorkSlotStyles.maintenanceSubmitBtnText}>
                      {t("common.save")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageUrl(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={staffWorkSlotStyles.imageModalBackdrop}
          onPress={() => setActiveImageUrl(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => {
              e.stopPropagation();
            }}
            style={staffWorkSlotStyles.imageModalContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={staffWorkSlotStyles.imageModalClose}
              onPress={() => setActiveImageUrl(null)}
            >
              <Text style={staffWorkSlotStyles.imageModalCloseText}>×</Text>
            </TouchableOpacity>

            {activeImageUrl && (
              <Image
                source={{ uri: activeImageUrl }}
                style={staffWorkSlotStyles.imageModalImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ImageCaptureModal
        visible={imageCaptureVisible}
        onClose={() => setImageCaptureVisible(false)}
        onPicked={handleEditorImagesPicked}
        libraryLabel={t("staff_item_create.images_library")}
      />
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
