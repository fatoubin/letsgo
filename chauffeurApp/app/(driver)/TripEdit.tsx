import React, { useState } from "react";
import {
View,
Text,
TextInput,
Alert,
StyleSheet,
ActivityIndicator
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { API_URL } from "../../src/services/api";

export default function TripEditScreen(){

const router = useRouter()
const params = useLocalSearchParams()

let trip:any = null

try{
trip = params?.trip ? JSON.parse(params.trip as string) : null
}catch{
trip = null
}

if(!trip){

return(
<View style={globalStyles.screen}>
<Text style={{color:COLORS.textLight}}>
Trajet introuvable
</Text>
</View>
)

}

const [departure,setDeparture] = useState(trip.departure || "")
const [destination,setDestination] = useState(trip.destination || "")
const [date,setDate] = useState(trip.date || "")
const [time,setTime] = useState(trip.time || "")
const [seats,setSeats] = useState(String(trip.seats || ""))
const [price,setPrice] = useState(String(trip.price || ""))

const [loading,setLoading] = useState(false)

const handleUpdate = async()=>{

if(!departure || !destination || !date || !time){

Alert.alert(
"Erreur",
"Veuillez remplir tous les champs"
)

return

}

setLoading(true)

try{

const res = await fetch(
`${API_URL}/api/trips/update`,
{
method:"PUT",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
tripId:trip.id,
departure,
destination,
date,
time,
seats:Number(seats) || 1,
price:Number(price) || 0
})
}
)

const data = await res.json()

if(data?.success){

Alert.alert(
"Succès",
"Trajet modifié avec succès"
)

router.back()

}else{

Alert.alert(
"Erreur",
data.message || "Modification impossible"
)

}

}catch(e){

console.log("TRIP UPDATE ERROR",e)

Alert.alert(
"Erreur",
"Connexion serveur impossible"
)

}
finally{

setLoading(false)

}

}

return(

<View style={globalStyles.screen}>

<Text style={styles.title}>
Modifier le trajet
</Text>

<Text style={styles.label}>
Départ
</Text>

<TextInput
style={styles.input}
value={departure}
onChangeText={setDeparture}
placeholder="Lieu de départ"
/>

<Text style={styles.label}>
Destination
</Text>

<TextInput
style={styles.input}
value={destination}
onChangeText={setDestination}
placeholder="Lieu d’arrivée"
/>

<Text style={styles.label}>
Date
</Text>

<TextInput
style={styles.input}
value={date}
onChangeText={setDate}
placeholder="YYYY-MM-DD"
/>

<Text style={styles.label}>
Heure
</Text>

<TextInput
style={styles.input}
value={time}
onChangeText={setTime}
placeholder="HH:MM"
/>

<Text style={styles.label}>
Places
</Text>

<TextInput
style={styles.input}
value={seats}
onChangeText={setSeats}
keyboardType="numeric"
placeholder="Nombre de places"
/>

<Text style={styles.label}>
Prix (FCFA)
</Text>

<TextInput
style={styles.input}
value={price}
onChangeText={setPrice}
keyboardType="numeric"
placeholder="Prix du trajet"
/>

{loading ? (

<ActivityIndicator
size="large"
color={COLORS.primary}
style={{marginTop:20}}
/>

) : (

<PrimaryButton
title="Enregistrer les modifications"
onPress={handleUpdate}
/>

)}

</View>

)

}

const styles = StyleSheet.create({

title:{
fontSize:24,
color:COLORS.textLight,
textAlign:"center",
marginBottom:20,
fontWeight:"600"
},

label:{
color:COLORS.textMuted,
marginBottom:6,
marginTop:8
},

input:{
backgroundColor:"#fff",
borderRadius:12,
padding:14,
marginBottom:10
}

})