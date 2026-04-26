/**
 * Màn xác nhận cuối kiểm định — gọi PUT /maintenances/inspections/:id/status DONE.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { updateInspectionStatus } from "../../../../shared/services/maintenanceApi";
import { getIssueBanners } from "../../../../shared/services/issuesApi";
import type { IssueBannerFromApi } from "../../../../shared/types/api";
import {
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import Icons from "../../../../shared/theme/icon";
import { SCHEDULE_DATA_KEYS } from "../../hooks/useStaffScheduleData";
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

/** Khoảng hở phía trên bàn phím (px), Android — đồng bộ tenant ticket. */
const ANDROID_KEYBOARD_GAP = 16;

type AndroidScrollOpts = { extraLift?: number };

type RouteProps = RouteProp<RootStackParamList, "InspectionConfirm">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "InspectionConfirm">;

export default function InspectionConfirmScreen() {
  const { t } = useTranslation();
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

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const notesInputRef = useRef<TextInput>(null);
  const lastFocusedInputRef = useRef<React.RefObject<TextInput | null> | null>(null);
  const lastAndroidScrollOptsRef = useRef<AndroidScrollOpts>({});
  const keyboardInsetRef = useRef(0);
  const androidScrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pushInspectionFlowDebugSession();
    return () => {
      popInspectionFlowDebugSession();
    };
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

  const bannerSections = useMemo<DropdownBoxSection[]>(
    () => [
      {
        id: "banner",
        title: t("staff_issue_note.banner_section_title"),
        items: banners.map((bn) => ({
          id: bn.id,
          label: bn.name,
          detail: t("staff_issue_note.banner_price_label", {
            price: String(bn.currentPrice),
          }),
        })),
        selectedId: null,
        selectedIds: selectedBannerIds,
        multiSelect: true,
        showAllOption: true,
        allLabel: t("staff_issue_note.banner_none"),
      },
    ],
    [banners, selectedBannerIds, t]
  );

  const bannerSummary = useMemo(() => {
    if (selectedBannerIds.length === 0) {
      return t("staff_issue_note.banner_none");
    }
    return t("staff_issue_note.banner_selected_summary", {
      count: selectedBannerIds.length,
      subtotal: String(deductionAmount),
    });
  }, [deductionAmount, selectedBannerIds.length, t]);

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

    setSubmitting(true);
    logInspectionDebug("[InspectionConfirm]", "submit DONE", {
      inspectionId,
      deductionAmount,
      photoCount: photoUrls.length,
    });
    try {
      const res = await updateInspectionStatus(inspectionId, "DONE", {
        inspectionNotes: notes.trim(),
        deductionAmount,
        photoUrls,
      });
      if (!res?.success) {
        throw new Error(res?.message || t("staff_work_slot_detail.update_error"));
      }
      const runAfterDoneSuccess = () => {
        navigateCalendarAfterCompletion(null);
        void waitForWorkSlotCompletionSync({
          scheduleSlotId,
          jobId: inspectionId,
          kind: "inspection",
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: SCHEDULE_DATA_KEYS.all });
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

      <WorkSlotImageGalleryModal
        visible={photoGallery != null}
        uris={photoGallery?.uris ?? []}
        initialIndex={photoGallery?.initialIndex ?? 0}
        onClose={() => setPhotoGallery(null)}
      />
    </View>
  );
}
