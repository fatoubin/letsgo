import React, { useEffect, useState } from "react";
import {
View,
Text,
StyleSheet,
FlatList,
TouchableOpacity,
ActivityIndicator,
Alert,
Linking
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";

// ✅ API
import {getTripReservations, fetchWithAuth } from "../../src/services/api";

type Reservation = {
id:number
nom:string
prenom:string
telephone:string
depart:string
destination:string
places:number
status:"pending"|"accepted"|"rejected"
}

export default function DriverReservationsScreen(){

const router = useRouter()
const params = useLocalSearchParams()

const driverId = Number(params?.driverId)

const [loading,setLoading] = useState(true)
const [reservations,setReservations] = useState<Reservation[]>([])

useEffect(()=>{

if(!driverId || isNaN(driverId)){
Alert.alert("Erreur","Chauffeur non identifié")
setLoading(false)
return
}

fetchReservations()

},[driverId])

const fetchReservations = async()=>{

try{

const data = await getTripReservations(driverId)
setReservations(data || [])

}catch(e){

console.log("RESERVATIONS ERROR",e)
Alert.alert("Erreur","Impossible de charger les réservations")

}
finally{
setLoading(false)
}

}

// ✅ ACTIVER ACCEPT / REJECT
const updateReservation = async(
id:number,
status:"accepted"|"rejected"
)=>{

try{

await fetchWithAuth("/api/trips/reservation_action",{
method:"POST",
body:JSON.stringify({
reservation_id:id,
status
})
})

Alert.alert(
"Succès",
status==="accepted"
?"Réservation acceptée"
:"Réservation refusée"
)

// 🔁 refresh
fetchReservations()

}catch(e){

Alert.alert("Erreur","Action impossible")

}

}

const callPassenger = (phone:string)=>{

if(!phone) return

Linking.openURL(`tel:${phone}`)

}

// ✅ STATUS DYNAMIQUE
const renderStatus = (status:string)=>{

if(status==="accepted"){
return <Text style={[styles.badge,styles.accepted]}>Acceptée</Text>
}

if(status==="rejected"){
return <Text style={[styles.badge,styles.rejected]}>Refusée</Text>
}

return <Text style={[styles.badge,styles.pending]}>En attente</Text>

}

const renderItem = ({item}:{item:Reservation})=>(

<View style={styles.card}>

<View style={styles.row}>

<Text style={styles.route}>
{item.depart} → {item.destination}
</Text>

{renderStatus(item.status)}

</View>

<Text style={styles.info}>
Passager : {item.nom} {item.prenom}
</Text>

<Text style={styles.info}>
Places : {item.places}
</Text>

<Text style={styles.info}>
📞 {item.telephone}
</Text>

<View style={styles.actions}>

<TouchableOpacity
style={styles.call}
onPress={()=>callPassenger(item.telephone)}
>
<Text style={styles.actionText}>
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

)

if(loading){

return(
<View style={globalStyles.screen}>
<ActivityIndicator size="large" color={COLORS.primary}/>
</View>
)

}

return(

<View style={globalStyles.screen}>

<Text style={styles.title}>
Réservations reçues
</Text>

{reservations.length===0 ?(

<Text style={styles.empty}>
Aucune réservation pour le moment
</Text>

):( 

<FlatList
data={reservations}
keyExtractor={(item)=>item.id.toString()}
renderItem={renderItem}
/>

)}

<PrimaryButton
title="Retour au tableau de bord"
onPress={()=>router.back()}
style={{marginTop:20}}
/>

</View>

)

}

const styles = StyleSheet.create({

title:{
fontSize:26,
color:COLORS.textLight,
textAlign:"center",
marginBottom:20,
fontWeight:"600"
},

empty:{
color:COLORS.textMuted,
textAlign:"center",
marginTop:40
},

card:{
backgroundColor:"#fff",
borderRadius:14,
padding:16,
marginBottom:14
},

row:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center"
},

route:{
fontSize:16,
fontWeight:"600"
},

info:{
fontSize:14,
color:"#555",
marginTop:4
},

actions:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:12
},

call:{
backgroundColor:COLORS.primary,
paddingVertical:8,
paddingHorizontal:14,
borderRadius:10
},

accept:{
backgroundColor:COLORS.success,
paddingVertical:8,
paddingHorizontal:14,
borderRadius:10
},

reject:{
backgroundColor:COLORS.danger,
paddingVertical:8,
paddingHorizontal:14,
borderRadius:10
},

actionText:{
color:"#fff",
fontWeight:"600"
},

badge:{
paddingHorizontal:10,
paddingVertical:4,
borderRadius:12,
fontSize:12,
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
}

});