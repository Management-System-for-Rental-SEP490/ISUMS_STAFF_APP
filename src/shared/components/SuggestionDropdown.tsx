import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { brandPrimary, brandTintBg, neutral } from "../theme/color";
import { appTypography } from "../utils/typography";

export type Suggestion = {
  id: string;
  label: string;
  sublabel?: string;
  /** Nhãn loại hiển thị dưới dạng badge bên phải (đã được dịch trước khi truyền vào). */
  typeLabel?: string;
};

type Props = {
  visible: boolean;
  suggestions: Suggestion[];
  /** Query hiện tại — dùng trong thông báo "không có kết quả". */
  query: string;
  onSelect: (s: Suggestion) => void;
  /** Tuỳ chỉnh text khi không có kết quả. Mặc định dùng i18n key search.no_result. */
  emptyText?: string;
};

/**
 * Dropdown gợi ý tìm kiếm — floating card hiển thị phía dưới Header.
 * Phải được đặt bên trong một View có `position: relative` (hoặc `flex: 1`).
 * Dùng `position: absolute, top: 8` để tạo khoảng cách với Header tròn phía trên.
 */
const SuggestionDropdown = ({
  visible,
  suggestions,
  query,
  onSelect,
  emptyText,
}: Props) => {
  const { t } = useTranslation();

  if (!visible) return null;

  const noResultText = emptyText ?? t("search.no_result", { query });

  return (
    <View style={styles.container}>
      {/* Mũi tên nhỏ chỉ lên phía Header */}
      <View style={styles.arrow} />
      <View style={styles.card}>
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {suggestions.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{noResultText}</Text>
            </View>
          ) : (
            suggestions.map((s, index) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.item,
                  index === suggestions.length - 1 && styles.itemLast,
                ]}
                onPress={() => onSelect(s)}
                activeOpacity={0.65}
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                  {s.sublabel ? (
                    <Text style={styles.itemSublabel} numberOfLines={1}>
                      {s.sublabel}
                    </Text>
                  ) : null}
                </View>
                {s.typeLabel ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{s.typeLabel}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const ARROW_SIZE = 8;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  /** Mũi tên tam giác nhỏ trỏ lên, giúp dropdown trông kết nối với ô search bên trên. */
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: neutral.surface,
    alignSelf: "center",
    marginBottom: -1,
  },
  card: {
    backgroundColor: neutral.surface,
    borderRadius: 16,
    maxHeight: 300,
    overflow: "hidden",
    /** elevation phải đặt trên View có backgroundColor để shadow hiển thị đúng trên Android. */
    elevation: 12,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: neutral.borderMuted,
  },
  /** KHÔNG dùng flex: 1 — để content tự kéo giãn chiều cao, maxHeight trên card sẽ giới hạn. */
  list: {},
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: neutral.background,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemLabel: {
    ...appTypography.itemTitle,
    color: neutral.heading,
  },
  itemSublabel: {
    ...appTypography.caption,
    color: neutral.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: brandTintBg,
  },
  typeBadgeText: {
    ...appTypography.badge,
    color: brandPrimary,
  },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    ...appTypography.secondary,
    color: neutral.textMuted,
  },
});

export default SuggestionDropdown;
