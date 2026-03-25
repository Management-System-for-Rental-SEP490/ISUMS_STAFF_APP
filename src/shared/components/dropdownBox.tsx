import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { appTypography } from "../utils";

export type DropdownBoxItem = {
  id: string;
  label: string;
  /** Dòng phụ (địa chỉ…), dùng khi `itemLayout="list"`. */
  detail?: string;
  /** Hiển thị dòng “Số thiết bị: **n**” (list layout). */
  deviceCount?: number;
};

export type DropdownBoxSection = {
  id: string;
  title: string;
  items: DropdownBoxItem[];
  /** `null` khi đang chọn hàng "Tất cả" (nếu có). */
  selectedId: string | null;
  /**
   * `false` = không có hàng "Tất cả" (vd. chỉ chọn tầng cụ thể).
   * Mặc định `true`.
   */
  showAllOption?: boolean;
  allLabel?: string;
};

export type DropdownBoxProps = {
  sections: DropdownBoxSection[];
  /** Một dòng tóm tắt trên nút mở (parent tự format + i18n). */
  summary: string;
  onSelect: (sectionId: string, itemId: string | null) => void;
  style?: StyleProp<ViewStyle>;
  onAfterSelect?: (sectionId: string, itemId: string | null) => void;
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
  /** `list` = danh sách dọc (tìm + hàng), `chips` = chip cuộn ngang (mặc định). */
  itemLayout?: "chips" | "list";
  /** Viền/trục nhấn cho trigger + panel (vd. picker căn nhà Staff Home). */
  triggerAccent?: boolean;
  /** Tuỳ chỉnh placeholder ô tìm (mặc định `dropdown_box.search_placeholder`). */
  searchPlaceholder?: string;
  /**
   * `false` = mở panel không gọi bàn phím; chỉ khi user chạm ô tìm mới focus (vd. danh sách căn nhà Staff Home).
   * Mặc định `true`.
   */
  searchAutoFocus?: boolean;
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
    item.label.toLowerCase().includes(n) ||
    item.id.toLowerCase().includes(n) ||
    (item.detail ?? "").toLowerCase().includes(n)
  );
}

function buildSectionBlocks(
  sections: DropdownBoxSection[],
  query: string,
  defaultAllLabel: string
): SectionBlock[] {
  const q = norm(query);
  const blocks: SectionBlock[] = [];
  for (const sec of sections) {
    const allLabel = sec.allLabel ?? defaultAllLabel;
    const showAll = sec.showAllOption !== false;
    const allVisible = showAll && (!q || norm(allLabel).includes(q));
    const filteredItems = sec.items.filter((it) => itemMatches(it, q));
    if (!allVisible && filteredItems.length === 0) continue;
    blocks.push({ sec, allVisible, allLabel, filteredItems });
  }
  return blocks;
}

/**
 * Gom nhiều bộ lọc (tầng, danh mục, …): nhấn mở ngay tại chỗ — thanh tìm kiếm + chip theo thứ tự BE.
 */
export function DropdownBox({
  sections,
  summary,
  onSelect,
  style,
  onAfterSelect,
  keyboardVerticalOffset = 0,
  onSearchInputFocus,
  itemLayout = "chips",
  triggerAccent = false,
  searchPlaceholder,
  searchAutoFocus = true,
}: DropdownBoxProps) {
  const { t } = useTranslation();
  const { height: windowH } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  /** Tránh gọi `onSearchInputFocus` lặp (mỗi lần gõ / refocus) → FlatList scrollToOffset làm panel nhảy. */
  const parentScrollForSearchDoneRef = useRef(false);

  useEffect(() => {
    if (expanded) setSearch("");
  }, [expanded]);

  useEffect(() => {
    if (!expanded) parentScrollForSearchDoneRef.current = false;
  }, [expanded]);

  const notifyParentScrollForSearch = useCallback(() => {
    if (!onSearchInputFocus) return;
    if (parentScrollForSearchDoneRef.current) return;
    parentScrollForSearchDoneRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onSearchInputFocus());
    });
  }, [onSearchInputFocus]);

  const defaultAllLabel = t("staff_home.all_devices_category_all");
  const sectionBlocks = useMemo(
    () => buildSectionBlocks(sections, search, defaultAllLabel),
    [sections, search, defaultAllLabel]
  );

  const chipsMaxHeight = Math.min(360, Math.round(windowH * 0.45));
  /** List dọc: cố định chiều cao vùng cuộn — tránh co/giãn khi lọc → panel + ô tìm nhảy / mất focus. */
  const listScrollHeightStyle =
    itemLayout === "list" ? ({ height: chipsMaxHeight } as const) : ({ maxHeight: chipsMaxHeight } as const);

  const collapse = useCallback(() => setExpanded(false), []);

  const handleSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      onSelect(sectionId, itemId);
      setExpanded(false);
      onAfterSelect?.(sectionId, itemId);
    },
    [onSelect, onAfterSelect]
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={style}>
      {!expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          style={[styles.trigger, triggerAccent && styles.triggerAccent]}
          accessibilityRole="button"
          accessibilityLabel={`${t("dropdown_box.open_a11y")}: ${summary}`}
        >
          <Text style={styles.triggerText} numberOfLines={2}>
            {summary}
          </Text>
          <Icons.chevronDown size={22} color={neutral.textSecondary} />
        </Pressable>
      ) : (
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={
            Platform.OS === "ios" ? keyboardVerticalOffset : 0
          }
          style={styles.avoidingWrap}
        >
          <View style={[styles.panel, triggerAccent && styles.panelAccent]}>
            <View style={styles.searchRow}>
              <Icons.search size={20} color={neutral.iconMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder ?? t("dropdown_box.search_placeholder")}
                placeholderTextColor={neutral.textSecondary}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                {...(searchAutoFocus ? { autoFocus: true } : {})}
                clearButtonMode="while-editing"
                onFocus={notifyParentScrollForSearch}
              />
              <Pressable
                onPress={collapse}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
              >
                <View style={styles.chevronUpWrap}>
                  <Icons.chevronDown size={22} color={neutral.textSecondary} />
                </View>
              </Pressable>
            </View>

            <ScrollView
              style={[styles.chipsScroll, listScrollHeightStyle]}
              contentContainerStyle={
                sectionBlocks.length === 0 && itemLayout === "list"
                  ? styles.listScrollContentEmpty
                  : undefined
              }
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {sectionBlocks.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>{t("dropdown_box.no_results")}</Text>
                </View>
              ) : itemLayout === "list" ? (
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
                    {block.allVisible ? (
                      <Pressable
                        style={[
                          styles.listRow,
                          block.sec.selectedId === null && styles.listRowSelected,
                        ]}
                        onPress={() => handleSelect(block.sec.id, null)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: block.sec.selectedId === null }}
                      >
                        <View style={styles.listRowTextWrap}>
                          <Text
                            style={[
                              styles.listRowTitle,
                              block.sec.selectedId === null && styles.listRowTitleSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {block.allLabel}
                          </Text>
                        </View>
                        <Icons.chevronForward size={20} color={neutral.textSecondary} />
                      </Pressable>
                    ) : null}
                    {block.filteredItems.map((it) => {
                      const selected = block.sec.selectedId === it.id;
                      return (
                        <Pressable
                          key={it.id}
                          style={[styles.listRow, selected && styles.listRowSelected]}
                          onPress={() => handleSelect(block.sec.id, it.id)}
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
                              <Text style={styles.listRowDetail} numberOfLines={2}>
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
                          <Icons.chevronForward size={20} color={neutral.textSecondary} />
                        </Pressable>
                      );
                    })}
                  </View>
                ))
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
                  </View>
                ))
              )}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surface,
  },
  triggerText: {
    ...appTypography.labelRowValue,
    flex: 1,
    color: neutral.text,
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
  },
  avoidingWrap: {
    alignSelf: "stretch",
    width: "100%",
  },
  singleSectionBlock: {
    paddingTop: 4,
  },
  panel: {
    borderRadius: 12,
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
  chevronUpWrap: {
    transform: [{ rotate: "180deg" }],
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
    fontSize: 15,
    fontWeight: "700",
    color: brandPrimary,
  },
});
