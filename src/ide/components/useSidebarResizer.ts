import { useRef, useState } from "react";
import { Animated, PanResponder } from "react-native";

export function useSidebarResizer(initialWidth: number = 130) {
  const sidebarWidthAnim = useRef(new Animated.Value(initialWidth)).current;
  const currentWidthRef = useRef(initialWidth);
  const dragStartWidthRef = useRef(initialWidth);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const resizerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dx) > 4,
      onPanResponderGrant: () => {
        setIsDraggingSidebar(true);
        dragStartWidthRef.current = currentWidthRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const newWidth = Math.max(90, Math.min(320, dragStartWidthRef.current + gestureState.dx));
        currentWidthRef.current = newWidth;
        sidebarWidthAnim.setValue(newWidth);
      },
      onPanResponderRelease: () => setIsDraggingSidebar(false),
      onPanResponderTerminate: () => setIsDraggingSidebar(false),
    })
  ).current;

  return {
    sidebarWidthAnim,
    isDraggingSidebar,
    resizerPanHandlers: resizerPanResponder.panHandlers,
  };
}
