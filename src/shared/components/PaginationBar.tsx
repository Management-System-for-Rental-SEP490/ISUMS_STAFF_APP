import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { buildPaginationSequence } from "../utils/pagination";
import { brandPrimary, neutral } from "../theme/color";
import { appTypography } from "../utils";

export type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Ẩn khi chỉ có một trang hoặc không có dữ liệu (totalPages < 2). */
  hideWhenSingle?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  hideWhenSingle = true,
  style,
}: PaginationBarProps) {
  if (hideWhenSingle && totalPages < 2) return null;
  const seq = buildPaginationSequence(currentPage, totalPages);
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {seq.map((tok, idx) =>
        tok === "ellipsis" ? (
          <Text key={`ellipsis-${idx}`} style={styles.ellipsis} accessibilityElementsHidden>
            …
          </Text>
        ) : (
          <TouchableOpacity
            key={tok}
            accessibilityRole="button"
            accessibilityState={{ selected: tok === currentPage }}
            onPress={() => onPageChange(tok)}
            activeOpacity={0.75}
            style={[styles.btn, tok === currentPage && styles.btnActive]}
          >
            <Text style={[styles.btnText, tok === currentPage && styles.btnTextActive]}>{tok}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  btn: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: neutral.border,
    backgroundColor: neutral.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  btnActive: {
    backgroundColor: brandPrimary,
    borderColor: brandPrimary,
  },
  btnText: {
    ...appTypography.body,
    fontWeight: "600",
    color: neutral.text,
  },
  btnTextActive: {
    color: "#FFF",
  },
  ellipsis: {
    ...appTypography.sectionHeading,
    fontWeight: "700",
    color: neutral.textSecondary,
    paddingHorizontal: 4,
  },
});
