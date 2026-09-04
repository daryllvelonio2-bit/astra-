import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Clipboard } from "../../ide/services/clipboardService";
import { executeCode } from "../runner";
import { useTheme } from "../../theme/themeContext";
import { DirectoryListRenderer, isDirectoryListingText } from "./DirectoryListRenderer";
import { ideActionService } from "../../ide/services/ideActionService";
import { isOpenableFileTarget } from "../../ide/services/chatFileLinkService";

interface MarkdownMessageViewProps {
  content: string;
  isUser?: boolean;
  onRunCodeSnippet?: (code: string, language: string) => void;
  onApplyFile?: (filePath: string, code: string) => void;
}

export function MarkdownMessageView({
  content,
  isUser = false,
  onRunCodeSnippet,
  onApplyFile,
}: MarkdownMessageViewProps) {
  const { theme } = useTheme();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  if (isUser) {
    return <Text selectable style={[styles.userText, { color: theme.bubbleUserText }]}>{content}</Text>;
  }

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await Clipboard.setStringAsync(code);
    } catch (_) {}
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (filePath: string, code: string, index: number) => {
    if (onApplyFile) {
      onApplyFile(filePath, code);
    }
    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 2500);
  };

  const openLinkTarget = (target: string) => {
    const t = target.trim();
    if (/^https?:\/\//i.test(t)) {
      ideActionService.openBrowser(t, undefined, true);
    } else {
      ideActionService.openFile(t, undefined, undefined, true);
    }
  };

  const isBarePressable = (part: string) => {
    if (!part) return false;
    if (/^https?:\/\//i.test(part)) return true;
    if (part.startsWith("file://")) return true;
    if (part.startsWith("/workspace") || part.startsWith("/workspaces")) return true;
    return isOpenableFileTarget(part);
  };

  const BARE_PATH_SPLIT =
    /((?:https?:\/\/[^\s)'"`\]]+|file:\/\/[^\s)'"`\]]+|\/workspaces?\/[^\s)'"`\]]+|(?:[\w.\-~]+\/)+[\w.\-~]+\.\w{1,5}(?::\d+)?|[\w.\-~]+\.(?:tsx?|jsx?|json|py|java|kt|md|gradle|xml|ya?ml|toml|css|html|go|rs|php|rb|swift|cpp|c|h|sh|env|properties|lock)(?::\d+)?))/g;

  const renderBarePaths = (text: string, keyPrefix: string) => {
    const parts = text.split(BARE_PATH_SPLIT);
    if (parts.length <= 1) return renderInlineInner(text, keyPrefix);
    return parts.map((part, i) => {
      if (part && isBarePressable(part)) {
        const clean = part.replace(/[),.;:]+$/, "");
        return (
          <Text
            key={`${keyPrefix}-file-${i}`}
            onPress={() => openLinkTarget(clean)}
            style={[styles.linkText, { color: theme.accentGreen }]}
          >
            {renderInlineInner(part, `${keyPrefix}-fileinner-${i}`)}
          </Text>
        );
      }
      return (
        <React.Fragment key={`${keyPrefix}-txt-${i}`}>
          {renderInlineInner(part || "", `${keyPrefix}-txtinner-${i}`)}
        </React.Fragment>
      );
    });
  };

  const renderInline = (text: string, keyPrefix: string) => {
    const linkSplit = text.split(/(\[[^\]]+\]\([^)\s]+\))/g);
    if (linkSplit.length > 1) {
      return linkSplit.map((part, i) => {
        const lm = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (lm) {
          const label = lm[1];
          const target = lm[2];
          if (/^https?:\/\//i.test(target) || target.startsWith("file://") || isOpenableFileTarget(target)) {
            return (
              <Text
                key={`${keyPrefix}-link-${i}`}
                onPress={() => openLinkTarget(target)}
                style={[styles.linkText, { color: theme.accent }]}
              >
                {label}
              </Text>
            );
          }
          return (
            <Text key={`${keyPrefix}-linktxt-${i}`} style={{ color: theme.textPrimary }}>
              {label}
            </Text>
          );
        }
        return (
          <React.Fragment key={`${keyPrefix}-seg-${i}`}>
            {renderBarePaths(part, `${keyPrefix}-seg-${i}`)}
          </React.Fragment>
        );
      });
    }
    return renderBarePaths(text, keyPrefix);
  };

  const renderInlineInner = (text: string, keyPrefix: string) => {
    const tokens = text.split(/(\*\*`[^`]+`\*\*|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return tokens.map((token, i) => {
      const key = `${keyPrefix}-${i}`;

      if (token.startsWith("**`") && token.endsWith("`**") && token.length > 5) {
        const code = token.slice(3, -3);
        return (
          <Text key={key} style={[styles.boldInlineCode, { color: theme.accentGreen, backgroundColor: `${theme.accentGreen}18` }]}>
            `{code}`
          </Text>
        );
      }

      if (token.startsWith("`") && token.endsWith("`") && token.length > 1) {
        const code = token.slice(1, -1);
        return (
          <Text key={key} style={[styles.inlineCodeText, { color: theme.accentGreen, backgroundColor: `${theme.accentGreen}18` }]}>
            `{code}`
          </Text>
        );
      }

      if (token.startsWith("**") && token.endsWith("**") && token.length > 3) {
        const inner = token.slice(2, -2);
        return (
          <Text key={key} style={[styles.boldText, { color: theme.textPrimary }]}>
            {inner}
          </Text>
        );
      }

      if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
        return (
          <Text key={key} style={[styles.italicText, { color: theme.textSecondary }]}>
            {token.slice(1, -1)}
          </Text>
        );
      }

      return <Text key={key} style={{ color: theme.textPrimary }}>{token}</Text>;
    });
  };

  // Split content by code blocks first
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <View style={styles.container}>
      {blocks.map((block, bIdx) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const lines = block.slice(3, -3).trim().split("\n");
          const firstLine = lines[0].trim();
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const language = hasLang ? firstLine : "code";
          const codeBody = hasLang ? lines.slice(1).join("\n") : lines.join("\n");
          const isCopied = copiedIndex === bIdx;
          const isApplied = appliedIndex === bIdx;

          // Render clean directory listing if output is a directory dump
          if (isDirectoryListingText(codeBody)) {
            return (
              <DirectoryListRenderer
                key={`dir-block-${bIdx}`}
                rawOutput={codeBody}
                title="Directory Contents"
              />
            );
          }

          const isExecutable =
            !["text", "output", "stdout", "stderr", "terminal", "log", "plaintext", "raw", "csv", "tsv"].includes(language.toLowerCase()) &&
            !codeBody.trim().startsWith("total ") &&
            !/^([dcbsp-])[rwxstST-]{9}/.test(codeBody.trim());

          // Detect filename if mentioned on header or first line
          let detectedFile: string | null = null;
          const headerMatch = firstLine.match(/(?:\/\/|#)?\s*([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)$/);
          if (headerMatch) {
            detectedFile = headerMatch[1];
          } else if (lines.length > 1 && /^(?:\/\/|#)\s*([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)$/.test(lines[1]?.trim())) {
            const secondLineMatch = lines[1].trim().match(/^(?:\/\/|#)\s*([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)$/);
            if (secondLineMatch) detectedFile = secondLineMatch[1];
          }

          return (
            <View key={`code-${bIdx}`} style={[styles.codeBlock, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
              <View style={[styles.codeHeader, { backgroundColor: theme.bgSecondary }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.codeLang, { color: theme.textSecondary }]}>{language.toUpperCase()}</Text>
                  {detectedFile && (
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: "monospace" }}>
                      {detectedFile}
                    </Text>
                  )}
                </View>
                <View style={styles.codeActions}>
                  {detectedFile && onApplyFile && (
                    <TouchableOpacity
                      style={[styles.codeBtn, { backgroundColor: isApplied ? `${theme.accentGreen}30` : theme.bgTertiary }]}
                      onPress={() => handleApply(detectedFile!, codeBody, bIdx)}
                    >
                      <Ionicons
                        name={isApplied ? "checkmark-circle" : "save-outline"}
                        size={12}
                        color={isApplied ? theme.accentGreen : theme.accent}
                      />
                      <Text style={[styles.codeBtnText, { color: isApplied ? theme.accentGreen : theme.accent }]}>
                        {isApplied ? "Saved!" : "Save to File"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.codeBtn, { backgroundColor: theme.bgTertiary }]} onPress={() => handleCopyCode(codeBody, bIdx)}>
                    <Ionicons name={isCopied ? "checkmark" : "copy-outline"} size={12} color={isCopied ? theme.accentGreen : theme.accent} />
                    <Text style={[styles.codeBtnText, { color: isCopied ? theme.accentGreen : theme.accent }]}>{isCopied ? "Copied" : "Copy"}</Text>
                  </TouchableOpacity>
                  {isExecutable && (
                    <TouchableOpacity
                      style={[styles.codeBtn, styles.runBtn, { backgroundColor: `${theme.accentGreen}20` }]}
                      onPress={() => (onRunCodeSnippet ? onRunCodeSnippet(codeBody, language) : executeCode({ code: codeBody, language, tier: "client" }))}
                    >
                      <Ionicons name="play" size={11} color={theme.accentGreen} />
                      <Text style={[styles.codeBtnText, { color: theme.accentGreen }]}>Run</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text selectable style={[styles.codeBodyText, { color: theme.textPrimary }]}>{codeBody}</Text>
            </View>
          );
        }

        const lines = block.split("\n");

        return (
          <View key={`text-${bIdx}`} style={styles.textBlock}>
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <View key={`empty-${lIdx}`} style={styles.emptySpacing} />;
              }

              // H1 Heading
              if (trimmed.startsWith("# ")) {
                return (
                  <View key={`h1-${lIdx}`} style={[styles.h1Container, { borderBottomColor: theme.border }]}>
                    <Text selectable style={[styles.h1Text, { color: theme.accent }]}>
                      {renderInline(trimmed.replace(/^#\s+/, ""), `h1-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // H2 Heading
              if (trimmed.startsWith("## ")) {
                return (
                  <View key={`h2-${lIdx}`} style={styles.h2Container}>
                    <Text selectable style={[styles.h2Text, { color: theme.accentGreen }]}>
                      {renderInline(trimmed.replace(/^##\s+/, ""), `h2-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // H3 Heading
              if (trimmed.startsWith("### ")) {
                return (
                  <View key={`h3-${lIdx}`} style={styles.h3Container}>
                    <Text selectable style={[styles.h3Text, { color: theme.accentGold }]}>
                      {renderInline(trimmed.replace(/^###\s+/, ""), `h3-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // H4 Heading
              if (trimmed.startsWith("#### ")) {
                return (
                  <View key={`h4-${lIdx}`} style={styles.h4Container}>
                    <Text selectable style={[styles.h4Text, { color: theme.accentPurple }]}>
                      {renderInline(trimmed.replace(/^####\s+/, ""), `h4-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // Numbered List (e.g. 1. , 2. )
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                const num = numMatch[1];
                const rest = numMatch[2];
                return (
                  <View key={`num-${lIdx}`} style={styles.listItemRow}>
                    <View style={[styles.numBadge, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                      <Text style={[styles.numText, { color: theme.accent }]}>{num}</Text>
                    </View>
                    <Text selectable style={[styles.bodyText, styles.listItemText, { color: theme.textPrimary }]}>
                      {renderInline(rest, `num-rest-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // Bullet List (e.g. - , * , •)
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
                const rest = trimmed.replace(/^[-*•]\s+/, "");
                return (
                  <View key={`bullet-${lIdx}`} style={styles.listItemRow}>
                    <View style={styles.bulletBadge}>
                      <Text style={[styles.bulletDot, { color: theme.accentGreen }]}>•</Text>
                    </View>
                    <Text selectable style={[styles.bodyText, styles.listItemText, { color: theme.textPrimary }]}>
                      {renderInline(rest, `bullet-rest-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // Blockquote / Alert
              if (trimmed.startsWith(">")) {
                const quoteText = trimmed.replace(/^>\s*/, "");
                return (
                  <View key={`quote-${lIdx}`} style={[styles.quoteBox, { backgroundColor: theme.bgSecondary, borderLeftColor: theme.accent }]}>
                    <Text selectable style={[styles.quoteText, { color: theme.textSecondary }]}>
                      {renderInline(quoteText, `quote-rest-${lIdx}`)}
                    </Text>
                  </View>
                );
              }

              // Normal Body Paragraph
              return (
                <Text key={`p-${lIdx}`} selectable style={[styles.bodyText, { color: theme.textPrimary }]}>
                  {renderInline(line, `p-rest-${lIdx}`)}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: 4 },
  userText: { fontSize: 13.5, lineHeight: 20 },
  textBlock: { width: "100%", gap: 3 },
  emptySpacing: { height: 6 },
  bodyText: { fontSize: 13.5, lineHeight: 21 },
  boldText: { fontWeight: "700" },
  italicText: { fontStyle: "italic" },
  inlineCodeText: {
    fontFamily: "monospace",
    fontSize: 12.5,
  },
  boldInlineCode: {
    fontFamily: "monospace",
    fontSize: 12.5,
    fontWeight: "700",
  },
  h1Container: { marginTop: 10, marginBottom: 4, borderBottomWidth: 1, paddingBottom: 4 },
  h1Text: { fontSize: 16.5, fontWeight: "800", letterSpacing: 0.2 },
  h2Container: { marginTop: 8, marginBottom: 3 },
  h2Text: { fontSize: 15, fontWeight: "700" },
  h3Container: { marginTop: 6, marginBottom: 2 },
  h3Text: { fontSize: 14, fontWeight: "700" },
  h4Container: { marginTop: 4, marginBottom: 2 },
  h4Text: { fontSize: 13, fontWeight: "700" },
  listItemRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginVertical: 3, paddingLeft: 1, width: "100%" },
  numBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  numText: { fontSize: 10.5, fontWeight: "700" },
  bulletBadge: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  bulletDot: { fontSize: 16, lineHeight: 18, textAlign: "center" },
  listItemText: { flex: 1, lineHeight: 21 },
  quoteBox: {
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
  },
  quoteText: { fontSize: 12.5, lineHeight: 18, fontStyle: "italic" },
  codeBlock: { marginVertical: 6, borderRadius: 8, borderWidth: 1, overflow: "hidden", width: "100%" },
  codeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5 },
  codeLang: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.5 },
  codeActions: { flexDirection: "row", gap: 6 },
  codeBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  runBtn: { },
  codeBtnText: { fontSize: 10.5, fontWeight: "600" },
  codeBodyText: { fontFamily: "monospace", fontSize: 11.5, padding: 8, lineHeight: 17 },
  linkText: { textDecorationLine: "underline", fontSize: 13.5, lineHeight: 21 },
});
