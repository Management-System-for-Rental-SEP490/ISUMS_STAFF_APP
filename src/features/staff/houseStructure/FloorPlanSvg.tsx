/**
 * Khu vực chức năng một tầng: mái + khung ngoài + sàn trong.
 * **Tất cả khu trên một hàng ngang**, chia đều bề ngang trong khung.
 */
import React from "react";
import { View, useWindowDimensions, Pressable, StyleSheet, Text } from "react-native";
import type { FunctionalAreaFromApi } from "../../../shared/types/api";
import { brandPrimary, brandTintBg, neutral } from "../../../shared/theme/color";
import { mapLabelForFunctionalArea } from "../../../shared/utils";
import { appTypography } from "../../../shared/utils/typography";

const OUTER_PAD_X2 = 20;
const INNER_PAD_X2 = 24;
const INNER_BORDER_X2 = 2;
const GAP = 8;

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
  const frameWidth = Math.min(screenWidth - 24, 440);

  if (areas.length === 0) {
    return null;
  }

  const innerContentW = frameWidth - OUTER_PAD_X2 - INNER_PAD_X2 - INNER_BORDER_X2;
  const n = areas.length;
  const totalGap = (n - 1) * GAP;
  const baseChipW = Math.max(1, Math.floor((innerContentW - totalGap) / n));
  const lastChipW = baseChipW + (innerContentW - totalGap - baseChipW * n);

  const innerMinH = INNER_PAD_X2 + 48;
  const roofW = frameWidth * 0.56;

  return (
    <View style={styles.container}>
      <View style={[styles.houseColumn, { width: frameWidth }]}>
        <View style={[styles.roofCap, { width: roofW, height: 12 }]} />
        <View style={styles.outerShell}>
          <View style={[styles.innerFloor, { minHeight: innerMinH }]}>
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
                        borderColor: isSelected ? accentColor : neutral.border,
                        backgroundColor: isSelected ? brandTintBg : neutral.surface,
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 6 },
  houseColumn: { alignSelf: "center", alignItems: "center" },
  roofCap: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: neutral.slate300,
    marginBottom: 2,
  },
  outerShell: {
    width: "100%",
    borderWidth: 2,
    borderColor: neutral.slate300,
    borderRadius: 14,
    backgroundColor: neutral.backgroundSubtle,
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  innerFloor: {
    borderWidth: 1,
    borderColor: neutral.border,
    borderRadius: 12,
    backgroundColor: neutral.backgroundElevated,
    padding: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  chipLabel: { textAlign: "center" },
  chipPressed: { opacity: 0.88 },
});

export default FloorPlanSvg;
