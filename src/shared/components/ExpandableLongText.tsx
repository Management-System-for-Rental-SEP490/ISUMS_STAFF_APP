import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { brandPrimary } from "../theme/color";
import {
  DEFAULT_BE_TEXT_MAX_CHARS,
  getDisplayTextPreview,
} from "../utils/truncateDisplayText";

export type ExpandableLongTextProps = {
  text: string | null | undefined;
  /** Số ký tự tối đa trước khi gấp (mặc định mô tả dài). */
  maxLength?: number;
  textStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Hiển thị nội dung từ BE có giới hạn độ dài; vượt ngưỡng thì có "Xem thêm" / "Thu gọn".
 */
export function ExpandableLongText({
  text,
  maxLength = DEFAULT_BE_TEXT_MAX_CHARS,
  textStyle,
  linkStyle,
  containerStyle,
  testID,
}: ExpandableLongTextProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { full, preview, isTruncated } = useMemo(
    () => getDisplayTextPreview(text, maxLength),
    [text, maxLength]
  );

  useEffect(() => {
    setExpanded(false);
  }, [full]);

  if (!full) {
    return null;
  }

  return (
    <View style={[styles.wrap, containerStyle]} testID={testID}>
      <Text style={textStyle}>
        {expanded || !isTruncated ? full : preview}
      </Text>
      {isTruncated ? (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={[styles.link, linkStyle]}>
            {expanded ? t("common.show_less") : t("common.read_more")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
  },
  link: {
    marginTop: 6,
    color: brandPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});
