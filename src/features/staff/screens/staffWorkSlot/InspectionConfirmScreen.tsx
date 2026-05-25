/**
 * Màn xác nhận cuối kiểm định — gọi PUT /maintenances/inspections/:id/status DONE.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "../../../../shared/types";
import { CustomAlert } from "../../../../shared/components/alert";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
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
import {
  getInspectionById,
  updateInspectionStatus,
  uploadInspectionHousePhotos,
} from "../../../../shared/services/maintenanceApi";
import { getIssueBanners } from "../../../../shared/services/issuesApi";
import type { IssueBannerFromApi } from "../../../../shared/types/api";
import {
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import Icons from "../../../../shared/theme/icon";
import { ImageCaptureModal } from "../../../modal/imageCapture/ImageCaptureModal";
import { invalidateStaffStatusCaches } from "../../hooks/useStaffScheduleData";
import { getStaffIdForSchedule } from "../../../../shared/services/scheduleApi";
import { isoLocalDateToYmd, waitForWorkSlotCompletionSync } from "../../utils/workSlotCompletionSync";
import {
  logInspectionDebug,
  logInspectionError,
  popInspectionFlowDebugSession,
  pushInspectionFlowDebugSession,
} from "../../../../shared/utils/inspectionDebugLog";
import { useKeyboardBottomInset } from "../../../../shared/hooks/useKeyboardBottomInset";
import { WorkSlotImageGalleryModal } from "./WorkSlotImageGalleryModal";
import { inspectionConfirmStyles as styles } from "./inspectionConfirmStyles";
import { formatVndDisplay, intlNumberLocaleForMoney } from "../../../../shared/utils";

/** Khoảng hở phía trên bàn phím (px), Android — đồng bộ tenant ticket. */
const ANDROID_KEYBOARD_GAP = 16;
/** Giới hạn ảnh chụp căn nhà — đồng bộ với ảnh asset thiết bị. */
const MAX_HOUSE_PHOTOS = 5;

type AndroidScrollOpts = { extraLift?: number };

type RouteProps = RouteProp<RootStackParamList, "InspectionConfirm">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "InspectionConfirm">;

export default function InspectionConfirmScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const {
    inspectionId,
    inspectionType,
    photoUrls,
    scheduleSlotId,
    slotDate,
    houseName,
  } = route.params;

  /** Mốc thời gian render đầu tiên — đo từ đây đến khi ảnh nhà hiển thị xong. */
  const screenMountAtRef = useRef(Date.now());

  const isCheckIn = inspectionType === "CHECK_IN";

  const [notes, setNotes] = useState(
    isCheckIn
      ? t("staff_inspection_confirm.default_notes_check_in")
      : t("staff_inspection_confirm.default_notes_check_out_ok")
  );
  const [hasDamage, setHasDamage] = useState(false);
  const [banners, setBanners] = useState<IssueBannerFromApi[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photoGallery, setPhotoGallery] = useState<{
    uris: string[];
    initialIndex: number;
  } | null>(null);
  const keyboardInset = useKeyboardBottomInset();

  /** Ảnh nhà đã có trên server (load từ GET inspectionById lúc mount). */
  const [housePhotos, setHousePhotos] = useState<string[]>([]);
  /**
   * Ảnh nhà mới chụp/chọn trong phiên này — lưu local URI, chưa lên S3.
   * Upload batch lên S3 ngầm SAU KHI updateInspectionStatus thành công.
   */
  const [localHousePhotos, setLocalHousePhotos] = useState<string[]>([]);
  const [housePhotoCaptureVisible, setHousePhotoCaptureVisible] = useState(false);
  /** Ảnh đang chụp trong phiên modal camera (tích lũy, chưa commit vào localHousePhotos). */
  const [pendingCameraUris, setPendingCameraUris] = useState<string[]>([]);
  const pendingCameraUrisRef = useRef<string[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const notesInputRef = useRef<TextInput>(null);
  const lastFocusedInputRef = useRef<React.RefObject<TextInput | null> | null>(null);
  const lastAndroidScrollOptsRef = useRef<AndroidScrollOpts>({});
  const keyboardInsetRef = useRef(0);
  const androidScrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pushInspectionFlowDebugSession();
    logInspectionDebug(
      "[InspectionConfirm]",
      `▶ Mount màn hình | inspectionId=${inspectionId} | type=${inspectionType} | sessionPhotos=${photoUrls.length} | elapsed=${Date.now() - screenMountAtRef.current}ms từ render đầu`,
    );
    return () => {
      popInspectionFlowDebugSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    keyboardInsetRef.current = keyboardInset;
  }, [keyboardInset]);

  const scrollAndroidFieldIntoView = (
    inputRef: React.RefObject<TextInput | null>,
    opts?: AndroidScrollOpts
  ) => {
    if (Platform.OS !== "android") return;
    const inset = keyboardInsetRef.current;
    if (inset <= 0) return;
    const winH = Dimensions.get("window").height;
    const extraLift = opts?.extraLift ?? 0;
    const visibleBottom = winH - inset - ANDROID_KEYBOARD_GAP;
    inputRef.current?.measureInWindow((x, y, w, h) => {
      const inputBottom = y + h;
      if (inputBottom > visibleBottom - extraLift) {
        const dy = inputBottom - visibleBottom + extraLift + 8;
        scrollRef.current?.scrollTo({ y: scrollYRef.current + dy, animated: true });
      }
    });
  };

  const scheduleAndroidScrollOnFocus = (
    inputRef: React.RefObject<TextInput | null>,
    opts?: AndroidScrollOpts
  ) => {
    if (Platform.OS !== "android") return;
    lastFocusedInputRef.current = inputRef;
    lastAndroidScrollOptsRef.current = opts ?? {};
    if (keyboardInsetRef.current > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() =>
          scrollAndroidFieldIntoView(inputRef, lastAndroidScrollOptsRef.current)
        );
      });
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android" || keyboardInset <= 0) return;
    if (androidScrollDebounceRef.current) clearTimeout(androidScrollDebounceRef.current);
    androidScrollDebounceRef.current = setTimeout(() => {
      androidScrollDebounceRef.current = null;
      const r = lastFocusedInputRef.current;
      if (r) {
        requestAnimationFrame(() => {
          scrollAndroidFieldIntoView(r, lastAndroidScrollOptsRef.current);
        });
      }
    }, 100);
    return () => {
      if (androidScrollDebounceRef.current) clearTimeout(androidScrollDebounceRef.current);
    };
  }, [keyboardInset]);

  useEffect(() => {
    let cancelled = false;
    const t0 = Date.now();
    const elapsed = () =>
      `+${Date.now() - screenMountAtRef.current}ms từ mount, +${Date.now() - t0}ms từ effect`;
    logInspectionDebug(
      "[InspectionConfirm]",
      `  → GET inspectionById bắt đầu (tải ảnh nhà): ${elapsed()}`,
    );
    getInspectionById(inspectionId)
      .then((res) => {
        if (cancelled) return;
        const ok = Boolean(res?.success && res?.data);
        const photoCount = Array.isArray(res?.data?.housePhotoUrls)
          ? res.data!.housePhotoUrls.length
          : 0;
        logInspectionDebug(
          "[InspectionConfirm]",
          `  → GET inspectionById xong: ${elapsed()} | success=${ok} | housePhotoUrls=${photoCount}`,
        );
        if (!ok) return;
        const urls = Array.isArray(res.data!.housePhotoUrls)
          ? res.data!.housePhotoUrls.filter(
              (u): u is string => typeof u === "string" && u.trim().length > 0,
            )
          : [];
        setHousePhotos(urls);
        logInspectionDebug(
          "[InspectionConfirm]",
          `✅ setHousePhotos xong: ${elapsed()} | hiển thị ${urls.length} ảnh`,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        logInspectionError(
          "[InspectionConfirm]",
          `  → GET inspectionById lỗi: ${elapsed()}`,
          err,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  /**
   * Upload ảnh nhà lên S3 sau khi inspection đã DONE — chạy hoàn toàn ngầm,
   * không block UI, không hiện loading, lỗi silent (inspection đã xác nhận rồi).
   */
  const uploadHousePhotosInBackground = useCallback(
    async (uris: string[]) => {
      if (!uris.length) return;
      const files = uris.map((uri, idx) => ({
        uri,
        fileName:
          uri.split("/").filter(Boolean).pop() ||
          `house-${Date.now()}-${idx}.jpg`,
        mimeType: "image/jpeg",
      }));
      try {
        await uploadInspectionHousePhotos(inspectionId, files);
      } catch {
        // silent — inspection đã DONE, ảnh nhà là dữ liệu phụ trợ
      }
    },
    [inspectionId],
  );

  /**
   * Callback từ ImageCaptureModal.
   * - Camera: tích lũy URI tạm vào ref/state, giữ modal mở để chụp tiếp.
   *   Commit vào localHousePhotos khi user bấm đóng modal.
   * - Library: thêm URI vào localHousePhotos ngay (hiện ảnh tức thì, không upload).
   */
  const handleHousePhotosPicked = useCallback(
    (assets: ImagePicker.ImagePickerAsset[], source: "camera" | "library") => {
      if (!assets?.length) return;

      if (source === "camera") {
        // Giữ modal mở, chỉ tích lũy URI tạm
        const newUris = assets.map((a) => a.uri);
        const merged = [...pendingCameraUrisRef.current, ...newUris];
        pendingCameraUrisRef.current = merged;
        setPendingCameraUris([...merged]);
        return;
      }

      // Library: lưu local URI ngay, upload sẽ chạy ngầm sau khi submit
      const newUris = assets.map((a) => a.uri);
      setLocalHousePhotos((prev) => [...prev, ...newUris]);
    },
    [],
  );

  /**
   * Đóng modal camera và upload batch ảnh đã chụp tích lũy (nếu có).
   * Cũng được gọi bởi ImageCaptureModal trước khi mở thư viện (library flow).
   */
  const handleHousePhotoCaptureClose = useCallback(() => {
    setHousePhotoCaptureVisible(false);
    const pending = pendingCameraUrisRef.current;
    pendingCameraUrisRef.current = [];
    setPendingCameraUris([]);
    if (!pending.length) return;
    // Commit ảnh camera vào localHousePhotos — hiện ngay, upload ngầm sau submit
    setLocalHousePhotos((prev) => [...prev, ...pending]);
  }, []);

  useEffect(() => {
    if (isCheckIn) return;
    let cancelled = false;
    setBannerLoading(true);
    getIssueBanners()
      .then((list) => {
        if (!cancelled) setBanners(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      })
      .finally(() => {
        if (!cancelled) setBannerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCheckIn]);

  useEffect(() => {
    if (isCheckIn) return;
    if (!hasDamage) {
      setNotes(t("staff_inspection_confirm.default_notes_check_out_ok"));
      setSelectedBannerIds([]);
    } else {
      setNotes("");
    }
  }, [hasDamage, isCheckIn, t]);

  const deductionAmount = useMemo(() => {
    if (isCheckIn || !hasDamage) return 0;
    return selectedBannerIds.reduce((sum, id) => {
      const b = banners.find((x) => x.id === id);
      const n = Number(b?.currentPrice);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [banners, hasDamage, isCheckIn, selectedBannerIds]);

  const moneyIntlLocale = useMemo(
    () => intlNumberLocaleForMoney(i18n.language),
    [i18n.language]
  );

  /** Giá banner trong dropdown kiểm định — đồng bộ format VND với màn ghi chú sửa chữa. */
  const formatQuoteMoney = useCallback(
    (amount: number | string | null | undefined) => formatVndDisplay(amount, moneyIntlLocale, t),
    [moneyIntlLocale, t]
  );

  const bannerSections = useMemo<DropdownBoxSection[]>(
    () => [
      {
        id: "banner",
        title: t("staff_issue_note.banner_section_title"),
        items: banners.map((bn) => ({
          id: bn.id,
          label: bn.name,
          detail: t("staff_issue_note.banner_price_label", {
            price: formatQuoteMoney(bn.currentPrice),
          }),
        })),
        selectedId: null,
        selectedIds: selectedBannerIds,
        multiSelect: true,
        showAllOption: true,
        allLabel: t("staff_issue_note.banner_none"),
      },
    ],
    [banners, formatQuoteMoney, selectedBannerIds, t]
  );

  const bannerSummary = useMemo(() => {
    if (selectedBannerIds.length === 0) {
      return t("staff_issue_note.banner_none");
    }
    return t("staff_issue_note.banner_selected_summary", {
      count: selectedBannerIds.length,
      subtotal: formatQuoteMoney(deductionAmount),
    });
  }, [deductionAmount, formatQuoteMoney, selectedBannerIds.length, t]);

  const navigateCalendarAfterCompletion = (startTimeIso: string | null) => {
    let ymd: string | null = startTimeIso ? isoLocalDateToYmd(startTimeIso) : null;
    if (!ymd) {
      const parts = slotDate.split("/");
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
      params: ymd ? { focusDateYmd: ymd, focusWorkSlotId: scheduleSlotId } : { focusWorkSlotId: scheduleSlotId },
    });
  };

  const handleSubmit = async () => {
    if (!isCheckIn && hasDamage && selectedBannerIds.length === 0) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_inspection_confirm.error_select_banner"),
        [{ text: t("common.close") }]
      );
      return;
    }
    if (!isCheckIn && hasDamage && !notes.trim()) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_inspection_confirm.error_notes_damage"),
        [{ text: t("common.close") }]
      );
      return;
    }
    if (housePhotos.length + localHousePhotos.length === 0) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_inspection_confirm.error_no_house_photo"),
        [{ text: t("common.close") }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateInspectionStatus(inspectionId, "DONE", {
        inspectionNotes: notes.trim(),
        deductionAmount,
        photoUrls,
      });
      if (!res?.success) {
        throw new Error(res?.message || t("staff_work_slot_detail.update_error"));
      }
      // Upload ảnh nhà lên S3 ngầm sau khi đã xác nhận thành công — không block popup
      void uploadHousePhotosInBackground(localHousePhotos);
      const runAfterDoneSuccess = () => {
        navigateCalendarAfterCompletion(null);
        void waitForWorkSlotCompletionSync({
          scheduleSlotId,
          jobId: inspectionId,
          kind: "inspection",
        }).then(async () => {
          const staffId = getStaffIdForSchedule();
          if (staffId) {
            await invalidateStaffStatusCaches(queryClient, { staffId });
          }
        });
      };
      CustomAlert.alert(
        t("common.success"),
        isCheckIn
          ? t("staff_inspection_confirm.check_in_success")
          : t("staff_inspection_confirm.check_out_success"),
        [{ text: t("common.close"), onPress: runAfterDoneSuccess }],
        { type: "success" }
      );
    } catch (e: unknown) {
      logInspectionError("[InspectionConfirm]", "submit failed", e);
      CustomAlert.alert(
        t("staff_work_slot_detail.update_error"),
        e instanceof Error ? e.message : "",
        [{ text: t("common.close") }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
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
              {t("staff_inspection_confirm.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom:
                24 +
                insets.bottom +
                (Platform.OS === "android" ? keyboardInset : 0),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.cardFieldLabel}>{t("staff_inspection_confirm.house_label")}</Text>
            <View style={styles.houseRow}>
              <Icons.home size={18} color={neutral.slate500} />
              <Text style={styles.houseValue} numberOfLines={2}>
                {houseName?.trim()
                  ? houseName
                  : t("staff_inspection_confirm.house_placeholder")}
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.cardFieldLabel}>{t("staff_inspection_confirm.photos_label")}</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.photoRow}
              contentContainerStyle={styles.photoRowContent}
            >
              {photoUrls.length === 0 ? (
                <Text style={styles.muted}>{t("staff_inspection_confirm.no_photos")}</Text>
              ) : (
                photoUrls.map((uri, index) => (
                  <TouchableOpacity
                    key={`${index}-${uri}`}
                    activeOpacity={0.85}
                    onPress={() => setPhotoGallery({ uris: photoUrls, initialIndex: index })}
                    style={styles.thumbWrap}
                  >
                    <Image source={{ uri }} style={styles.thumb} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.cardFieldLabel}>
              {t("staff_inspection_confirm.house_photos_label")}
            </Text>
            {(() => {
              // Tổng ảnh hiển thị: server + local phiên này + đang chụp trong modal
              const allUris = [...housePhotos, ...localHousePhotos];
              const totalCount = allUris.length + pendingCameraUris.length;
              return (
                <>
                  {totalCount === 0 ? (
                    <Text style={styles.muted}>
                      {t("staff_inspection_confirm.house_photos_empty_hint")}
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      style={styles.photoRow}
                      contentContainerStyle={styles.photoRowContent}
                    >
                      {allUris.map((uri, index) => (
                        <TouchableOpacity
                          key={uri}
                          activeOpacity={0.85}
                          onPress={() => setPhotoGallery({ uris: allUris, initialIndex: index })}
                          style={styles.thumbWrap}
                        >
                          <Image source={{ uri }} style={styles.thumb} />
                        </TouchableOpacity>
                      ))}
                      {/* Ảnh đang chụp trong modal camera — mờ chờ đóng modal */}
                      {pendingCameraUris.map((uri) => (
                        <View key={uri} style={[styles.thumbWrap, { opacity: 0.5 }]}>
                          <Image source={{ uri }} style={styles.thumb} />
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.housePhotoBtn,
                      (submitting || totalCount >= MAX_HOUSE_PHOTOS) &&
                        styles.submitBtnDisabled,
                    ]}
                    onPress={() => setHousePhotoCaptureVisible(true)}
                    disabled={submitting || totalCount >= MAX_HOUSE_PHOTOS}
                    activeOpacity={0.85}
                  >
                    <Icons.camera size={20} color={brandPrimary} />
                    <Text style={styles.housePhotoBtnText}>
                      {totalCount >= MAX_HOUSE_PHOTOS
                        ? t("staff_inspection_confirm.house_photos_limit_reached", {
                            max: MAX_HOUSE_PHOTOS,
                          })
                        : t("staff_inspection_confirm.house_photos_add")}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>

          {!isCheckIn ? (
            <View style={styles.sectionCard}>
              <View style={styles.damageRow}>
                <Text style={styles.cardFieldLabelInline}>{t("staff_inspection_confirm.has_damage")}</Text>
                <Switch
                  value={hasDamage}
                  onValueChange={setHasDamage}
                  trackColor={{ true: brandPrimary, false: neutral.slate300 }}
                />
              </View>

              {hasDamage && bannerLoading ? (
                <View style={styles.bannerLoading}>
                  <RefreshLogoInline logoPx={22} />
                </View>
              ) : null}

              {hasDamage && !bannerLoading ? (
                <View style={styles.bannerBox}>
                  <DropdownBox
                    sections={bannerSections}
                    summary={bannerSummary}
                    onMultiSelectCommit={(sectionId, ids) => {
                      if (sectionId === "banner") setSelectedBannerIds(ids);
                    }}
                    itemLayout="list"
                    searchAutoFocus={false}
                    keyboardVerticalOffset={insets.top + 52}
                  />
                </View>
              ) : null}

              <Text style={styles.deduction}>
                {t("staff_inspection_confirm.deduction_label")}: {deductionAmount}
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.cardFieldLabel}>{t("staff_inspection_confirm.notes_label")}</Text>
            <TextInput
              ref={notesInputRef}
              style={[styles.notesInput, styles.notes]}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
              placeholder={t("staff_inspection_confirm.notes_placeholder")}
              placeholderTextColor={neutral.slate400}
              onFocus={() => scheduleAndroidScrollOnFocus(notesInputRef)}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <RefreshLogoInline logoPx={20} />
            ) : (
              <Text style={styles.submitBtnText}>{t("staff_inspection_confirm.submit")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ImageCaptureModal
        visible={housePhotoCaptureVisible}
        onClose={handleHousePhotoCaptureClose}
        onPicked={handleHousePhotosPicked}
        cameraShotsRemaining={
          MAX_HOUSE_PHOTOS - housePhotos.length - pendingCameraUris.length
        }
        librarySelectionLimit={
          MAX_HOUSE_PHOTOS - housePhotos.length - pendingCameraUris.length
        }
        maxImagesForAlert={MAX_HOUSE_PHOTOS}
      />

      <WorkSlotImageGalleryModal
        visible={photoGallery != null}
        uris={photoGallery?.uris ?? []}
        initialIndex={photoGallery?.initialIndex ?? 0}
        onClose={() => setPhotoGallery(null)}
      />
    </View>
  );
}
