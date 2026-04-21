/**
 * Màn hình Tạo danh mục thiết bị (Staff).
 * POST body: `name` / `description` object (vi, en, ja + Swagger slot), `compensationPercent`.
 * Toggle auto đa ngôn ngữ giống ItemCreate: AUTO = tên + mô tả; MANUAL = pager VI/EN/JA (tên + mô tả), slide có padding ngang để tách nhẹ.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  FlatList,
  useWindowDimensions,
  InteractionManager,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
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
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
import { CustomAlert } from "../../../../shared/components/alert";
import { useCreateAssetCategory } from "../../../../shared/hooks/useAssetCategories";
import { useKeyboardBottomInset } from "../../../../shared/hooks/useKeyboardBottomInset";
import {
  buildAssetCategoryLocalizedPayloadFromManual,
  buildAssetCategoryLocalizedPayloadFromSingle,
} from "../../../../shared/utils/resolveLocalizedJsonString";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import { categoryScreenStyles } from "./categoryScreenStyles";
import { itemScreenStyles } from "../staffItems/itemScreenStyles";

type CategoryNavProp = NativeStackNavigationProp<RootStackParamList, "Category">;

const MANUAL_LOCALE_SLIDES = ["vi", "en", "ja"] as const;
type ManualSlideKey = (typeof MANUAL_LOCALE_SLIDES)[number];
const MANUAL_LOCALE_PAGER_DATA: ManualSlideKey[] = [...MANUAL_LOCALE_SLIDES];

const MANUAL_FORM_HORIZONTAL_GUTTER = 76;
/** Khoảng trống hai bên mỗi slide (visual tách slide). */
const MANUAL_SLIDE_INNER_PAD_H = 12;
/** Pager: tiêu đề + gợi ý + tên + mô tả (multiline) — không dôi quá nhiều khoảng trống dưới */
const MANUAL_LOCALE_PAGER_HEIGHT = 328;
/** Ước lượng chiều cao header (back + title) để KeyboardAvoidingView khỏi che form */
const CATEGORY_HEADER_KEYBOARD_OFFSET = 56;
/** Đệm thêm khi IME mở để cuộn được đủ (tránh ô % / nút gửi vẫn nằm sau bàn phím). */
const KEYBOARD_SCROLL_EXTRA_PAD = 72;

export default function CategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardBottomInset = useKeyboardBottomInset();
  const navigation = useNavigation<CategoryNavProp>();
  const { width: windowWidth } = useWindowDimensions();
  const manualFormPageWidth = Math.max(200, windowWidth - MANUAL_FORM_HORIZONTAL_GUTTER);

  const manualLocalesListRef = useRef<FlatList<ManualSlideKey>>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const [manualLocalePageIndex, setManualLocalePageIndex] = useState(0);
  const wasAutoTranslateRef = useRef(true);

  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameJa, setNameJa] = useState("");
  const [descVi, setDescVi] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descJa, setDescJa] = useState("");

  /** Chế độ AUTO: một ô mô tả (luôn hiển thị, không toggle). */
  const [descriptionAuto, setDescriptionAuto] = useState("");

  const [compensationPercent, setCompensationPercent] = useState("");

  const createMutation = useCreateAssetCategory();
  const isPending = createMutation.isPending;

  const manualLocalesComplete = useMemo(() => {
    if (isAutoTranslate) return true;
    return (
      nameVi.trim().length > 0 && nameEn.trim().length > 0 && nameJa.trim().length > 0
    );
  }, [isAutoTranslate, nameVi, nameEn, nameJa]);

  useEffect(() => {
    const wasAuto = wasAutoTranslateRef.current;
    wasAutoTranslateRef.current = isAutoTranslate;
    if (isAutoTranslate || !wasAuto) return;
    setManualLocalePageIndex(0);
    const id = requestAnimationFrame(() => {
      manualLocalesListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [isAutoTranslate]);

  const onManualPagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const w = manualFormPageWidth;
      if (w <= 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / w);
      setManualLocalePageIndex(Math.min(MANUAL_LOCALE_SLIDES.length - 1, Math.max(0, idx)));
    },
    [manualFormPageWidth]
  );

  const jumpToManualSlide = useCallback((index: number) => {
    const i = Math.min(MANUAL_LOCALE_SLIDES.length - 1, Math.max(0, index));
    setManualLocalePageIndex(i);
    manualLocalesListRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  /**
   * Chỉ dùng cho ô phần trăm (%) (gần cuối form). Không gắn vào mô tả/multiline — scrollToEnd khiến viewport
   * nhảy xuống cuối và làm form “biến mất” khi đang nhập mô tả.
   */
  const scrollToBottomForCompensationField = useCallback(() => {
    const delay = Platform.OS === "ios" ? 280 : 160;
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        formScrollRef.current?.scrollToEnd({ animated: true });
      }, delay);
    });
  }, []);

  const submitSuccessAlert = useCallback(() => {
    CustomAlert.alert(
      t("common.success"),
      t("staff_category.success_message"),
      [
        {
          text: t("common.close"),
          onPress: () => navigation.goBack(),
        },
      ],
      { type: "success" }
    );
  }, [navigation, t]);

  const submitErrorAlert = useCallback(() => {
    CustomAlert.alert(
      t("common.error"),
      t("staff_category.error_message"),
      undefined,
      { type: "error" }
    );
  }, [t]);

  const renderManualLocaleSlide = useCallback(
    ({ item }: { item: ManualSlideKey }) => {
      const title =
        item === "vi"
          ? t("staff_item_create.locale_section_vi")
          : item === "en"
            ? t("staff_item_create.locale_section_en")
            : t("staff_item_create.locale_section_ja");
      const nameLabel =
        item === "vi"
          ? t("staff_item_create.manual_slide_vi_name")
          : item === "en"
            ? t("staff_item_create.manual_slide_en_name")
            : t("staff_item_create.manual_slide_ja_name");
      const nameVal = item === "vi" ? nameVi : item === "en" ? nameEn : nameJa;
      const setName = item === "vi" ? setNameVi : item === "en" ? setNameEn : setNameJa;
      const namePh =
        item === "vi"
          ? t("staff_category.name_placeholder")
          : item === "en"
            ? t("staff_item_create.name_en_placeholder")
            : t("staff_item_create.name_ja_placeholder");
      const descVal = item === "vi" ? descVi : item === "en" ? descEn : descJa;
      const setDesc = item === "vi" ? setDescVi : item === "en" ? setDescEn : setDescJa;
      return (
        <View
          style={{
            width: manualFormPageWidth,
            paddingHorizontal: MANUAL_SLIDE_INNER_PAD_H,
          }}
        >
          <Text style={itemScreenStyles.localeSectionTitle}>{title}</Text>
          <Text style={itemScreenStyles.autoTranslateHint}>
            {t("staff_item_create.manual_swipe_hint_short")}
          </Text>
          <Text style={itemScreenStyles.label}>{nameLabel}</Text>
          <TextInput
            style={itemScreenStyles.input}
            value={nameVal}
            onChangeText={setName}
            placeholder={namePh}
            placeholderTextColor={neutral.textMuted}
            editable={!isPending}
          />
          <View style={{ marginTop: 12 }}>
            <Text style={itemScreenStyles.label}>{t("staff_category.manual_description_label")}</Text>
            <TextInput
              style={[itemScreenStyles.input, { minHeight: 72, textAlignVertical: "top" }]}
              value={descVal}
              onChangeText={setDesc}
              placeholder={t("staff_category.description_placeholder")}
              placeholderTextColor={neutral.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isPending}
            />
          </View>
        </View>
      );
    },
    [
      t,
      manualFormPageWidth,
      nameVi,
      nameEn,
      nameJa,
      descVi,
      descEn,
      descJa,
      isPending,
    ]
  );

  const resetForm = () => {
    setIsAutoTranslate(true);
    setNameVi("");
    setNameEn("");
    setNameJa("");
    setDescVi("");
    setDescEn("");
    setDescJa("");
    setDescriptionAuto("");
    setCompensationPercent("");
  };

  const handleSubmit = () => {
    const percent = parseInt(compensationPercent, 10);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      createMutation.reset();
      return;
    }

    if (isAutoTranslate) {
      const nameTrim = nameVi.trim();
      if (!nameTrim) {
        createMutation.reset();
        return;
      }
      const descPlain = descriptionAuto.trim();
      const loc = buildAssetCategoryLocalizedPayloadFromSingle(nameTrim, descPlain);
      createMutation.mutate(
        {
          name: loc.name,
          compensationPercent: percent,
          description: loc.description,
        },
        {
          onSuccess: () => {
            resetForm();
            submitSuccessAlert();
          },
          onError: submitErrorAlert,
        }
      );
      return;
    }

    if (!manualLocalesComplete) {
      createMutation.reset();
      return;
    }
    const locManual = buildAssetCategoryLocalizedPayloadFromManual(
      nameVi.trim(),
      nameEn.trim(),
      nameJa.trim(),
      descVi.trim(),
      descEn.trim(),
      descJa.trim()
    );
    createMutation.mutate(
      {
        name: locManual.name,
        compensationPercent: percent,
        description: locManual.description,
      },
      {
        onSuccess: () => {
          resetForm();
          submitSuccessAlert();
        },
        onError: submitErrorAlert,
      }
    );
  };

  const canSubmit = useMemo(() => {
    const compOk =
      compensationPercent.length > 0 && !Number.isNaN(parseInt(compensationPercent, 10));
    if (!compOk) return false;
    if (isAutoTranslate) {
      return nameVi.trim().length > 0;
    }
    return manualLocalesComplete;
  }, [compensationPercent, isAutoTranslate, nameVi, manualLocalesComplete]);

  return (
    <View style={categoryScreenStyles.container}>
      <StackScreenTitleHeaderStrip>
        <View style={stackScreenTitleRowStyle}>
          <View style={stackScreenTitleSideSlotStyle}>
            <TouchableOpacity
              style={stackScreenTitleBackBtnOnBrand}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icons.chevronBack size={24} color={stackScreenTitleOnBrandIconColor} />
            </TouchableOpacity>
          </View>
          <View style={stackScreenTitleCenterSlotStyle}>
            <StackScreenTitleBadge numberOfLines={1}>
              {t("staff_category.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? insets.top + CATEGORY_HEADER_KEYBOARD_OFFSET : 0
        }
      >
        <ScrollView
          ref={formScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            categoryScreenStyles.scrollContent,
            {
              paddingBottom:
                Math.max(32, insets.bottom + 16) +
                keyboardBottomInset +
                (keyboardBottomInset > 0 ? KEYBOARD_SCROLL_EXTRA_PAD : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <View style={categoryScreenStyles.formCard}>
            <View style={[categoryScreenStyles.toggleRow, { marginTop: 0 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={categoryScreenStyles.label}>
                  {t("staff_category.auto_translate_label")}
                </Text>
                <Text style={categoryScreenStyles.toggleHint}>
                  {t("staff_category.auto_translate_hint")}
                </Text>
              </View>
              <Switch
                value={isAutoTranslate}
                onValueChange={setIsAutoTranslate}
                trackColor={{ false: neutral.border, true: brandPrimary }}
                thumbColor={neutral.surface}
                disabled={isPending}
              />
            </View>
            {isAutoTranslate ? (
              <View style={itemScreenStyles.modeBadge}>
                <Text style={itemScreenStyles.modeBadgeText}>
                  {t("staff_category.mode_badge_auto")}
                </Text>
              </View>
            ) : (
              <View style={itemScreenStyles.modeBadge}>
                <Text style={itemScreenStyles.modeBadgeText}>
                  {t("staff_category.mode_badge_manual")}
                </Text>
              </View>
            )}

            {isAutoTranslate ? (
              <>
                <View style={categoryScreenStyles.fieldSpacer}>
                  <Text style={categoryScreenStyles.label}>
                    {t("staff_category.auto_name_label")}
                  </Text>
                  <TextInput
                    style={categoryScreenStyles.input}
                    value={nameVi}
                    onChangeText={setNameVi}
                    placeholder={t("staff_category.name_placeholder")}
                    placeholderTextColor="#9CA3AF"
                    editable={!isPending}
                  />
                </View>
                <View style={categoryScreenStyles.fieldSpacer}>
                  <Text style={categoryScreenStyles.label}>
                    {t("staff_category.description_label")}
                  </Text>
                  <TextInput
                    style={[categoryScreenStyles.input, categoryScreenStyles.inputMultiline]}
                    value={descriptionAuto}
                    onChangeText={setDescriptionAuto}
                    placeholder={t("staff_category.description_placeholder")}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!isPending}
                  />
                </View>
              </>
            ) : (
              <View
                style={[
                  itemScreenStyles.manualLocalePagerBlock,
                  { marginTop: 4, marginBottom: 0 },
                ]}
              >
                {!manualLocalesComplete ? (
                  <Text style={itemScreenStyles.manualLocaleWarning}>
                    {t("staff_category.manual_locales_warning")}
                  </Text>
                ) : null}
                <FlatList<ManualSlideKey>
                  ref={manualLocalesListRef}
                  data={MANUAL_LOCALE_PAGER_DATA}
                  extraData={{
                    nameVi,
                    nameEn,
                    nameJa,
                    descVi,
                    descEn,
                    descJa,
                    isPending,
                  }}
                  renderItem={renderManualLocaleSlide}
                  keyExtractor={(item) => item}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  style={{ height: MANUAL_LOCALE_PAGER_HEIGHT }}
                  getItemLayout={(_, index) => ({
                    length: manualFormPageWidth,
                    offset: manualFormPageWidth * index,
                    index,
                  })}
                  onMomentumScrollEnd={onManualPagerMomentumEnd}
                  removeClippedSubviews={false}
                />
                <View
                  style={[itemScreenStyles.manualLocaleDotsRow, { gap: 14, marginTop: 6, marginBottom: 0 }]}
                >
                  {MANUAL_LOCALE_SLIDES.map((slide, i) => (
                    <TouchableOpacity
                      key={slide}
                      onPress={() => jumpToManualSlide(i)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <View
                        style={[
                          itemScreenStyles.manualLocaleDot,
                          i === manualLocalePageIndex && itemScreenStyles.manualLocaleDotActive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View
              style={
                isAutoTranslate ? categoryScreenStyles.fieldSpacer : categoryScreenStyles.fieldSpacerTight
              }
            >
              <Text
                style={
                  isAutoTranslate ? categoryScreenStyles.label : itemScreenStyles.labelTrilingual
                }
              >
                {t(
                  isAutoTranslate
                    ? "staff_category.compensation_label"
                    : "staff_category.compensation_label_trilingual"
                )}
              </Text>
              <TextInput
                style={categoryScreenStyles.input}
                value={compensationPercent}
                onChangeText={setCompensationPercent}
                placeholder={t("staff_category.compensation_placeholder")}
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                editable={!isPending}
                onFocus={scrollToBottomForCompensationField}
              />
            </View>

            <TouchableOpacity
              style={[
                categoryScreenStyles.submitBtn,
                (!canSubmit || isPending) && categoryScreenStyles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <RefreshLogoInline logoPx={20} />
              ) : (
                <Text style={categoryScreenStyles.submitBtnText}>
                  {t("staff_category.submit")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
