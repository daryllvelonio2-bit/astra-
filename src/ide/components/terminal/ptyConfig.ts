/**
 * Phase 2 feature flag. true = PTY-backed sessions rendered with xterm.js;
 * false = legacy pipe sessions with the RN scrollback renderer.
 * Task tabs always use the legacy renderer (read-only logs).
 */
export const PTY_XTERM_ENABLED = true;

/**
 * Handshake stamp shown in the terminal banner. Bump on every shipped
 * terminal batch so a glance answers "is the phone running my latest JS?".
 */
export const TERMINAL_BUILD_TAG = "b9";
