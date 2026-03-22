/**
 * Sơ đồ một tầng: ảnh house.png nền, nhãn khu vực theo position từ BE (hoặc fallback).
 */
import React, { useMemo } from "react";
import { View, useWindowDimensions, Pressable, StyleSheet, Image } from "react-native";
import Svg, { G, Text as SvgText } from "react-native-svg";
import type { FunctionalAreaFromApi } from "../../../shared/types/api";
import { brandPrimary } from "../../../shared/theme/color";
import { mapLabelForFunctionalArea } from "../../../shared/utils";
import { getPositionForArea } from "./floorPlanPositions";

interface FloorPlanSvgProps {
  areas: FunctionalAreaFromApi[];
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
  accentColor?: string;
}

type AreaLayout = { area: FunctionalAreaFromApi; rect: { x: number; y: number; w: number; h: number } };

function getAreaLayouts(areas: FunctionalAreaFromApi[]): AreaLayout[] {
  return areas.map((area, i) => {
    const pos = getPositionForArea(area, i);
    return {
      area,
      rect: { x: pos.x, y: pos.y, w: pos.width, h: pos.height },
    };
  });
}

const FloorPlanSvg: React.FC<FloorPlanSvgProps> = ({
  areas,
  selectedAreaId,
  onSelectArea,
  accentColor = brandPrimary,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const svgSize = Math.min(screenWidth - 16, 400);
  const layout = useMemo(() => getAreaLayouts(areas), [areas]);

  if (areas.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.planWrapper, { width: svgSize, height: svgSize }]} collapsable={false}>
        <Image
          source={require("../../../../assets/house.png")}
          style={styles.backgroundImage}
          resizeMode="contain"
        />
        <Svg width={svgSize} height={svgSize} viewBox="0 0 100 100" style={styles.svgOverlay}>
          {layout.map(({ area, rect }) => {
            const isSelected = selectedAreaId === area.id;
            return (
              <G key={area.id}>
                <SvgText
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2}
                  textAnchor="middle"
                  fontSize={isSelected ? 6 : 5}
                  fill={isSelected ? accentColor : "#1e293b"}
                  fontWeight={isSelected ? "bold" : "normal"}
                >
                  {mapLabelForFunctionalArea(area.name)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        {layout.map(({ area, rect }) => {
          const isSelected = selectedAreaId === area.id;
          const scale = isSelected ? 1.05 : 1;
          const left = (rect.x / 100) * svgSize;
          const top = (rect.y / 100) * svgSize;
          const w = (rect.w / 100) * svgSize;
          const h = (rect.h / 100) * svgSize;
          return (
            <Pressable
              key={area.id}
              style={[
                styles.areaOverlay,
                {
                  left,
                  top,
                  width: w,
                  height: h,
                  transform: [{ scale }],
                },
              ]}
              onPress={() => onSelectArea(area.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 4 },
  planWrapper: {
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  areaOverlay: {
    position: "absolute",
    backgroundColor: "transparent",
  },
});

export default FloorPlanSvg;
