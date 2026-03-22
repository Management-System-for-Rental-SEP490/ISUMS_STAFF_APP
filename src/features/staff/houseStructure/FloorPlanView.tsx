/**
 * Wrapper hiển thị sơ đồ nhà: ảnh house.png làm nền, các khu vực theo position.
 * Mặc định vào Tầng 1, hiển thị "Tất cả tầng" cho đến khi user bấm chọn khu vực cụ thể.
 */
import React, { useMemo } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { FunctionalAreaFromApi } from "../../../shared/types/api";
import FloorPlanSvg from "./FloorPlanSvg";
import { brandPrimary } from "../../../shared/theme/color";

export interface FloorPlanViewProps {
  /** "1" | "2" | ... = tầng cụ thể (không còn "all"). */
  selectedFloor: string;
  /** ID khu vực đang chọn. "all" = tất cả tầng (không highlight khu vực nào). */
  selectedAreaId: string;
  /** Danh sách khu vực từ API. */
  functionalAreas: FunctionalAreaFromApi[];
  /** Callback khi bấm vào khu vực trên sơ đồ. */
  onSelectArea: (areaId: string) => void;
  /** Màu accent highlight sơ đồ (mặc định palette thương hiệu). */
  accentColor?: string;
  /** Gộp thêm style wrapper (ví dụ margin gần thanh tầng). */
  containerStyle?: StyleProp<ViewStyle>;
}

const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  selectedFloor,
  selectedAreaId,
  functionalAreas,
  onSelectArea,
  accentColor = brandPrimary,
  containerStyle,
}) => {
  const safeAreas = Array.isArray(functionalAreas) ? functionalAreas : [];
  const areasOfFloor = useMemo(() => {
    const floorKey = (a: (typeof safeAreas)[0]) => {
      const s = String(a.floorNo ?? "").trim();
      return s || "1";
    };
    return safeAreas.filter((a) => floorKey(a) === selectedFloor);
  }, [safeAreas, selectedFloor]);

  if (areasOfFloor.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <FloorPlanSvg
        areas={areasOfFloor}
        selectedAreaId={selectedAreaId}
        onSelectArea={onSelectArea}
        accentColor={accentColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  /** Sát thanh chọn tầng; khoảng dưới vừa đủ tách block tiếp theo. */
  container: {
    marginTop: 0,
    marginBottom: 8,
  },
});

export default FloorPlanView;
