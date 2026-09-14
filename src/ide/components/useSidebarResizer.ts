import { useRef, useState } from "react";
import { Animated, PanResponder } from "react-native";

const MIN_WIDTH = 90;
const MAX_WIDTH = 320;
// Balanced resistance factor: responsive yet distinct from normal resize
const RESISTANCE_FACTOR = 0.65;
// Collapse threshold: width dragged to <= 65 triggers auto-minimize
const COLLAPSE_WIDTH_THRESHOLD = 65;

export function useSidebarResizer(initialWidth: number = 130, onCollapse?: () => void) {
  const sidebarWidthAnim = useRef(new Animated.Value(initialWidth)).current;
  const currentWidthRef = useRef(initialWidth);
  const dragStartWidthRef = useRef(initialWidth);
  const lastValidWidthRef = useRef(initialWidth);
  const onCollapseRef = useRef(onCollapse);
  onCollapseRef.current = onCollapse;
  const isCollapsingRef = useRef(false);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const resizerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        if (isCollapsingRef.current) return;
        setIsDraggingSidebar(true);
        dragStartWidthRef.current = currentWidthRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isCollapsingRef.current) return;
        const rawWidth = dragStartWidthRef.current + gestureState.dx;

        let targetWidth: number;
        if (rawWidth > MAX_WIDTH) {
          // Slight rubber-band stretch past max width
          targetWidth = MAX_WIDTH + (rawWidth - MAX_WIDTH) * 0.2;
        } else if (rawWidth >= MIN_WIDTH) {
          // Normal 1:1 smooth resizing
          targetWidth = rawWidth;
          lastValidWidthRef.current = rawWidth;
        } else {
          // Below MIN_WIDTH: moderate resistance provides tactile feedback before collapse zone
          const deltaPastMin = MIN_WIDTH - rawWidth;
          targetWidth = Math.max(20, MIN_WIDTH - deltaPastMin * RESISTANCE_FACTOR);
        }

        currentWidthRef.current = targetWidth;
        sidebarWidthAnim.setValue(targetWidth);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isCollapsingRef.current) return;

        const currentW = currentWidthRef.current;
        // Auto-minimize when swiped into collapse zone (<= 65) or smooth left flick (vx < -0.45 while <= 85)
        const shouldMinimize =
          currentW <= COLLAPSE_WIDTH_THRESHOLD ||
          (gestureState.vx < -0.45 && currentW <= 85);

        if (shouldMinimize && onCollapseRef.current) {
          isCollapsingRef.current = true;
          setIsDraggingSidebar(false);
          // Animate smoothly to 0 then trigger collapse
          Animated.timing(sidebarWidthAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            const restoreWidth = Math.max(MIN_WIDTH, lastValidWidthRef.current || initialWidth);
            sidebarWidthAnim.setValue(restoreWidth);
            currentWidthRef.current = restoreWidth;
            isCollapsingRef.current = false;
            onCollapseRef.current?.();
          });
        } else {
          setIsDraggingSidebar(false);
          // Less sensitive: if not swiped all the way, snap back safely to MIN_WIDTH!
          const snapWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, currentW));
          currentWidthRef.current = snapWidth;
          lastValidWidthRef.current = snapWidth;
          Animated.spring(sidebarWidthAnim, {
            toValue: snapWidth,
            useNativeDriver: false,
            bounciness: 4,
            speed: 16,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (isCollapsingRef.current) return;
        setIsDraggingSidebar(false);
        const snapWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, currentWidthRef.current));
        currentWidthRef.current = snapWidth;
        sidebarWidthAnim.setValue(snapWidth);
      },
    })
  ).current;

  return {
    sidebarWidthAnim,
    isDraggingSidebar,
    resizerPanHandlers: resizerPanResponder.panHandlers,
  };
}
