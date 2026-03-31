import React from "react";
import {
  TextInput,
  StyleSheet,
  TextInputProps
} from "react-native";

type Props = {
  placeholder?: string;
  secure?: boolean;
} & TextInputProps;

export default function InputField({
  placeholder,
  secure,
  ...props
}: Props) {

  return (
    <TextInput
      placeholder={placeholder}
      secureTextEntry={secure}
      style={styles.input}
      {...props}
    />
  );

}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 15
  }
});