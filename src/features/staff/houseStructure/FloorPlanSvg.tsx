/**
 * Khu vực chức năng một tầng: một dải nền nhạt + các ô cạnh nhau (không mái, không lồng nhiều viền).
 * **Tất cả khu trên một hàng ngang**, chia đều bề ngang; chỉ ô đang chọn có viền accent.
 */
import React from "react";
import { View, useWindowDimensions, Pressable, StyleSheet, Text } from "react-native";
import type { FunctionalAreaFromApi } from "../../../shared/types/api";
import { brandPrimary, brandTintBg, neutral } from "../../../shared/theme/color";
import { mapLabelForFunctionalArea } from "../../../shared/utils";
import { appTypography } from "../../../shared/utils/typography";

/** Padding hai bên của dải (px × 2 được trừ khi chia chip). */
const BAND_PAD_X2 = 20;
const GAP = 6;

interface FloorPlanSvgProps {
  areas: FunctionalAreaFromApi[];
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
  accentColor?: string;
}

const FloorPlanSvg: React.FC<FloorPlanSvgProps> = ({
  areas,
  selectedAreaId,
  onSelectArea,
  accentColor = brandPrimary,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const frameWidth = Math.min(screenWidth - 32, 440);

  if (areas.length === 0) {
    return null;
  }

  const innerContentW = frameWidth - BAND_PAD_X2;
  const n = areas.length;
  const totalGap = (n - 1) * GAP;
  const baseChipW = Math.max(1, Math.floor((innerContentW - totalGap) / n));
  const lastChipW = baseChipW + (innerContentW - totalGap - baseChipW * n);

  return (
    <View style={styles.container}>
      <View style={[styles.floorBand, { width: frameWidth }]}>
        <View style={[styles.chipsRow, { gap: GAP }]}>
          {areas.map((area, index) => {
            const isSelected = selectedAreaId === area.id;
            const label = mapLabelForFunctionalArea(area.name);
            const cellW = index === n - 1 ? lastChipW : baseChipW;
            return (
              <Pressable
                key={area.id}
                accessibilityRole="button"
                onPress={() => onSelectArea(area.id)}
                style={({ pressed }) => [
                  styles.chip,
                  { width: cellW },
                  {
                    backgroundColor: isSelected ? brandTintBg : neutral.surface,
                    borderColor: isSelected ? accentColor : "transparent",
                  },
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[
                    appTypography.chip,
                    styles.chipLabel,
                    { color: isSelected ? accentColor : neutral.slate900 },
                  ]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 4 },
  /** Một lớp nền nhạt, không viền ngoài — tách chip bằng khoảng trống + nền ô trắng. */
  floorBand: {
    alignSelf: "center",
    borderRadius: 12,
    backgroundColor: neutral.tileMuted,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    minHeight: 44,
    justifyContent: "center",
  },
  chipLabel: { textAlign: "center" },
  chipPressed: { opacity: 0.88 },
});

export default FloorPlanSvg;
