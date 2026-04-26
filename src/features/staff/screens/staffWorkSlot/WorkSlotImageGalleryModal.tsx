/**
 * Xem ảnh toàn màn, vuốt trái/phải (paging) — dùng chung màn xác nhận kiểm định và modal chỉnh thiết bị.
 * Không bọc FlatList bằng Pressable: có thể chặn cử chỉ ngang; nền đóng = Pressable tuyệt đối phía dưới.
 */
import React, { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { staffWorkSlotModalStyles as M } from "./staffWorkSlotModalStyles";

export type WorkSlotImageGalleryModalProps = {
  visible: boolean;
  uris: string[];
  initialIndex: number;
  onClose: () => void;
};

export function WorkSlotImageGalleryModal({
  visible,
  uris,
  initialIndex,
  onClose,
}: WorkSlotImageGalleryModalProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  /** Cùng logic padding với `imageModalBackdrop` (paddingHorizontal 16). */
  const pageW = Math.max(280, winW - 32);
  const imageH = Math.min(winH * 0.52, 480);
  const listRef = useRef<FlatList<string>>(null);
  const safeLen = uris.length;
  const safeIndex = safeLen > 0 ? Math.max(0, Math.min(initialIndex, safeLen - 1)) : 0;

  const scrollToInitial = useCallback(() => {
    if (safeLen === 0) return;
    listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
  }, [safeIndex, safeLen]);

  useEffect(() => {
    if (!visible || safeLen === 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToInitial);
    });
    return () => cancelAnimationFrame(id);
  }, [visible, initialIndex, safeIndex, safeLen, scrollToInitial]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={M.imageModalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="close gallery backdrop"
        />
        <View style={[M.imageModalContent, { alignSelf: "center", maxWidth: pageW, zIndex: 1 }]}>
          <Pressable style={M.imageModalClose} onPress={onClose} hitSlop={8}>
            <Text style={M.imageModalCloseText}>×</Text>
          </Pressable>
          {safeLen > 0 ? (
            <View style={{ width: pageW, height: imageH + 8 }}>
              <FlatList
                ref={listRef}
                style={{ width: pageW }}
                data={uris}
                horizontal
                pagingEnabled
                bounces
                keyExtractor={(uri, i) => `${i}-${uri}`}
                showsHorizontalScrollIndicator
                removeClippedSubviews={false}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    listRef.current?.scrollToIndex({ index: info.index, animated: false });
                  }, 100);
                }}
                getItemLayout={(_data, index) => ({
                  length: pageW,
                  offset: pageW * index,
                  index,
                })}
                renderItem={({ item: uri }) => (
                  <View
                    style={{
                      width: pageW,
                      height: imageH + 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: pageW - 8, height: imageH }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
