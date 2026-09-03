import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

interface AstraLogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export function AstraLogo({ width = 36, height = 36, style }: AstraLogoProps) {
  return (
    <Image
      source={require("../../../assets/astra-logo.png")}
      style={[
        {
          width,
          height,
          resizeMode: "contain",
          borderRadius: Math.round(width / 2),
        },
        style,
      ]}
    />
  );
}

