import {
  checkOverlayPermission,
  requestOverlayPermission,
  startFloatingOverlay,
  stopFloatingOverlay,
  isFloatingOverlayRunning,
  collapseOverlay,
  expandOverlay,
  openMainApp,
} from "../../../modules/linux-runner/src";

export interface FloatingOverlayOptions {
  workspaceId?: string;
  activeFileName?: string;
}

export const FloatingOverlay = {
  /**
   * Check if SYSTEM_ALERT_WINDOW (Draw over other apps) permission is granted on Android
   */
  async hasPermission(): Promise<boolean> {
    return await checkOverlayPermission();
  },

  /**
   * Request SYSTEM_ALERT_WINDOW permission by opening the system settings page
   */
  async requestPermission(): Promise<boolean> {
    return await requestOverlayPermission();
  },

  /**
   * Start the Android System-Wide Floating Chat Head
   */
  async start(options?: FloatingOverlayOptions): Promise<boolean> {
    const hasPerm = await this.hasPermission();
    if (!hasPerm) {
      await this.requestPermission();
      return false;
    }
    return await startFloatingOverlay(options);
  },

  /**
   * Stop and remove the floating overlay
   */
  async stop(): Promise<boolean> {
    return await stopFloatingOverlay();
  },

  /**
   * Check if the floating overlay service is currently running
   */
  async isRunning(): Promise<boolean> {
    return await isFloatingOverlayRunning();
  },

  /**
   * Collapse the floating window back to a small floating bubble chathead
   */
  async collapseToBubble(): Promise<boolean> {
    return await collapseOverlay();
  },

  /**
   * Expand the floating bubble chathead to the full mini chat modal window
   */
  async expandToWindow(): Promise<boolean> {
    return await expandOverlay();
  },

  /**
   * Bring the main AI Coder app to the foreground
   */
  async bringAppToFront(): Promise<boolean> {
    return await openMainApp();
  },
};
