import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";
import { json as jsonLang } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

(function () {
  const languageCompartment = new Compartment();
  const themeCompartment = new Compartment();
  const fontSizeCompartment = new Compartment();
  const readOnlyCompartment = new Compartment();
  const editableCompartment = new Compartment();
  const kmmCompartment = new Compartment();

  let isInternalUpdate = false;
  let currentFileName = "";
  let isKmmMode = false;
  let lastTouchTime = 0;

  const post = (msg) => {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (_) {}
  };

  function getLanguageExtension(fileName) {
    if (!fileName) return [];
    const ext = (fileName.includes(".") ? fileName.split(".").pop() : fileName).toLowerCase();
    switch (ext) {
      case "py":
      case "pyw":
        return python();
      case "js":
      case "mjs":
      case "cjs":
        return javascript();
      case "jsx":
        return javascript({ jsx: true });
      case "ts":
        return javascript({ typescript: true });
      case "tsx":
        return javascript({ jsx: true, typescript: true });
      case "html":
      case "htm":
        return htmlLang();
      case "css":
      case "scss":
      case "less":
        return cssLang();
      case "json":
      case "jsonc":
        return jsonLang();
      default:
        return [];
    }
  }

  function createFontTheme(fontSize, lineHeight) {
    const fs = fontSize || 14;
    const lh = lineHeight ? `${lineHeight}px` : `${Math.round(fs * 1.45)}px`;
    return EditorView.theme({
      "&": {
        fontSize: `${fs}px`,
      },
      ".cm-content": {
        fontFamily: 'ui-monospace, "SF Mono", "Roboto Mono", "JetBrains Mono", Menlo, Consolas, monospace',
        lineHeight: lh,
      },
      ".cm-line": {
        lineHeight: lh,
      },
      ".cm-gutters": {
        fontFamily: 'ui-monospace, "SF Mono", "Roboto Mono", "JetBrains Mono", Menlo, Consolas, monospace',
        fontSize: `${Math.max(9, fs - 2)}px`,
        lineHeight: lh,
      },
      ".cm-gutterElement": {
        lineHeight: lh,
      },
    });
  }

  const customLightTheme = EditorView.theme({
    "&": {
      color: "#24292e",
      backgroundColor: "#ffffff",
    },
    ".cm-content": {
      caretColor: "#0969da",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#0969da",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#b4d5fe",
    },
    ".cm-gutters": {
      backgroundColor: "#f6f8fa",
      color: "#6e7781",
      borderRight: "1px solid #d0d7de",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(0, 0, 0, 0.06)",
      color: "#24292e",
    },
  }, { dark: false });

  const startState = EditorState.create({
    doc: "",
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      languageCompartment.of([]),
      themeCompartment.of(oneDark),
      fontSizeCompartment.of(createFontTheme(14, 20)),
      readOnlyCompartment.of(EditorState.readOnly.of(true)),
      editableCompartment.of(EditorView.editable.of(false)),
      kmmCompartment.of([]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isInternalUpdate) {
          post({ type: "change", text: update.state.doc.toString() });
        }
        if (update.selectionSet) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          post({
            type: "cursor",
            line: line.number,
            col: pos - line.from + 1,
            totalLines: update.state.doc.lines,
          });
        }
      }),
      EditorView.domEventHandlers({
        focus: () => {
          post({ type: "focus" });
          if (isKmmMode && view && view.contentDOM) {
            view.contentDOM.setAttribute("inputmode", "none");
            view.contentDOM.setAttribute("virtualkeyboardpolicy", "manual");
          }
        },
        blur: () => {
          post({ type: "blur" });
        },
        dblclick: () => {
          post({ type: "doubleTap" });
        },
        touchstart: () => {
          const now = Date.now();
          if (now - lastTouchTime < 350) {
            post({ type: "doubleTap" });
          }
          lastTouchTime = now;
        },
      }),
    ],
  });

  const view = new EditorView({
    state: startState,
    parent: document.getElementById("editor"),
  });

  // Global APIs for React Native
  window.__cmSetContent = function (text, fileName) {
    if (typeof text !== "string") return;
    const currentText = view.state.doc.toString();
    const effects = [];

    if (fileName && fileName !== currentFileName) {
      currentFileName = fileName;
      effects.push(languageCompartment.reconfigure(getLanguageExtension(fileName)));
    }

    if (text !== currentText) {
      isInternalUpdate = true;
      try {
        view.dispatch({
          changes: { from: 0, to: currentText.length, insert: text },
          effects,
        });
      } finally {
        isInternalUpdate = false;
      }
    } else if (effects.length > 0) {
      view.dispatch({ effects });
    }

    if (isKmmMode && view.contentDOM) {
      view.contentDOM.setAttribute("inputmode", "none");
      view.contentDOM.setAttribute("virtualkeyboardpolicy", "manual");
    }
  };

  window.__cmSetFontSize = function (size, lineHeight) {
    view.dispatch({
      effects: fontSizeCompartment.reconfigure(createFontTheme(size, lineHeight)),
    });
  };

  window.__cmSetTheme = function (isDark) {
    view.dispatch({
      effects: themeCompartment.reconfigure(isDark ? oneDark : customLightTheme),
    });
  };

  window.__cmSetReadOnly = function (readOnly) {
    const isLocked = !!readOnly;
    view.dispatch({
      effects: [
        readOnlyCompartment.reconfigure(EditorState.readOnly.of(isLocked)),
        editableCompartment.reconfigure(EditorView.editable.of(!isLocked)),
      ],
    });
    if (isLocked && view.contentDOM) {
      try { view.contentDOM.blur(); } catch (_) {}
    } else if (!isLocked && !isKmmMode && view.contentDOM) {
      view.contentDOM.removeAttribute("inputmode");
      view.contentDOM.removeAttribute("virtualkeyboardpolicy");
    }
  };

  window.__cmSetKeyboardMouseMode = function (enabled) {
    isKmmMode = !!enabled;
    view.dispatch({
      effects: kmmCompartment.reconfigure(
        isKmmMode
          ? EditorView.contentAttributes.of({
              inputmode: "none",
              virtualkeyboardpolicy: "manual",
              autocomplete: "off",
              autocorrect: "off",
              spellcheck: "false",
              autocapitalize: "off",
            })
          : []
      ),
    });
    if (view && view.contentDOM) {
      if (isKmmMode) {
        view.contentDOM.setAttribute("inputmode", "none");
        view.contentDOM.setAttribute("virtualkeyboardpolicy", "manual");
        view.contentDOM.setAttribute("autocomplete", "off");
        view.contentDOM.setAttribute("autocorrect", "off");
        view.contentDOM.setAttribute("spellcheck", "false");
        view.contentDOM.setAttribute("autocapitalize", "off");
      } else {
        view.contentDOM.removeAttribute("inputmode");
        view.contentDOM.removeAttribute("virtualkeyboardpolicy");
      }
    }
  };

  window.__cmJumpToLine = function (lineNum) {
    try {
      const line = view.state.doc.line(Math.max(1, Math.min(lineNum, view.state.doc.lines)));
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
    } catch (_) {}
  };

  window.__cmFocus = function () {
    try {
      view.focus();
      if (isKmmMode && view.contentDOM) {
        view.contentDOM.setAttribute("inputmode", "none");
        view.contentDOM.setAttribute("virtualkeyboardpolicy", "manual");
      }
    } catch (_) {}
  };

  post({ type: "ready" });
})();
