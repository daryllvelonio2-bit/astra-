import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
} from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { buildCodeMirrorHtml } from "./codemirrorHtml.generated";

export interface CodeMirrorEditorHandle {
  jumpToLine: (line: number) => void;
  undo: () => void;
  redo: () => void;
  focus: () => void;
}

interface CodeMirrorEditorViewProps {
  content: string;
  fileName?: string;
  onChangeContent: (text: string) => void;
  theme: any;
  fontSize: number;
  lineHeight: number;
  isEditing: boolean;
  keyboardMouseMode?: boolean;
  onCursorChange?: (line: number, col: number) => void;
  onEnterEditMode?: () => void;
}

export const CodeMirrorEditorView = memo(
  forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorViewProps>(
    function CodeMirrorEditorView(
      {
        content,
        fileName,
        onChangeContent,
        theme,
        fontSize,
        lineHeight,
        isEditing,
        keyboardMouseMode = false,
        onCursorChange,
        onEnterEditMode,
      },
      ref
    ) {
      const webViewRef = useRef<WebView>(null);
      const isReadyRef = useRef(false);
      const [, setIsReady] = useState(false);
      const lastEmittedTextRef = useRef(content);
      const lastPropContentRef = useRef(content);
      const currentFileNameRef = useRef(fileName);

      const html = useRef(
        buildCodeMirrorHtml({
          background: theme.bgPrimary || "#1e1e1e",
          isDark: theme.isDark !== false,
        })
      ).current;

      const inject = useCallback((js: string) => {
        try {
          webViewRef.current?.injectJavaScript(`${js};true;`);
        } catch (_) {}
      }, []);

      useImperativeHandle(
        ref,
        () => ({
          jumpToLine: (line: number) => {
            inject(`window.__cmJumpToLine && window.__cmJumpToLine(${line})`);
          },
          undo: () => {
            inject(`window.__cmUndo && window.__cmUndo()`);
          },
          redo: () => {
            inject(`window.__cmRedo && window.__cmRedo()`);
          },
          focus: () => {
            inject(`window.__cmFocus && window.__cmFocus()`);
          },
        }),
        [inject]
      );

      // Handle message from CodeMirror inside WebView
      const handleMessage = useCallback(
        (event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (!data || typeof data.type !== "string") return;

            if (data.type === "ready") {
              isReadyRef.current = true;
              setIsReady(true);
              // Push initial state
              const safeText = JSON.stringify(lastPropContentRef.current || "");
              const safeName = JSON.stringify(currentFileNameRef.current || "");
              inject(`window.__cmSetContent && window.__cmSetContent(${safeText}, ${safeName})`);
              inject(`window.__cmSetFontSize && window.__cmSetFontSize(${fontSize}, ${lineHeight})`);
              inject(`window.__cmSetTheme && window.__cmSetTheme(${theme.isDark !== false})`);
              inject(`window.__cmSetKeyboardMouseMode && window.__cmSetKeyboardMouseMode(${!!keyboardMouseMode})`);
              inject(`window.__cmSetReadOnly && window.__cmSetReadOnly(${!isEditing})`);
            } else if (data.type === "change" && typeof data.text === "string") {
              lastEmittedTextRef.current = data.text;
              onChangeContent(data.text);
            } else if (data.type === "cursor") {
              onCursorChange?.(data.line || 1, data.col || 1);
            } else if (data.type === "doubleTap") {
              onEnterEditMode?.();
            }
          } catch (_) {}
        },
        [inject, fontSize, lineHeight, theme.isDark, isEditing, keyboardMouseMode, onChangeContent, onCursorChange, onEnterEditMode]
      );

      // Sync content when changed from outside (e.g. file switched, format, disk reload)
      useEffect(() => {
        lastPropContentRef.current = content;
        currentFileNameRef.current = fileName;
        if (!isReadyRef.current) return;

        if (content !== lastEmittedTextRef.current || fileName !== currentFileNameRef.current) {
          lastEmittedTextRef.current = content;
          const safeText = JSON.stringify(content || "");
          const safeName = JSON.stringify(fileName || "");
          inject(`window.__cmSetContent && window.__cmSetContent(${safeText}, ${safeName})`);
        }
      }, [content, fileName, inject]);

      // Sync font size and line height
      useEffect(() => {
        if (!isReadyRef.current) return;
        inject(`window.__cmSetFontSize && window.__cmSetFontSize(${fontSize}, ${lineHeight})`);
      }, [fontSize, lineHeight, inject]);

      // Sync dark / light theme
      useEffect(() => {
        if (!isReadyRef.current) return;
        inject(`window.__cmSetTheme && window.__cmSetTheme(${theme.isDark !== false})`);
      }, [theme.isDark, inject]);

      // Sync read-only / lock mode
      useEffect(() => {
        if (!isReadyRef.current) return;
        inject(`window.__cmSetReadOnly && window.__cmSetReadOnly(${!isEditing})`);
        if (isEditing) {
          inject(`window.__cmFocus && window.__cmFocus()`);
        }
      }, [isEditing, inject]);

      // Sync keyboard & mouse mode
      useEffect(() => {
        if (!isReadyRef.current) return;
        inject(`window.__cmSetKeyboardMouseMode && window.__cmSetKeyboardMouseMode(${!!keyboardMouseMode})`);
      }, [keyboardMouseMode, inject]);

      return (
        <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
          <WebView
            ref={webViewRef}
            source={{ html }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            androidLayerType="hardware"
            onMessage={handleMessage}
            style={[styles.webView, { backgroundColor: theme.bgPrimary }]}
            containerStyle={{ backgroundColor: theme.bgPrimary }}
          />
        </View>
      );
    }
  )
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
  },
});
