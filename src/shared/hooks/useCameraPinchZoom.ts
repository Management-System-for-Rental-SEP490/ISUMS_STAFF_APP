import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gesture } from "react-native-gesture-handler";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Độ nhạy pinch → `CameraView.zoom` (0–1). */
const PINCH_SENSITIVITY = 0.55;

/**
 * Pinch 2 ngón: banh ra → zoom in, chụm lại → zoom out (theo `expo-camera` `zoom` 0–1).
 */
export function useCameraPinchZoom() {
  const [zoom, setZoom] = useState(0);
  const zoomRef = useRef(0);
  const pinchStartZoomRef = useRef(0);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          pinchStartZoomRef.current = zoomRef.current;
        })
        .onUpdate((e) => {
          const next = clamp(
            pinchStartZoomRef.current + (e.scale - 1) * PINCH_SENSITIVITY,
            0,
            1
          );
          setZoom(next);
          zoomRef.current = next;
        }),
    []
  );

  const resetZoom = useCallback(() => {
    setZoom(0);
    zoomRef.current = 0;
  }, []);

  return { zoom, pinchGesture, resetZoom };
}
