import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/themeContext";
import { useOrientation } from "../theme/useOrientation";
import {
  AppTheme,
  EditorUiType,
  saveAstraEnabled,
  saveDefaultEditorUi,
  saveHasCompletedStartup,
  saveTheme,
} from "../ide/services/configService";
import { StartupStepId } from "./types";
import { ThemeSelectionStep } from "./steps/ThemeSelectionStep";
import { AstraAiStep } from "./steps/AstraAiStep";
import { PermissionsStep } from "./steps/PermissionsStep";
import { EditorUiStep } from "./steps/EditorUiStep";
import { GitHubSetupStep } from "./steps/GitHubSetupStep";

interface StartupWizardProps {
  onComplete: () => void;
}

const STEPS: { id: StartupStepId; label: string }[] = [
  { id: "theme", label: "Theme" },
  { id: "astra", label: "Astra AI" },
  { id: "permissions", label: "System" },
  { id: "editor", label: "Editor" },
  { id: "github", label: "GitHub" },
];

export function StartupWizard({ onComplete }: StartupWizardProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setTheme } = useTheme();
  const { isLandscape } = useOrientation();

  const topInset = Math.max(insets.top, StatusBar.currentHeight || 0);
  const bottomInset = Math.max(insets.bottom, 12);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(themeMode);
  const [astraEnabled, setAstraEnabled] = useState(true);
  const [selectedEditor, setSelectedEditor] = useState<EditorUiType>("native");
  const [githubConfigured, setGithubConfigured] = useState(false);

  const currentStep = STEPS[currentStepIndex];

  const handleSelectTheme = (mode: AppTheme) => {
    setSelectedTheme(mode);
    setTheme(mode); // Live preview updates UI immediately
  };

  const handleFinish = async () => {
    await saveTheme(selectedTheme);
    await saveAstraEnabled(astraEnabled);
    await saveDefaultEditorUi(selectedEditor);
    await saveHasCompletedStartup(true);
    onComplete();
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.bgPrimary,
          paddingTop: topInset,
          paddingBottom: bottomInset,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <View style={[styles.container, isLandscape && styles.containerLandscape]}>
        {/* Header Bar */}
        <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View>
              <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
                Astra Setup
              </Text>
              <Text style={[styles.brandSubtitle, { color: theme.textMuted }]}>
                Personalize your workspace
              </Text>
            </View>
          </View>

          {/* Step Indicator Dots */}
          <View style={styles.stepIndicatorRow}>
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              return (
                <View key={step.id} style={styles.stepDotWrap}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isActive
                          ? theme.accent
                          : isPast
                          ? theme.accentGreen
                          : theme.borderLight,
                      },
                    ]}
                  >
                    {isPast ? (
                      <Ionicons name="checkmark" size={10} color="#ffffff" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          { color: isActive ? theme.sendButtonIcon : theme.textMuted },
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  {isActive && !isLandscape && (
                    <Text
                      style={[
                        styles.stepDotLabel,
                        {
                          color: theme.textPrimary,
                          fontWeight: "700",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                  )}
                  {idx < STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepConnector,
                        { backgroundColor: isPast ? theme.accentGreen : theme.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Step Body */}
        <View style={styles.bodyWrap}>
          {currentStep.id === "theme" && (
            <ThemeSelectionStep
              selectedTheme={selectedTheme}
              onSelectTheme={handleSelectTheme}
              theme={theme}
              isLandscape={isLandscape}
            />
          )}

          {currentStep.id === "astra" && (
            <AstraAiStep
              astraEnabled={astraEnabled}
              onSelectAstra={setAstraEnabled}
              theme={theme}
              isLandscape={isLandscape}
            />
          )}

          {currentStep.id === "permissions" && (
            <PermissionsStep
              theme={theme}
              isLandscape={isLandscape}
            />
          )}

          {currentStep.id === "editor" && (
            <EditorUiStep
              selectedEditor={selectedEditor}
              onSelectEditor={setSelectedEditor}
              theme={theme}
              isLandscape={isLandscape}
            />
          )}

          {currentStep.id === "github" && (
            <GitHubSetupStep
              theme={theme}
              isLandscape={isLandscape}
              onConfigured={() => setGithubConfigured(true)}
              onSkip={handleFinish}
            />
          )}
        </View>

        {/* Bottom Navigation Actions */}
        <View
          style={[
            styles.bottomBar,
            isLandscape && styles.bottomBarLandscape,
            { backgroundColor: theme.bgSecondary, borderTopColor: theme.border },
          ]}
        >
          {currentStepIndex > 0 ? (
            <TouchableOpacity
              style={[
                styles.navBtnSecondary,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              ]}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={15} color={theme.textSecondary} />
              <Text style={[styles.navBtnSecondaryText, { color: theme.textSecondary }]}>
                Back
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}

          <View style={styles.rightActionsRow}>
            {currentStep.id === "github" && (
              <TouchableOpacity
                style={[styles.skipBtn]}
                onPress={handleFinish}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipBtnText, { color: theme.textMuted }]}>
                  Skip for now
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.navBtnPrimary,
                { backgroundColor: theme.accent },
              ]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.navBtnPrimaryText, { color: theme.sendButtonIcon }]}>
                {currentStepIndex === STEPS.length - 1 ? "Get Started" : "Continue"}
              </Text>
              <Ionicons
                name={currentStepIndex === STEPS.length - 1 ? "rocket" : "arrow-forward"}
                size={15}
                color={theme.sendButtonIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  containerLandscape: {
    flexDirection: "column",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10.5,
  },
  stepIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 9,
    fontWeight: "700",
  },
  stepDotLabel: {
    fontSize: 11,
    marginRight: 4,
  },
  stepConnector: {
    width: 14,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  bodyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomBarLandscape: {
    paddingVertical: 8,
  },
  navBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  navBtnSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  spacer: {
    width: 60,
  },
  rightActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  skipBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  navBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navBtnPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
