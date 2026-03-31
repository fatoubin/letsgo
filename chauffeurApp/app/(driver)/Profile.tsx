import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";

// ✅ API sécurisée
import { fetchWithAuth } from "../../src/services/api";

type Driver = {
  nom?: string
  prenom?: string
  telephone?: string
  residence?: string
  vehicle_type?: string
  vehicle_plate?: string
  seats?: number
}

export default function DriverProfileScreen() {

  const params = useLocalSearchParams()
  const driverId = Number(params?.driverId)

  const [driver,setDriver] = useState<Driver | null>(null)
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    if(!driverId || isNaN(driverId)){
      setLoading(false)
      return
    }

    const loadProfile = async()=>{

      try{

        const data = await fetchWithAuth(
          `/api/driver/profile?driver_id=${driverId}`
        )

        setDriver(data)

      }catch(e){
        console.log("PROFILE ERROR",e)
      }
      finally{
        setLoading(false)
      }

    }

    loadProfile()

  },[driverId])

  if(loading){

    return(
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary}/>
        <Text style={{marginTop:10}}>
          Chargement du profil...
        </Text>
      </View>
    )

  }

  if(!driver){

    return(
      <View style={styles.center}>
        <Text>Profil chauffeur introuvable</Text>
      </View>
    )

  }

  return(

    <ScrollView style={globalStyles.screen}>

      <Text style={styles.title}>
        Mon Profil
      </Text>

      <View style={styles.card}>

        <Text style={styles.label}>
          Nom complet
        </Text>

        <Text style={styles.value}>
          {driver?.prenom} {driver?.nom}
        </Text>

        <Text style={styles.label}>
          Téléphone
        </Text>

        <Text style={styles.value}>
          {driver?.telephone || "Non défini"}
        </Text>

      </View>

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Véhicule
        </Text>

        <Text style={styles.label}>
          Type
        </Text>

        <Text style={styles.value}>
          {driver?.vehicle_type || "Non défini"}
        </Text>

        <Text style={styles.label}>
          Plaque
        </Text>

        <Text style={styles.value}>
          {driver?.vehicle_plate || "Non définie"}
        </Text>

        <Text style={styles.label}>
          Places
        </Text>

        <Text style={styles.value}>
          {driver?.seats ?? "?"}
        </Text>

      </View>

    </ScrollView>

  )

}

const styles = StyleSheet.create({

center:{
flex:1,
justifyContent:"center",
alignItems:"center"
},

title:{
fontSize:24,
fontWeight:"600",
color:COLORS.textLight,
textAlign:"center",
marginBottom:20
},

card:{
backgroundColor:"#D1D1D1",
borderRadius:14,
padding:16,
marginBottom:20
},

sectionTitle:{
fontSize:16,
fontWeight:"600",
marginBottom:10
},

label:{
fontSize:13,
color:"#555",
marginTop:10
},

value:{
fontSize:15,
fontWeight:"600",
marginTop:2
}

});