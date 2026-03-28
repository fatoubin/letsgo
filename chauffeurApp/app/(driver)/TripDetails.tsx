import React, { useEffect, useState } from "react";
import {
View,
Text,
StyleSheet,
FlatList,
ActivityIndicator,
TouchableOpacity,
Linking,
Alert
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import PrimaryButton from "../../src/components/PrimaryButton";
import { API_URL } from "../../src/services/api";

type Reservation = {
id:number
passenger_name:string
passenger_phone:string
seats_reserved:number
status:"pending"|"accepted"|"rejected"
}

export default function DriverTripDetailScreen(){

const router = useRouter()
const params = useLocalSearchParams()

const trip = params?.trip ? JSON.parse(params.trip as string) : null

const [reservations,setReservations] = useState<Reservation[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{

if(!trip?.id){
setLoading(false)
return
}

fetchReservations()

},[trip])

const fetchReservations = async()=>{

try{

const res = await fetch(
`${API_URL}/api/trips/reservations?tripId=${trip.id}`
)

const data = await res.json()

if(data?.success){
setReservations(data.reservations || [])
}else{
setReservations([])
}

}catch(e){

console.log("RESERVATIONS ERROR",e)

}finally{

setLoading(false)

}

}

const updateReservation = async(
id:number,
status:"accepted"|"rejected"
)=>{

try{

const res = await fetch(
`${API_URL}/api/driver/reservation-action`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
reservationId:id,
status
})
}
)

const data = await res.json()

if(data?.success){

Alert.alert(
"Succès",
status==="accepted"
?"Réservation acceptée"
:"Réservation refusée"
)

fetchReservations()

}else{

Alert.alert("Erreur",data.message)

}

}catch(e){

Alert.alert("Erreur","Connexion serveur impossible")

}

}

const callPassenger = (phone:string)=>{
if(!phone) return
Linking.openURL(`tel:${phone}`)
}

const renderStatus = (status:string)=>{

if(status==="accepted"){
return <Text style={[styles.statusBadge,styles.accepted]}>Acceptée</Text>
}

if(status==="rejected"){
return <Text style={[styles.statusBadge,styles.rejected]}>Refusée</Text>
}

return <Text style={[styles.statusBadge,styles.pending]}>En attente</Text>

}

if(!trip){

return(
<View style={styles.center}>
<ActivityIndicator size="large"/>
<Text style={styles.text}>
Chargement du trajet...
</Text>
</View>
)

}

return(

<View style={globalStyles.screen}>

<Text style={styles.title}>
Détails du trajet
</Text>

<View style={styles.card}>

<Text style={styles.label}>Départ</Text>
<Text style={styles.value}>{trip.departure}</Text>

<Text style={styles.label}>Destination</Text>
<Text style={styles.value}>{trip.destination}</Text>

<Text style={styles.label}>Date & Heure</Text>
<Text style={styles.value}>
{trip.date} à {trip.time}
</Text>

<Text style={styles.label}>Prix</Text>
<Text style={styles.value}>
{trip.price} FCFA
</Text>

</View>

<PrimaryButton
title="Voir l’itinéraire sur la carte"
style={{marginTop:20}}
onPress={()=>router.push({
pathname:"/(driver)/trip-map",
params:{tripId:trip.id}
})}
/>

<Text style={styles.sectionTitle}>
Réservations
</Text>

{loading ? (

<ActivityIndicator color={COLORS.primary}/>

) : reservations.length===0 ? (

<Text style={styles.empty}>
Aucune réservation
</Text>

) : (

<FlatList
data={reservations}
keyExtractor={(item)=>item.id.toString()}
renderItem={({item})=>(

<View style={styles.reservationCard}>

<View style={styles.row}>

<Text style={styles.resName}>
{item.passenger_name}
</Text>

{renderStatus(item.status)}

</View>

<Text style={styles.resInfo}>
📞 {item.passenger_phone}
</Text>

<Text style={styles.resInfo}>
Places : {item.seats_reserved}
</Text>

<View style={styles.actions}>

<TouchableOpacity
style={styles.callButton}
onPress={()=>callPassenger(item.passenger_phone)}
>
<Text style={styles.callText}>
Appeler
</Text>
</TouchableOpacity>

{item.status==="pending" && (

<>

<TouchableOpacity
style={styles.accept}
onPress={()=>updateReservation(item.id,"accepted")}
>
<Text style={styles.actionText}>
Accepter
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.reject}
onPress={()=>updateReservation(item.id,"rejected")}
>
<Text style={styles.actionText}>
Refuser
</Text>
</TouchableOpacity>

</>

)}

</View>

</View>

)}
/>

)}

</View>

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
color:COLORS.textLight,
textAlign:"center",
marginBottom:24,
fontWeight:"600"
},

card:{
backgroundColor:"#D1D1D1",
borderRadius:14,
padding:16
},

label:{
fontSize:13,
color:"#555",
marginTop:12
},

value:{
fontSize:16,
fontWeight:"600",
marginTop:2
},

text:{
color:COLORS.textMuted
},

sectionTitle:{
color:COLORS.textLight,
fontSize:18,
marginTop:30,
marginBottom:10
},

empty:{
color:COLORS.textMuted,
textAlign:"center",
marginTop:10
},

reservationCard:{
backgroundColor:"#fff",
borderRadius:12,
padding:14,
marginBottom:10
},

resName:{
fontSize:16,
fontWeight:"600"
},

resInfo:{
fontSize:14,
color:"#555",
marginTop:4
},

row:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center"
},

actions:{
flexDirection:"row",
gap:10,
marginTop:10
},

statusBadge:{
paddingHorizontal:10,
paddingVertical:4,
borderRadius:20,
fontSize:12,
fontWeight:"600",
color:"#fff"
},

pending:{
backgroundColor:COLORS.warning
},

accepted:{
backgroundColor:COLORS.success
},

rejected:{
backgroundColor:COLORS.danger
},

callButton:{
backgroundColor:COLORS.primary,
paddingVertical:6,
paddingHorizontal:14,
borderRadius:20
},

callText:{
color:"#fff",
fontWeight:"600"
},

accept:{
backgroundColor:COLORS.success,
paddingVertical:6,
paddingHorizontal:12,
borderRadius:20
},

reject:{
backgroundColor:COLORS.danger,
paddingVertical:6,
paddingHorizontal:12,
borderRadius:20
},

actionText:{
color:"#fff",
fontWeight:"600"
}

})