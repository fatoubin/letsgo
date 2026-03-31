import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const buttons = StyleSheet.create({
  primary: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16
  },

  primaryText: {
    color: "#FFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600"
  }
});