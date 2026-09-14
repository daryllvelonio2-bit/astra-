import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Animated } from "react-native";
import { RunningTask } from "../../ai/services/runningTasksService";

interface StylesParams {
  runningTasks: RunningTask[];
  bgPrimary: string;
  desktopFullscreen: boolean;
  isLandscape: boolean;
  insetTop: number;
  insetLeft: number;
  insetRight: number;
  sidebarWidthAnim: Animated.Value;
}

/** Memoized layout styles + running count. Same visuals, stable refs. */
export function useIDELayoutStyles(p: StylesParams) {
  const runningTaskCount = useMemo(
    () => p.runningTasks.reduce((n, t) => (t.status === "running" ? n + 1 : n), 0),
    [p.runningTasks]
  );
  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: p.bgPrimary,
        paddingTop: p.desktopFullscreen || p.isLandscape ? 0 : p.insetTop,
        paddingLeft: p.desktopFullscreen || p.isLandscape ? 0 : p.insetLeft,
        paddingRight: p.desktopFullscreen || p.isLandscape ? 0 : p.insetRight,
      },
    ],
    [p.bgPrimary, p.desktopFullscreen, p.isLandscape, p.insetTop, p.insetLeft, p.insetRight]
  );
  const sidebarAnimStyle = useMemo(
    () => [styles.sidebarWrapper, { width: p.sidebarWidthAnim }],
    [p.sidebarWidthAnim]
  );
  return { runningTaskCount, containerStyle, sidebarAnimStyle };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sidebarWrapper: { height: "100%" },
});
