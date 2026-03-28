import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24
  },

  title: {
    fontSize: 22,
    color: COLORS.textLight,
    marginBottom: 20
  },

  text: {
    color: COLORS.textLight,
    fontSize: 16
  },

  mutedText: {
    color: COLORS.textMuted
  }
});
