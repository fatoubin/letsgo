import React, { useEffect, useState } from "react";
import {
View,
Text,
FlatList,
StyleSheet,
ActivityIndicator
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { API_URL } from "../../src/services/api";

type Stats = {
total_trips:number
total_reservations:number
total_passengers:number
total_revenue:number
}

type HistoryItem = {
id:number
departure:string
destination:string
date:string
passengers:number
price:number
}

export default function DriverStatsScreen(){

const params = useLocalSearchParams()
const driverId = Number(params?.driverId)

const [stats,setStats] = useState<Stats | null>(null)
const [history,setHistory] = useState<HistoryItem[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{

if(!driverId || isNaN(driverId)){
setLoading(false)
return
}

loadStats()

},[driverId])

const loadStats = async()=>{

try{

const statsRes = await fetch(
`${API_URL}/api/driver/stats?driverId=${driverId}`
)

const statsData = await statsRes.json()

if(statsData?.success){
setStats(statsData.stats)
}

const historyRes = await fetch(
`${API_URL}/api/driver/history?driverId=${driverId}`
)

const historyData = await historyRes.json()

if(historyData?.success){
setHistory(historyData.history || [])
}

}catch(e){

console.log("DRIVER STATS ERROR",e)

}
finally{

setLoading(false)

}

}

if(loading){

return(
<View style={styles.center}>
<ActivityIndicator size="large" color={COLORS.primary}/>
<Text style={{marginTop:10}}>
Chargement des statistiques...
</Text>
</View>
)

}

if(!stats){

return(
<View style={styles.center}>
<Text style={{color:COLORS.textMuted}}>
Impossible de charger les statistiques
</Text>
</View>
)

}

return(

<View style={globalStyles.screen}>

<Text style={styles.title}>
Statistiques
</Text>

<View style={styles.statsRow}>
<Stat label="Trajets" value={stats.total_trips}/>
<Stat label="Réservations" value={stats.total_reservations}/>
</View>

<View style={styles.statsRow}>
<Stat label="Passagers" value={stats.total_passengers}/>
<Stat label="Revenus" value={stats.total_revenue}/>
</View>

<Text style={styles.subtitle}>
Historique des trajets
</Text>

{history.length === 0 ? (

<Text style={styles.empty}>
Aucun trajet terminé pour le moment
</Text>

) : (

<FlatList
data={history}
keyExtractor={(item)=>item.id.toString()}
renderItem={({item})=>(

<View style={styles.card}>

<Text style={styles.route}>
{item.departure} → {item.destination}
</Text>

<Text style={styles.meta}>
Date : {item.date}
</Text>

<Text style={styles.meta}>
Passagers : {item.passengers}
</Text>

<Text style={styles.meta}>
Gain : {item.price * item.passengers} FCFA
</Text>

</View>

)}
contentContainerStyle={{paddingBottom:40}}
/>

)}

</View>

)

}

function Stat({label,value}:{label:string,value:number}){

return(

<View style={styles.statBox}>

<Text style={styles.statValue}>
{value}
</Text>

<Text style={styles.statLabel}>
{label}
</Text>

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
fontSize:26,
color:COLORS.textLight,
textAlign:"center",
marginBottom:20,
fontWeight:"600"
},

subtitle:{
fontSize:18,
marginTop:30,
marginBottom:10,
color:COLORS.textLight
},

statsRow:{
flexDirection:"row",
justifyContent:"space-between"
},

statBox:{
backgroundColor:"#D1D1D1",
borderRadius:14,
padding:16,
width:"48%",
alignItems:"center",
marginBottom:14
},

statValue:{
fontSize:22,
fontWeight:"700"
},

statLabel:{
fontSize:13,
color:"#555"
},

card:{
backgroundColor:"#D1D1D1",
borderRadius:14,
padding:14,
marginBottom:12
},

route:{
fontWeight:"600",
marginBottom:6
},

meta:{
color:"#444"
},

empty:{
textAlign:"center",
marginTop:40,
color:COLORS.textMuted
}

})