import React, {
  forwardRef,
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
}

interface GlueMessage {
  type: "ready" | "data" | "resize" | "selection";
  data?: string;
  cols?: number;
  rows?: number;
  text?: string;
}

// Max base64 chars per injected write; keeps injectJavaScript calls small.
const WRITE_SLICE = 65536;

export const XtermView = forwardRef<XtermViewHandle, XtermViewProps>(function XtermView(
  { sessionId, fontSize, background, foreground, cursor, onRemoteResize },
  ref
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const selResolveRef = useRef<((text: string) => void) | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;
  const resizeRef = useRef(onRemoteResize);
  resizeRef.current = onRemoteResize;

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
      queueRef.current.push(utf8ToB64(text));
      flushQueue();
    },
  }));

  // Session lifecycle: subscribe to the native stream, replay history into a
  // fresh grid on switch, surface exits as an on-screen marker.
  useEffect(() => {
    readyRef.current = false;
    queueRef.current = [];

    const dataSub = addTerminalDataListener(sessionId, (chunk: string) => {
      if (!readyRef.current) return; // covered by the history replay below
      queueRef.current.push(utf8ToB64(chunk));
    });

    const exitSub = addTerminalExitListener(sessionId, (code: number) => {
      queueRef.current.push(utf8ToB64(`\r\n[Process completed: exit ${code}]\r\n`));
      flushQueue();
    });

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
    readyRef.current = true;
    try {
      const hist = await getSessionHistory(sessionRef.current);
      webRef.current?.injectJavaScript("window.__astraReset&&window.__astraReset();true;");
      if (hist) injectWrite(utf8ToB64(hist));
      webRef.current?.injectJavaScript("window.__astraFit&&window.__astraFit();true;");
    } catch (_) {}
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
      resizeTerminalSession(sessionRef.current, msg.cols, msg.rows);
      resizeRef.current?.(msg.cols, msg.rows);
    } else if (msg.type === "selection") {
      selResolveRef.current?.(msg.text || "");
      selResolveRef.current = null;
    }
  };

  return (
    <WebView
      ref={webRef}
      source={{ html }}
      style={styles.web}
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
});

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
