import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS } from "../styles/colors";

type Props = {
  title?: string;
};

export default function BackHeader({ title }: Props) {

  const router = useRouter();

  return (
    <View style={styles.container}>

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={COLORS.textLight}
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        {title || ""}
      </Text>

      <View style={{ width: 40 }} />

    </View>
  );
}

const styles = StyleSheet.create({

  container:{
    height:56,
    backgroundColor:"#0B1220",
    flexDirection:"row",
    alignItems:"center",
    paddingHorizontal:12,
    borderBottomWidth:1,
    borderBottomColor:"#1F2937"
  },

  backBtn:{
    width:40,
    justifyContent:"center",
    alignItems:"center"
  },

  title:{
    flex:1,
    textAlign:"center",
    color:COLORS.textLight,
    fontSize:16,
    fontWeight:"600"
  }

});