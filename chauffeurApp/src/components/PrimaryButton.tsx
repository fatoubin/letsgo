import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle
} from "react-native";

import { COLORS } from "../styles/colors";

type Props = {
  title: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  disabled?: boolean;
};

export default function PrimaryButton({
  title,
  onPress,
  style,
  textStyle,
  disabled
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        disabled && styles.disabled,
        style
      ]}
    >
      <Text style={[styles.text, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.6
  }
});