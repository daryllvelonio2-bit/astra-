import { useState, useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Calculates keyboard padding for pinning the shortcut row above the soft keyboard.
 * On Android edge-to-edge, the layout can leave keys behind the keyboard, so this
 * pads by the measured height (plus Android system nav bar insets) minus any OS-reclaimed layout shrinkage.
 */
export function useTerminalKeyboardPad(windowHeight: number): number {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const closedHeightRef = useRef(windowHeight);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const navOffset = Platform.OS === "android" ? Math.max(insets.bottom, 0) : 0;
      setKeyboardHeight(e.endCoordinates.height + navOffset);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    if (keyboardHeight === 0 && windowHeight > 0) {
      closedHeightRef.current = Math.max(closedHeightRef.current, windowHeight);
    }
  }, [keyboardHeight, windowHeight]);

  const osReclaimed = Math.max(0, closedHeightRef.current - windowHeight);
  return Math.max(0, keyboardHeight - osReclaimed);
}
