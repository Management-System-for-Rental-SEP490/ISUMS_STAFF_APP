/**
 * Sơ đồ một tầng: Cover_Floor_Plan.png nền, nhãn khu vực theo position từ BE (hoặc fallback).
 */
import React, { useMemo } from "react";
import { View, useWindowDimensions, Pressable, StyleSheet, Image } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import type { FunctionalAreaFromApi } from "../../../shared/types/api";
import { brandPrimary } from "../../../shared/theme/color";
import { mapLabelForFunctionalArea } from "../../../shared/utils";
import { FLOOR_PLAN_IMAGE_ASPECT, getPositionForArea } from "./floorPlanPositions";

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
  const planWidth = Math.min(screenWidth - 24, 440);
  const planHeight = planWidth / FLOOR_PLAN_IMAGE_ASPECT;
  const layout = useMemo(() => getAreaLayouts(areas), [areas]);

  if (areas.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.planWrapper, { width: planWidth, height: planHeight }]} collapsable={false}>
        <Image
          source={require("../../../../assets/Cover_Floor_Plan.png")}
          style={styles.backgroundImage}
          resizeMode="contain"
        />
        <Svg width={planWidth} height={planHeight} viewBox="0 0 100 100" style={styles.svgOverlay}>
          {layout.map(({ area, rect }) => {
            const isSelected = selectedAreaId === area.id;
            const areaLabel = mapLabelForFunctionalArea(area.name);
            const centerX = rect.x + rect.w / 2;
            const centerY = rect.y + rect.h / 2;
            const frameWidth = Math.max(20, Math.min(Math.max(rect.w * 0.9, areaLabel.length * 2.2), 42));
            const frameHeight = isSelected ? 33 : 33;
            return (
              <G key={area.id}>
                <Rect
                  x={centerX - frameWidth / 2}
                  y={centerY - frameHeight / 2}
                  width={frameWidth}
                  height={frameHeight}
                  rx={1.2}
                  ry={1.2}
                  fill={isSelected ? "#ffffff" : "#f8fafc"}
                  fillOpacity={isSelected ? 0.98 : 0.9}
                  stroke={isSelected ? accentColor : "#0f172a"}
                  strokeWidth={isSelected ? 0.9 : 0.7}
                />
                <SvgText
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  fontSize={isSelected ? 6 : 5}
                  alignmentBaseline="middle"
                  fill={isSelected ? accentColor : "#0f172a"}
                  fontWeight="700"
                >
                  {areaLabel}
                </SvgText>
              </G>
            );
          })}
        </Svg>
        {layout.map(({ area, rect }) => {
          const isSelected = selectedAreaId === area.id;
          const scale = isSelected ? 1.05 : 1;
          const left = (rect.x / 100) * planWidth;
          const top = (rect.y / 100) * planHeight;
          const w = (rect.w / 100) * planWidth;
          const h = (rect.h / 100) * planHeight;
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
  container: { alignItems: "center", paddingVertical: 6 },
  planWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
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
