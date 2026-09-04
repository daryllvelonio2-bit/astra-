import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useTheme } from "../../../theme/themeContext";

interface ExtraKeysBarProps {
  ctrlActive: boolean;
  altActive: boolean;
  onToggleCtrl: () => void;
  onToggleAlt: () => void;
  /** Printable char: caller appends to the local echo buffer. */
  onPrintable: (ch: string) => void;
  /** Raw bytes straight to the shell (esc sequences, tab, ctrl combos). */
  onRaw: (data: string) => void;
  /** Submit the current line (same as Enter). */
  onEnter: () => void;
  disabled?: boolean;
}

interface KeyDef {
  label: string;
  a11y: string;
  run: () => void;
  active?: boolean;
  repeat?: boolean;
}

const SYMBOL_KEYS = [
  "|", "~", "/", "\\", "-", "_", ":", ";", '"', "'",
  "`", "$", "(", ")", "{", "}", "[", "]", "<",
  ">", "+", "=", "*", "?", "!", "&", "^", "%",
  "#", ".", ",",
];

export function ExtraKeysBar({
  ctrlActive,
  altActive,
  onToggleCtrl,
  onToggleAlt,
  onPrintable,
  onRaw,
  onEnter,
  disabled,
}: ExtraKeysBarProps) {
  const { theme: appTheme } = useTheme();
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRepeat = () => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  useEffect(() => {
    return stopRepeat;
  }, []);

  const fire = (fn: () => void, repeat?: boolean) => {
    if (disabled) return;
    fn();
    if (repeat) {
      stopRepeat();
      repeatRef.current = setInterval(fn, 70);
    }
  };

  const keys: KeyDef[] = [
    { label: "ESC", a11y: "Escape", run: () => onRaw("\x1b") },
    { label: "ENTER", a11y: "Enter", run: onEnter },
    { label: "TAB", a11y: "Tab", run: () => onRaw("\t") },
    { label: "CTRL", a11y: "Toggle control", run: onToggleCtrl, active: ctrlActive },
    { label: "ALT", a11y: "Toggle alt", run: onToggleAlt, active: altActive },
    { label: "↑", a11y: "Arrow up", run: () => onRaw("\x1b[A"), repeat: true },
    { label: "↓", a11y: "Arrow down", run: () => onRaw("\x1b[B"), repeat: true },
    { label: "←", a11y: "Arrow left", run: () => onRaw("\x1b[D"), repeat: true },
    { label: "→", a11y: "Arrow right", run: () => onRaw("\x1b[C"), repeat: true },
    ...SYMBOL_KEYS.map((ch): KeyDef => ({
      label: ch,
      a11y: `Symbol ${ch}`,
      run: () => onPrintable(ch),
    })),
  ];

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: appTheme.bgSecondary, borderTopColor: appTheme.border },
        disabled && styles.disabled,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {keys.map((k) => (
          <Pressable
            key={k.a11y}
            accessibilityLabel={k.a11y}
            disabled={disabled}
            onPress={() => fire(k.run, k.repeat)}
            onLongPress={() => k.repeat && fire(k.run, true)}
            onPressOut={stopRepeat}
            style={[
              styles.key,
              { backgroundColor: appTheme.bgTertiary, borderColor: appTheme.border },
              k.active && {
                backgroundColor: appTheme.accent + "33",
                borderColor: appTheme.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.keyLabel,
                { color: appTheme.textPrimary },
                k.active && { color: appTheme.accent },
              ]}
            >
              {k.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  key: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyLabel: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "600",
  },
});
