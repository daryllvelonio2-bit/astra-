import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import {
  addTerminalDataListener,
  addTerminalExitListener,
  getSessionHistory,
  resizeTerminalSession,
  writeTerminalInput,
} from "../../../../modules/linux-runner/src";
import { buildXtermHtml } from "./xtermHtml.generated";
import { utf8ToB64 } from "./terminalEncoding";

export interface XtermViewHandle {
  focusTerminal: () => void;
  requestSelection: () => Promise<string>;
  writeText: (text: string) => void;
}

interface XtermViewProps {
  sessionId: string;
  fontSize: number;
  background: string;
  foreground: string;
  cursor: string;
  onRemoteResize?: (cols: number, rows: number) => void;
  /** WebView tapped: the soft keyboard lives on the RN catcher — raise it. */
  onRequestKeyboard?: () => void;
}

interface GlueMessage {
  type: "ready" | "data" | "resize" | "selection" | "tap";
  data?: string;
  cols?: number;
  rows?: number;
  text?: string;
}

// Max base64 chars per injected write; keeps injectJavaScript calls small.
const WRITE_SLICE = 65536;
// Max queued chunks (~2KB each). Beyond this on runaway floods we drop from
// the front rather than OOM; the native history still caps the true record.
const MAX_QUEUE = 512;

export const XtermView = memo(
  forwardRef<XtermViewHandle, XtermViewProps>(function XtermView(
    { sessionId, fontSize, background, foreground, cursor, onRemoteResize, onRequestKeyboard },
    ref
  ) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pageLoadedRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const selResolveRef = useRef<((text: string) => void) | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;
  const resizeRef = useRef(onRemoteResize);
  resizeRef.current = onRemoteResize;
  const keyboardRef = useRef(onRequestKeyboard);
  keyboardRef.current = onRequestKeyboard;

  const html = useMemo(
    () => buildXtermHtml({ background, foreground, cursor, fontSize: 13 }),
    [background, foreground, cursor]
  );

  const injectWrite = (b64: string) => {
    for (let i = 0; i < b64.length; i += WRITE_SLICE) {
      const piece = b64.slice(i, i + WRITE_SLICE);
      webRef.current?.injectJavaScript(`window.__astraWrite('${piece}');true;`);
    }
  };

  const enqueue = (b64: string) => {
    queueRef.current.push(b64);
    if (queueRef.current.length > MAX_QUEUE) {
      queueRef.current.splice(0, queueRef.current.length - MAX_QUEUE);
    }
  };

  const flushQueue = () => {
    if (!readyRef.current || queueRef.current.length === 0) return;
    const joined = queueRef.current.join("");
    queueRef.current = [];
    injectWrite(joined);
  };

  useImperativeHandle(ref, () => ({
    focusTerminal: () => {
      webRef.current?.injectJavaScript("window.__astraFocus&&window.__astraFocus();true;");
    },
    requestSelection: () => {
      return new Promise<string>((resolve) => {
        selResolveRef.current = resolve;
        webRef.current?.injectJavaScript(
          "window.__astraGetSelection&&window.__astraGetSelection();true;"
        );
        setTimeout(() => {
          if (selResolveRef.current) {
            selResolveRef.current = null;
            resolve("");
          }
        }, 1500);
      });
    },
    writeText: (text: string) => {
      if (!text) return;
      enqueue(utf8ToB64(text));
      flushQueue();
    },
  }));

  // Reset + paint the native history snapshot for `id`. Atomic by
  // construction: the ready gate stays closed until the snapshot lands, so a
  // live byte can neither duplicate (snapshot + queue) nor slip through.
  // Native appends to history before emitting, so dropped pre-ready bytes
  // are always inside the snapshot.
  const replaySession = async (id: string) => {
    try {
      webRef.current?.injectJavaScript("window.__astraReset&&window.__astraReset();true;");
      const hist = await getSessionHistory(id);
      if (sessionRef.current !== id) return; // switched away mid-flight
      if (hist) injectWrite(utf8ToB64(hist));
      webRef.current?.injectJavaScript("window.__astraFit&&window.__astraFit();true;");
    } catch (_) {}
  };

  // Session lifecycle: subscribe to the native stream; paint the new session
  // on switch. Pre-ready bytes are dropped (covered by the replay snapshot).
  useEffect(() => {
    readyRef.current = false;
    queueRef.current = [];

    const dataSub = addTerminalDataListener(sessionId, (chunk: string) => {
      if (!readyRef.current) return;
      enqueue(utf8ToB64(chunk));
    });

    const exitSub = addTerminalExitListener(sessionId, (code: number) => {
      enqueue(utf8ToB64(`\r\n[Process completed: exit ${code}]\r\n`));
      flushQueue();
    });

    // Tab switch onto an already-loaded page: paint before latching ready.
    // First mount waits for the page 'ready' message instead (see below).
    if (pageLoadedRef.current) {
      replaySession(sessionId).then(() => {
        if (sessionRef.current === sessionId) {
          readyRef.current = true;
          flushQueue();
        }
      });
    }

    const flusher = setInterval(flushQueue, 80);
    return () => {
      clearInterval(flusher);
      dataSub.remove();
      exitSub.remove();
    };
  }, [sessionId]);

  // Font zoom follows the terminal fontSize setting.
  useEffect(() => {
    if (readyRef.current) {
      webRef.current?.injectJavaScript(
        `window.__astraSetFontSize&&window.__astraSetFontSize(${fontSize});true;`
      );
    }
  }, [fontSize]);

  const handleReady = async () => {
    pageLoadedRef.current = true;
    readyRef.current = false;
    await replaySession(sessionRef.current);
    readyRef.current = true;
    flushQueue();
  };

  const handleMessage = (e: any) => {
    let msg: GlueMessage;
    try {
      msg = JSON.parse(e?.nativeEvent?.data || "{}");
    } catch (_) {
      return;
    }
    if (msg.type === "ready") {
      handleReady();
    } else if (msg.type === "data" && typeof msg.data === "string") {
      writeTerminalInput(sessionRef.current, msg.data);
    } else if (
      msg.type === "resize" &&
      typeof msg.cols === "number" &&
      typeof msg.rows === "number"
    ) {
      if (__DEV__) {
        console.log(
          `[xterm-grid] cols=${msg.cols} rows=${msg.rows} vw=${(msg as any).vw} vh=${(msg as any).vh}`
        );
      }
      resizeTerminalSession(sessionRef.current, msg.cols, msg.rows);
      resizeRef.current?.(msg.cols, msg.rows);
    } else if (msg.type === "selection") {
      selResolveRef.current?.(msg.text || "");
      selResolveRef.current = null;
    } else if (msg.type === "tap") {
      keyboardRef.current?.();
    }
  };

  return (
    <WebView
      ref={webRef}
      source={{ html }}
      style={styles.web}
      // The wrapper View defaults to wrap-content: without its own flex the
      // WebView never fills the column, fit measures a short viewport, and
      // the shell inherits a too-small grid (early scroll + wrap mismatch).
      containerStyle={styles.webContainer}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled={false}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      overScrollMode="never"
      androidLayerType="hardware"
      onMessage={handleMessage}
    />
  );
  })
);

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webContainer: {
    flex: 1,
  },
});
