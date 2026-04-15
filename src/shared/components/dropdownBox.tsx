import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useTranslation } from "react-i18next";
import Icons from "../theme/icon";
import { brandBlueMutedBorder, brandPrimary, brandTintBg, neutral } from "../theme/color";
import { staffFormShape } from "../styles/staffFormShape";
import { appTypography } from "../utils";

export type DropdownBoxItem = {
  id: string;
  label: string;
  /** Dòng phụ (địa chỉ…), dùng khi `itemLayout="list"`. */
  detail?: string;
  /** Hiển thị dòng “Số thiết bị: **n**” (list layout). */
  deviceCount?: number;
  /** Dùng khi `itemLayout="card"`: các dòng như thẻ thiết bị. */
  cardCategory?: string;
  cardMeta?: string;
  cardFooter?: string;
  /** `list` layout: tick xanh thay cho chevron (vd. thiết bị đã có nháp trong phiên). */
  listShowDoneTick?: boolean;
  /** Khi set: render thay cho `cardFooter` (vẫn nên giữ `cardFooter` là chuỗi để lọc tìm kiếm). */
  cardFooterNode?: ReactNode;
};

export type DropdownBoxSection = {
  id: string;
  title: string;
  items: DropdownBoxItem[];
  /** Ghi đè layout cho riêng section này. `card` = thẻ dọc (tiêu đề + meta). */
  itemLayout?: "chips" | "list" | "card";
  /** `null` khi đang chọn hàng "Tất cả" (nếu có). */
  selectedId: string | null;
  /**
   * Chế độ chọn nhiều (chỉ hỗ trợ khi `itemLayout === "list"`).
   * Khi mở panel: draft copy từ `selectedIds`; chạm đơn thêm mục, đúp nhanh để bỏ chọn;
   * đóng panel (nút mũi tên) gọi `onMultiSelectCommit`.
   */
  multiSelect?: boolean;
  /** Giá trị đã xác nhận (khi đóng); dùng khi `multiSelect: true`. */
  selectedIds?: string[];
  /**
   * `false` = không có hàng "Tất cả" (vd. chỉ chọn tầng cụ thể).
   * Mặc định `true`.
   */
  showAllOption?: boolean;
  allLabel?: string;
  /**
   * Chỉ với `itemLayout: "card"`: hàng `allLabel` (vd. «Chưa có khu vực») hiển thị **sau** danh sách,
   * một dòng chú thích có thể chạm, thay vì thẻ lớn. Chỉ hiện khi `selectedId === null` (đã chọn giá trị thì ẩn).
   */
  allOptionAsCaption?: boolean;
  /**
   * Với `allOptionAsCaption`: khi chọn hàng “chưa chọn” (`selectedId === null`), vẫn giữ chữ xám
   * (không tô màu brand như mục đang chọn).
   */
  allOptionCaptionMutedWhenSelected?: boolean;
  /**
   * Vẫn render section khi không còn mục sau lọc (vd. danh sách thiết bị rỗng).
   * Hiển thị `emptyHint` hoặc `dropdown_box.no_results`.
   */
  keepEmpty?: boolean;
  emptyHint?: string;
};

export type DropdownBoxProps = {
  sections: DropdownBoxSection[];
  /** Một dòng tóm tắt trên nút mở (parent tự format + i18n). */
  summary: string;
  onSelect?: (sectionId: string, itemId: string | null) => void;
  /**
   * Khi đóng panel sau chỉnh multi-select (theo `section.multiSelect`).
   */
  onMultiSelectCommit?: (sectionId: string, selectedIds: string[]) => void;
  style?: StyleProp<ViewStyle>;
  onAfterSelect?: (sectionId: string, itemId: string | null) => void;
  /**
   * Callback khi user nhập text vào ô search trong dropdown.
   * Dùng để parent filter dữ liệu theo cùng query.
   */
  onSearchChange?: (query: string) => void;
  /**
   * Bù chiều cao header/status bar cho KeyboardAvoidingView (iOS).
   * Gợi ý: `insets.top + ~52` khi màn có header stack.
   */
  keyboardVerticalOffset?: number;
  /**
   * Gọi khi ô tìm trong panel được focus (sau khi mở panel).
   * Dùng để `scrollToOffset` / `scrollTo` trên FlatList/ScrollView cha — tránh bàn phím che.
   */
  onSearchInputFocus?: () => void;
  /** Gọi khi ô tìm mất focus (để parent biết khi nào không cần cuộn theo bàn phím). */
  onSearchBlur?: () => void;
  /** Ref gắn vào ô tìm — parent có thể `measureInWindow` để cuộn giống màn ticket. */
  searchInputRef?: RefObject<TextInput | null>;
  /** `list` | `card` | `chips` (mặc định). */
  itemLayout?: "chips" | "list" | "card";
  /** Viền/trục nhấn cho trigger + panel (vd. picker căn nhà Staff Home). */
  triggerAccent?: boolean;
  /** Dòng `summary` trên nút mở dùng màu phụ (vd. placeholder “chưa có”). */
  summaryMuted?: boolean;
  /** Tuỳ chỉnh placeholder ô tìm (mặc định `dropdown_box.search_placeholder`). */
  searchPlaceholder?: string;
  /**
   * `true` = mở panel là auto-focus ô tìm (bàn phím có thể hiện). Mặc định `false` — chỉ focus khi user chạm ô tìm.
   */
  searchAutoFocus?: boolean;
  /** Mở sẵn panel ngay khi component mount. Mặc định `false`. */
  defaultExpanded?: boolean;
  /**
   * Mỗi khi giá trị thay đổi (vd. tăng counter trong `useFocusEffect`), panel được mở.
   * Hữu ích khi tab navigator giữ màn hình mounted — `defaultExpanded` chỉ áp dụng lúc mount lần đầu.
   */
  expandSignal?: number;
  /**
   * `false` = không bọc panel trong KeyboardAvoidingView (tránh giật layout khi mở dropdown không cần bàn phím).
   * Mặc định `true`.
   */
  keyboardAvoiding?: boolean;
  /**
   * Sau khi chọn, không đóng panel nếu `sectionId` nằm trong danh sách (vd. chỉ lọc danh mục, vẫn mở để chọn thiết bị).
   */
  stayExpandedOnSelectForSections?: string[];
  /** Trần chiều cao vùng cuộn danh sách trong panel (px). Mặc định 420. */
  resultsMaxHeight?: number;
  /** Tỷ lệ theo chiều cao cửa sổ cho vùng cuộn (`min(max, windowH * ratio)`). Mặc định 0.52. */
  resultsHeightRatio?: number;
  /** Khi panel mở/đóng. */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Các `section.id` không lọc theo ô tìm (vd. chip danh mục luôn hiện đủ, chỉ lọc section thiết bị).
   */
  sectionsExcludedFromSearch?: string[];
};

type SectionBlock = {
  sec: DropdownBoxSection;
  allVisible: boolean;
  allLabel: string;
  filteredItems: DropdownBoxItem[];
};

function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function itemMatches(item: DropdownBoxItem, q: string) {
  if (!q) return true;
  const n = norm(q);
  return (
    norm(item.label).includes(n) ||
    norm(item.id).includes(n) ||
    norm(item.detail ?? "").includes(n) ||
    norm(item.cardCategory ?? "").includes(n) ||
    norm(item.cardMeta ?? "").includes(n) ||
    norm(item.cardFooter ?? "").includes(n)
  );
}

function itemScore(item: DropdownBoxItem, q: string): number {
  const query = norm(q);
  if (!query) return 0;
  const label = norm(item.label);
  const id = norm(item.id);
  const detail = norm(item.detail ?? "");
  const cat = norm(item.cardCategory ?? "");
  const meta = norm(item.cardMeta ?? "");
  const foot = norm(item.cardFooter ?? "");
  if (label === query) return 140;
  if (label.startsWith(query)) return 120;
  if (label.includes(query)) return 90;
  if (id === query) return 80;
  if (id.startsWith(query)) return 70;
  if (id.includes(query)) return 50;
  if (detail.startsWith(query)) return 40;
  if (detail.includes(query)) return 30;
  if (cat.includes(query) || meta.includes(query) || foot.includes(query)) return 25;
  return 0;
}

function sortFilteredItems(items: DropdownBoxItem[], q: string): DropdownBoxItem[] {
  if (!q) return items;
  return [...items].sort((a, b) => {
    const scoreDiff = itemScore(b, q) - itemScore(a, q);
    if (scoreDiff !== 0) return scoreDiff;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

function buildSectionBlocks(
  sections: DropdownBoxSection[],
  query: string,
  defaultAllLabel: string,
  sectionsExcludedFromSearch?: string[]
): SectionBlock[] {
  const q = norm(query);
  const blocks: SectionBlock[] = [];
  for (const sec of sections) {
    const excluded = sectionsExcludedFromSearch?.includes(sec.id) ?? false;
    const allLabel = sec.allLabel ?? defaultAllLabel;
    const showAll = sec.showAllOption !== false;
    const allVisible = excluded
      ? showAll
      : showAll && (!q || norm(allLabel).includes(q));
    const filteredItems = excluded
      ? sortFilteredItems(sec.items, "")
      : sortFilteredItems(
          sec.items.filter((it) => itemMatches(it, q)),
          q
        );
    if (!allVisible && filteredItems.length === 0 && !sec.keepEmpty) continue;
    blocks.push({ sec, allVisible, allLabel, filteredItems });
  }
  return blocks;
}

/**
 * Gom nhiều bộ lọc (tầng, danh mục, …): nhấn mở ngay tại chỗ — thanh tìm kiếm + chip theo thứ tự BE.
 */
/** Hai lần chạm cùng mục trong cửa sổ này → bỏ chọn (multi-select list). */
const MULTI_TAP_DOUBLE_MS = 380;

export function DropdownBox({
  sections,
  summary,
  onSelect = () => {},
  onMultiSelectCommit,
  style,
  onAfterSelect,
  onSearchChange,
  keyboardVerticalOffset = 0,
  onSearchInputFocus,
  onSearchBlur,
  searchInputRef,
  itemLayout = "chips",
  triggerAccent = false,
  summaryMuted = false,
  searchPlaceholder,
  searchAutoFocus = false,
  defaultExpanded = false,
  expandSignal,
  keyboardAvoiding = true,
  stayExpandedOnSelectForSections,
  resultsMaxHeight = 420,
  resultsHeightRatio = 0.52,
  onExpandedChange,
  sectionsExcludedFromSearch,
}: DropdownBoxProps) {
  const { t } = useTranslation();
  const { height: windowH } = useWindowDimensions();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState("");
  /** Draft chọn nhiều theo section, chỉ dùng khi panel đang mở. */
  const [multiDraftBySection, setMultiDraftBySection] = useState<Record<string, string[]>>({});
  const prevExpandedRef = useRef(false);
  const multiTapRef = useRef<{ sectionId: string; itemId: string; time: number } | null>(null);
  const multiTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandSignalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (expandSignal === undefined) return;
    if (expandSignalRef.current === expandSignal) return;
    expandSignalRef.current = expandSignal;
    setExpanded(true);
  }, [expandSignal]);

  useEffect(() => {
    if (expanded) {
      setSearch("");
      onSearchChange?.("");
    }
  }, [expanded]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    return () => {
      if (multiTapTimerRef.current) clearTimeout(multiTapTimerRef.current);
    };
  }, []);

  /** Chỉ seed draft khi vừa mở panel (false → true), không ghi đè khi `sections` đổi lúc đang mở. */
  useEffect(() => {
    const wasExpanded = prevExpandedRef.current;
    prevExpandedRef.current = expanded;
    if (!expanded) return;
    if (wasExpanded) return;
    const init: Record<string, string[]> = {};
    for (const s of sections) {
      if (s.multiSelect) init[s.id] = [...(s.selectedIds ?? [])];
    }
    setMultiDraftBySection(init);
  }, [expanded, sections]);

  const notifyParentScrollForSearch = useCallback(() => {
    if (!onSearchInputFocus) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onSearchInputFocus());
    });
  }, [onSearchInputFocus]);

  const defaultAllLabel = t("staff_home.all_devices_category_all");
  const sectionBlocks = useMemo(
    () => buildSectionBlocks(sections, search, defaultAllLabel, sectionsExcludedFromSearch),
    [sections, search, defaultAllLabel, sectionsExcludedFromSearch]
  );

  const resultsViewportHeight = Math.min(
    resultsMaxHeight,
    Math.round(windowH * resultsHeightRatio)
  );
  /** Cố định chiều cao vùng cuộn khi lọc (có/không kết quả) — tránh nhảy layout. */
  const listScrollMaxHeight = resultsViewportHeight;

  const handleMultiListItemPress = useCallback((sectionId: string, itemId: string) => {
    const now = Date.now();
    if (multiTapTimerRef.current) {
      clearTimeout(multiTapTimerRef.current);
      multiTapTimerRef.current = null;
    }
    const last = multiTapRef.current;
    if (
      last &&
      last.sectionId === sectionId &&
      last.itemId === itemId &&
      now - last.time < MULTI_TAP_DOUBLE_MS
    ) {
      multiTapRef.current = null;
      setMultiDraftBySection((prev) => {
        const cur = [...(prev[sectionId] ?? [])];
        return { ...prev, [sectionId]: cur.filter((x) => x !== itemId) };
      });
      return;
    }
    multiTapRef.current = { sectionId, itemId, time: now };
    multiTapTimerRef.current = setTimeout(() => {
      multiTapTimerRef.current = null;
      multiTapRef.current = null;
      setMultiDraftBySection((prev) => {
        const cur = [...(prev[sectionId] ?? [])];
        if (cur.includes(itemId)) return prev;
        return { ...prev, [sectionId]: [...cur, itemId] };
      });
    }, MULTI_TAP_DOUBLE_MS);
  }, []);

  const collapse = useCallback(() => {
    if (multiTapTimerRef.current) {
      clearTimeout(multiTapTimerRef.current);
      multiTapTimerRef.current = null;
    }
    multiTapRef.current = null;
    for (const s of sections) {
      if (s.multiSelect) {
        onMultiSelectCommit?.(s.id, multiDraftBySection[s.id] ?? []);
      }
    }
    setExpanded(false);
  }, [sections, onMultiSelectCommit, multiDraftBySection]);

  const handleSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      onSelect(sectionId, itemId);
      const stay =
        stayExpandedOnSelectForSections?.includes(sectionId) === true;
      if (!stay) {
        setExpanded(false);
      }
      onAfterSelect?.(sectionId, itemId);
    },
    [onSelect, onAfterSelect, stayExpandedOnSelectForSections]
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={style}>
      {!expanded ? (
        <Pressable
          onPress={() => {
            setExpanded(true);
          }}
          style={[styles.trigger, triggerAccent && styles.triggerAccent]}
          accessibilityRole="button"
          accessibilityLabel={`${t("dropdown_box.open_a11y")}: ${summary}`}
        >
          <Text
            style={[styles.triggerText, summaryMuted && styles.triggerTextMuted]}
            numberOfLines={2}
          >
            {summary}
          </Text>
          <Icons.chevronDown size={22} color={neutral.textSecondary} />
        </Pressable>
      ) : (
        (() => {
          const panelBody = (
            <View style={[styles.panel, triggerAccent && styles.panelAccent]}>
              <View style={styles.searchRow}>
                <Icons.search size={20} color={neutral.iconMuted} />
                <TextInput
                  ref={searchInputRef}
                  value={search}
                  onChangeText={(text) => {
                    setSearch(text);
                    onSearchChange?.(text);
                  }}
                  placeholder={searchPlaceholder ?? t("dropdown_box.search_placeholder")}
                  placeholderTextColor={neutral.textSecondary}
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  {...(searchAutoFocus ? { autoFocus: true } : {})}
                  clearButtonMode="while-editing"
                  onPressIn={notifyParentScrollForSearch}
                  onFocus={notifyParentScrollForSearch}
                  onBlur={onSearchBlur}
                />
                <Pressable
                  onPress={collapse}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                >
                  <Icons.expandLess size={24} color={neutral.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={[styles.chipsScroll, { maxHeight: listScrollMaxHeight }]}
                contentContainerStyle={
                  sectionBlocks.length === 0 ? styles.listScrollContentEmpty : styles.scrollContentNatural
                }
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {sectionBlocks.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>{t("dropdown_box.no_results")}</Text>
                  </View>
                ) : (
                  sectionBlocks.map((block, idx) => (
                    <View
                      key={block.sec.id}
                      style={sections.length === 1 ? styles.singleSectionBlock : undefined}
                    >
                      {sections.length > 1 ? (
                        <Text
                          style={[styles.sectionTitle, idx === 0 && styles.sectionTitleFirst]}
                          accessibilityRole="header"
                        >
                          {block.sec.title}
                        </Text>
                      ) : null}
                      {(block.sec.itemLayout ?? itemLayout) === "list" ? (
                        <>
                          {block.allVisible ? (
                            <Pressable
                              style={[
                                styles.listRow,
                                block.sec.multiSelect
                                  ? (multiDraftBySection[block.sec.id] ?? []).length === 0 &&
                                    styles.listRowSelected
                                  : block.sec.selectedId === null && styles.listRowSelected,
                              ]}
                              onPress={() => {
                                if (block.sec.multiSelect) {
                                  setMultiDraftBySection((prev) => ({
                                    ...prev,
                                    [block.sec.id]: [],
                                  }));
                                  return;
                                }
                                handleSelect(block.sec.id, null);
                              }}
                              accessibilityRole="button"
                              accessibilityState={{
                                selected: block.sec.multiSelect
                                  ? (multiDraftBySection[block.sec.id] ?? []).length === 0
                                  : block.sec.selectedId === null,
                              }}
                            >
                              <View style={styles.listRowTextWrap}>
                                <Text
                                  style={[
                                    styles.listRowTitle,
                                    block.sec.multiSelect
                                      ? (multiDraftBySection[block.sec.id] ?? []).length === 0 &&
                                        styles.listRowTitleSelected
                                      : block.sec.selectedId === null && styles.listRowTitleSelected,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {block.allLabel}
                                </Text>
                              </View>
                              {block.sec.multiSelect ? (
                                <Text style={styles.listRowMultiTick} />
                              ) : (
                                <Icons.chevronForward size={20} color={neutral.textSecondary} />
                              )}
                            </Pressable>
                          ) : null}
                          {block.filteredItems.map((it) => {
                            const draftSet = multiDraftBySection[block.sec.id];
                            const selected = block.sec.multiSelect
                              ? (draftSet ?? []).includes(it.id)
                              : block.sec.selectedId === it.id;
                            return (
                              <Pressable
                                key={it.id}
                                style={[styles.listRow, selected && styles.listRowSelected]}
                                onPress={() =>
                                  block.sec.multiSelect
                                    ? handleMultiListItemPress(block.sec.id, it.id)
                                    : handleSelect(block.sec.id, it.id)
                                }
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                              >
                                <View style={styles.listRowTextWrap}>
                                  <Text
                                    style={[styles.listRowTitle, selected && styles.listRowTitleSelected]}
                                    numberOfLines={2}
                                  >
                                    {it.label}
                                  </Text>
                                  {it.detail ? (
                                    <Text
                                      style={styles.listRowDetail}
                                      numberOfLines={2}
                                      ellipsizeMode="tail"
                                    >
                                      {it.detail}
                                    </Text>
                                  ) : null}
                                  {typeof it.deviceCount === "number" ? (
                                    <Text style={styles.listRowMeta}>
                                      {t("staff_home.house_picker_device_prefix")}{" "}
                                      <Text style={styles.listRowMetaBold}>{it.deviceCount}</Text>
                                    </Text>
                                  ) : null}
                                </View>
                                {block.sec.multiSelect ? (
                                  <Text
                                    style={[styles.listRowMultiTick, selected && styles.listRowMultiTickOn]}
                                    accessibilityElementsHidden
                                    importantForAccessibility="no"
                                  >
                                    {selected ? "✓" : ""}
                                  </Text>
                                ) : it.listShowDoneTick ? (
                                  <Icons.checkCircle size={22} color={brandPrimary} />
                                ) : (
                                  <Icons.chevronForward size={20} color={neutral.textSecondary} />
                                )}
                              </Pressable>
                            );
                          })}
                        </>
                      ) : (block.sec.itemLayout ?? itemLayout) === "card" ? (
                        <>
                          {!block.sec.allOptionAsCaption && block.allVisible ? (
                            <Pressable
                              style={[
                                styles.deviceCard,
                                block.sec.selectedId === null && styles.deviceCardSelected,
                              ]}
                              onPress={() => handleSelect(block.sec.id, null)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: block.sec.selectedId === null }}
                            >
                              <Text style={styles.deviceCardTitle} numberOfLines={2}>
                                {block.allLabel}
                              </Text>
                            </Pressable>
                          ) : null}
                          {block.filteredItems.map((it) => {
                            const selected = block.sec.selectedId === it.id;
                            return (
                              <Pressable
                                key={it.id}
                                style={[styles.deviceCard, selected && styles.deviceCardSelected]}
                                onPress={() => handleSelect(block.sec.id, it.id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                              >
                                {it.cardCategory ? (
                                  <Text style={styles.deviceCardCategory} numberOfLines={1}>
                                    {it.cardCategory}
                                  </Text>
                                ) : null}
                                <Text
                                  style={[styles.deviceCardName, selected && styles.deviceCardNameSelected]}
                                  numberOfLines={2}
                                >
                                  {it.label}
                                </Text>
                                {it.cardMeta ? (
                                  <Text style={styles.deviceCardMeta} numberOfLines={2}>
                                    {it.cardMeta}
                                  </Text>
                                ) : it.detail ? (
                                  <Text style={styles.deviceCardMeta} numberOfLines={2}>
                                    {it.detail}
                                  </Text>
                                ) : null}
                                {it.cardFooterNode != null ? (
                                  <View style={styles.deviceCardFooterNodeWrap}>{it.cardFooterNode}</View>
                                ) : it.cardFooter ? (
                                  <Text style={styles.deviceCardFooter} numberOfLines={2}>
                                    {it.cardFooter}
                                  </Text>
                                ) : null}
                              </Pressable>
                            );
                          })}
                          {block.filteredItems.length === 0 && block.sec.keepEmpty ? (
                            <View style={styles.sectionEmptyHint}>
                              <Text style={styles.emptyText}>
                                {block.sec.emptyHint ?? t("dropdown_box.no_results")}
                              </Text>
                            </View>
                          ) : null}
                          {block.sec.allOptionAsCaption &&
                          block.allVisible &&
                          block.sec.selectedId === null ? (
                            <Pressable
                              onPress={() => handleSelect(block.sec.id, null)}
                              style={styles.allOptionCaptionPressable}
                              accessibilityRole="button"
                              accessibilityState={{ selected: true }}
                            >
                              <Text
                                style={[
                                  styles.allOptionCaptionText,
                                  !block.sec.allOptionCaptionMutedWhenSelected &&
                                    styles.allOptionCaptionTextSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {block.allLabel}
                              </Text>
                            </Pressable>
                          ) : null}
                        </>
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                          contentContainerStyle={styles.chipRowContent}
                        >
                          {block.allVisible ? (
                            <Pressable
                              style={[
                                styles.chip,
                                block.sec.selectedId === null && styles.chipSelected,
                              ]}
                              onPress={() => handleSelect(block.sec.id, null)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: block.sec.selectedId === null }}
                            >
                              <Text
                                style={[
                                  styles.chipLabel,
                                  block.sec.selectedId === null && styles.chipLabelSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {block.allLabel}
                              </Text>
                            </Pressable>
                          ) : null}
                          {block.filteredItems.map((it) => {
                            const selected = block.sec.selectedId === it.id;
                            return (
                              <Pressable
                                key={it.id}
                                style={[styles.chip, selected && styles.chipSelected]}
                                onPress={() => handleSelect(block.sec.id, it.id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                              >
                                <Text
                                  style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                                  numberOfLines={1}
                                >
                                  {it.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          );
          if (keyboardAvoiding) {
            return (
              <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={keyboardVerticalOffset}
                style={styles.avoidingWrap}
              >
                {panelBody}
              </KeyboardAvoidingView>
            );
          }
          return <View style={styles.avoidingWrap}>{panelBody}</View>;
        })()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: staffFormShape.radiusControl,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surface,
  },
  triggerText: {
    ...appTypography.labelRowValue,
    flex: 1,
    color: neutral.text,
  },
  triggerTextMuted: {
    color: neutral.textSecondary,
  },
  triggerAccent: {
    borderWidth: 1,
    borderColor: brandBlueMutedBorder,
    borderLeftWidth: 4,
    borderLeftColor: brandPrimary,
  },
  panelAccent: {
    borderWidth: 1,
    borderColor: brandBlueMutedBorder,
    borderLeftWidth: 4,
    borderLeftColor: brandPrimary,
  },
  avoidingWrap: {
    alignSelf: "stretch",
    width: "100%",
  },
  singleSectionBlock: {
    paddingTop: 4,
  },
  panel: {
    borderRadius: staffFormShape.radiusControl,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surface,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral.border,
    backgroundColor: neutral.background,
  },
  searchInput: {
    ...appTypography.body,
    flex: 1,
    padding: 0,
    margin: 0,
    color: neutral.text,
    minHeight: 22,
  },
  chipsScroll: {},
  /** Nội dung chỉ cao đến mức cần; cùng `maxHeight` trên ScrollView → panel vừa khi ít mục. */
  scrollContentNatural: {
    flexGrow: 0,
  },
  /** Căn “Không có kết quả” giữa vùng list cố định chiều cao. */
  listScrollContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  sectionTitle: {
    ...appTypography.captionStrong,
    color: neutral.textSecondary,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitleFirst: {
    marginTop: 8,
  },
  chipRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
    paddingRight: 16,
  },
  chip: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: neutral.background,
    borderWidth: 1,
    borderColor: neutral.border,
    maxWidth: 280,
  },
  chipSelected: {
    backgroundColor: brandTintBg,
    borderColor: brandPrimary,
  },
  chipLabel: {
    ...appTypography.body,
    color: neutral.text,
  },
  chipLabelSelected: {
    color: brandPrimary,
    fontWeight: "600",
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyText: {
    ...appTypography.secondary,
    color: neutral.textSecondary,
    textAlign: "center",
  },
  sectionEmptyHint: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral.border,
    backgroundColor: neutral.surface,
    gap: 10,
  },
  listRowSelected: {
    backgroundColor: brandTintBg,
  },
  listRowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  listRowTitle: {
    ...appTypography.body,
    fontWeight: "600",
    color: neutral.text,
  },
  listRowTitleSelected: {
    color: brandPrimary,
  },
  listRowDetail: {
    ...appTypography.secondary,
    color: neutral.textSecondary,
    marginTop: 4,
  },
  listRowMeta: {
    ...appTypography.secondary,
    color: neutral.textSecondary,
    marginTop: 6,
  },
  listRowMetaBold: {
    ...appTypography.listTitle,
    fontWeight: "700",
    color: brandPrimary,
  },
  listRowMultiTick: {
    fontSize: 16,
    color: neutral.slate300,
    width: 22,
    textAlign: "center",
    fontWeight: "900",
  },
  listRowMultiTickOn: {
    color: brandPrimary,
  },
  deviceCard: {
    marginHorizontal: 8,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: neutral.surface,
    borderWidth: 1,
    borderColor: neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceCardSelected: {
    backgroundColor: "rgba(55, 181, 132, 0.12)",
    borderColor: brandPrimary,
    borderWidth: 1,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  deviceCardCategory: {
    ...appTypography.captionStrong,
    fontSize: 12,
    color: neutral.textSecondary,
    marginBottom: 4,
  },
  deviceCardName: {
    ...appTypography.body,
    fontSize: 16,
    fontWeight: "700",
    color: neutral.text,
    marginBottom: 4,
  },
  deviceCardNameSelected: {
    color: brandPrimary,
  },
  deviceCardMeta: {
    ...appTypography.secondary,
    fontSize: 13,
    color: neutral.textSecondary,
    marginBottom: 2,
  },
  deviceCardFooterNodeWrap: {
    marginTop: 4,
  },
  deviceCardFooter: {
    ...appTypography.secondary,
    fontSize: 13,
    color: neutral.textMuted,
    marginTop: 4,
  },
  deviceCardTitle: {
    ...appTypography.body,
    fontWeight: "600",
    color: neutral.text,
  },
  allOptionCaptionPressable: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 2,
    marginBottom: 6,
    alignSelf: "stretch",
  },
  allOptionCaptionText: {
    ...appTypography.secondary,
    fontSize: 13,
    lineHeight: 18,
    color: neutral.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  allOptionCaptionTextSelected: {
    color: brandPrimary,
    fontWeight: "600",
    fontStyle: "normal",
  },
});
