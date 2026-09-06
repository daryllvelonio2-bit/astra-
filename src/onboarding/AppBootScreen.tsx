import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";

interface AppBootScreenProps {
  isReady: boolean;
  onAnimationEnd: () => void;
}

export function AppBootScreen({ isReady, onAnimationEnd }: AppBootScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Gentle breathing / pulse animation for the logo
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.85,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();

    // Ensure a minimum 650ms display to avoid jarring micro-flickers
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 650);

    return () => {
      pulse.stop();
      clearTimeout(timer);
    };
  }, []);

  // When both minimum display time has passed and real app init is ready, fade out smoothly
  useEffect(() => {
    if (isReady && minTimeElapsed) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        onAnimationEnd();
      });
    }
  }, [isReady, minTimeElapsed]);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#020919"
        translucent
      />

      {/* Ambient background aura */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Central Logo & Brand Block */}
      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.title}>ASTRA</Text>
        <Text style={styles.subtitle}>AI IDE &amp; LINUX SANDBOX</Text>

        {/* Minimal loading indicator bar */}
        <View style={styles.loaderTrack}>
          <Animated.View
            style={[
              styles.loaderThumb,
              {
                opacity: glowAnim,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.bottomFooter}>
        <Text style={styles.footerText}>READYING RUNTIME</Text>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020919",
    zIndex: 99999,
    justifyContent: "center",
    alignItems: "center",
  },
  ambientGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#00E5FF",
    opacity: 0.08,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 130,
    height: 130,
    marginBottom: 20,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00E5FF",
    letterSpacing: 3,
    opacity: 0.9,
    marginBottom: 24,
  },
  loaderTrack: {
    width: Math.min(width * 0.42, 160),
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  loaderThumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#00E5FF",
    borderRadius: 2,
  },
  bottomFooter: {
    position: "absolute",
    bottom: 36,
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.35)",
    letterSpacing: 2,
  },
});
