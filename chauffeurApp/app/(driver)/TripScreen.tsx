import React, { useEffect, useState } from "react";
import {
View,
Text,
StyleSheet,
FlatList,
TouchableOpacity,
ActivityIndicator,
Alert,
RefreshControl
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { API_URL } from "../../src/services/api";

export default function DriverTripsScreen(){

const router = useRouter()
const params = useLocalSearchParams()

const driverId = Number(params?.driverId)

const [trips,setTrips] = useState<any[]>([])
const [loading,setLoading] = useState(true)
const [refreshing,setRefreshing] = useState(false)

useEffect(()=>{

if(!driverId || isNaN(driverId)){

Alert.alert(
"Erreur",
"Chauffeur non identifié"
)

setLoading(false)
return

}

fetchTrips()

},[driverId])

const fetchTrips = async()=>{

try{

const res = await fetch(
`${API_URL}/api/driver/trips?driverId=${driverId}`
)

const data = await res.json()

if(data?.success){

setTrips(data.trips || [])

}else{

Alert.alert(
"Erreur",
data.message || "Impossible de charger les trajets"
)

}

}catch(e){

console.log("DRIVER TRIPS ERROR",e)

Alert.alert(
"Erreur",
"Connexion serveur impossible"
)

}
finally{

setLoading(false)
setRefreshing(false)

}

}

const handleRefresh = ()=>{
setRefreshing(true)
fetchTrips()
}

const getStatus = (trip:any)=>{

if(trip.status === "completed"){
return { label:"Terminé", color:"#6B7280" }
}

if(trip.status === "cancelled"){
return { label:"Annulé", color:"#EF4444" }
}

return { label:"Actif", color:COLORS.success }

}

const renderTrip = ({item}:any)=>{

const status = getStatus(item)

return(

<TouchableOpacity
style={styles.card}
onPress={()=>router.push({
pathname:"/(driver)/trip-detail",
params:{trip:JSON.stringify(item)}
})}
>

<Text style={styles.route}>
{item.departure} → {item.destination}
</Text>

<Text style={styles.meta}>
{item.date} • {item.time}
</Text>

<Text style={styles.meta}>
{item.price} FCFA • {item.seats} place(s)
</Text>

<Text style={[styles.status,{color:status.color}]}>
{status.label}
</Text>

</TouchableOpacity>

)

}

if(loading){

return(
<View style={globalStyles.screen}>
<ActivityIndicator
size="large"
color={COLORS.primary}
/>
</View>
)

}

return(

<View style={globalStyles.screen}>

<Text style={styles.title}>
Mes trajets
</Text>

<FlatList
data={trips}
keyExtractor={(item)=>String(item.id)}
renderItem={renderTrip}
refreshControl={
<RefreshControl
refreshing={refreshing}
onRefresh={handleRefresh}
/>
}
ListEmptyComponent={
<Text style={styles.empty}>
Aucun trajet publié pour le moment
</Text>
}
contentContainerStyle={{paddingBottom:40}}
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

card:{
backgroundColor:"#D1D1D1",
borderRadius:14,
padding:16,
marginBottom:14
},

route:{
fontSize:16,
fontWeight:"600",
marginBottom:6
},

meta:{
fontSize:14,
color:"#333",
marginBottom:4
},

status:{
marginTop:6,
fontSize:13,
fontWeight:"600"
},

empty:{
textAlign:"center",
marginTop:40,
color:COLORS.textMuted
}

})
