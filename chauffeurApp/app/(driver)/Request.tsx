import React, { useEffect, useState } from "react";
import {
View,
Text,
StyleSheet,
FlatList,
TouchableOpacity,
ActivityIndicator,
Alert
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { API_URL } from "../../src/services/api";

type Request = {
id: number
departure: string
destination: string
passenger_name: string
seats_reserved: number
}

export default function DriverRequestsScreen() {

const params = useLocalSearchParams()
const driverId = Number(params?.driverId)

const [loading,setLoading] = useState(true)
const [requests,setRequests] = useState<Request[]>([])

useEffect(()=>{

if(!driverId || isNaN(driverId)){
Alert.alert("Erreur","Chauffeur non identifié")
setLoading(false)
return
}

fetchRequests()

},[driverId])

const fetchRequests = async()=>{

try{

const res = await fetch(
`${API_URL}/api/driver/requests?driverId=${driverId}`
)

const data = await res.json()

if(data?.success){
setRequests(data.requests || [])
}else{
setRequests([])
}

}catch(error){

console.log("DRIVER REQUESTS ERROR",error)
Alert.alert("Erreur","Impossible de charger les demandes")

}
finally{
setLoading(false)
}

}

const updateRequestStatus = async(id:number,status:"accepted"|"rejected")=>{

try{

const res = await fetch(`${API_URL}/api/driver/request-action`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
requestId:id,
status
})
})

const data = await res.json()

if(data?.success){

Alert.alert(
"Succès",
status === "accepted"
? "Réservation acceptée"
: "Réservation refusée"
)

fetchRequests()

}else{
Alert.alert("Erreur",data.message || "Action impossible")
}

}catch(e){

Alert.alert("Erreur","Connexion serveur impossible")

}

}

const renderItem = ({item}:{item:Request})=>(

<View style={styles.card}>

<Text style={styles.route}>
{item?.departure} → {item?.destination}
</Text>

<Text style={styles.info}>
Passager : {item?.passenger_name}
</Text>

<Text style={styles.info}>
Places demandées : {item?.seats_reserved}
</Text>

<View style={styles.actions}>

<TouchableOpacity
style={styles.accept}
onPress={()=>updateRequestStatus(item.id,"accepted")}
>
<Text style={styles.actionText}>
Accepter
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.reject}
onPress={()=>updateRequestStatus(item.id,"rejected")}
>
<Text style={styles.actionText}>
Refuser
</Text>
</TouchableOpacity>

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
Demandes de réservation
</Text>

{requests.length === 0 ? (

<Text style={styles.empty}>
Aucune demande pour le moment.
</Text>

) : (

<FlatList
data={requests}
keyExtractor={(item)=>item.id.toString()}
renderItem={renderItem}
/>

)}

</View>

)

}

const styles = StyleSheet.create({

title:{
color:COLORS.textLight,
fontSize:22,
fontWeight:"600",
marginBottom:20,
textAlign:"center"
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

route:{
fontSize:16,
fontWeight:"600",
marginBottom:6
},

info:{
fontSize:14,
color:"#555",
marginBottom:4
},

actions:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:12
},

accept:{
backgroundColor:COLORS.success,
paddingVertical:10,
paddingHorizontal:20,
borderRadius:10
},

reject:{
backgroundColor:COLORS.danger,
paddingVertical:10,
paddingHorizontal:20,
borderRadius:10
},

actionText:{
color:"#fff",
fontWeight:"600"
}

})