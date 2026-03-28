import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Dimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";

const GOOGLE_MAPS_KEY = "AIzaSyDfq25kW4d-Td3LZeM3HUO38XGcyxRxkE8";
const { width } = Dimensions.get("window");

export default function DriverTripMapScreen(){

const params = useLocalSearchParams()
const tripId = Number(params?.tripId)

const mapRef = useRef<MapView | null>(null)

const [driverLocation,setDriverLocation] = useState<any>(null)
const [endPoint,setEndPoint] = useState<any>(null)
const [routeCoords,setRouteCoords] = useState<any[]>([])

const [instruction,setInstruction] = useState("Démarrage navigation...")
const [eta,setEta] = useState("")
const [heading,setHeading] = useState(0)

const [loading,setLoading] = useState(true)
const [lastSpoken,setLastSpoken] = useState("")

/* =========================
   Boussole
========================= */

useEffect(()=>{

const sub = Magnetometer.addListener(data=>{

let angle = Math.atan2(data.y,data.x)*(180/Math.PI)
setHeading(angle >= 0 ? angle : angle + 360)

})

return ()=>sub.remove()

},[])

/* =========================
   GPS Chauffeur
========================= */

useEffect(()=>{

let sub:Location.LocationSubscription

;(async()=>{

const {status} = await Location.requestForegroundPermissionsAsync()
if(status !== "granted") return

sub = await Location.watchPositionAsync(
{
accuracy:Location.Accuracy.Highest,
timeInterval:3000,
distanceInterval:5
},
async loc=>{

const pos = {
latitude:loc.coords.latitude,
longitude:loc.coords.longitude
}

setDriverLocation(pos)

/* envoyer position serveur */

try{

await fetch(`${API_URL}/api/driver/location`,{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
tripId,
lat:pos.latitude,
lng:pos.longitude
})
})

}catch(e){
console.log("LOCATION UPDATE ERROR",e)
}

/* caméra navigation */

if(mapRef.current){

mapRef.current.animateCamera({
center:pos,
pitch:60,
heading,
zoom:18
})

}

}
)

})()

return ()=>{ if(sub) sub.remove() }

},[heading])

/* =========================
   Charger destination
========================= */

useEffect(()=>{

if(!tripId) return

const loadTripCoords = async()=>{

try{

const res = await fetch(`${API_URL}/api/trips/coords?tripId=${tripId}`)
const data = await res.json()

if(data?.success){

setEndPoint({
latitude:Number(data.end.lat),
longitude:Number(data.end.lng)
})

}

}catch(e){
console.log("DESTINATION ERROR",e)
}

}

loadTripCoords()

},[tripId])

/* =========================
   Navigation Google
========================= */

const fetchRoute = async()=>{

if(!driverLocation || !endPoint) return

try{

const url =
`https://maps.googleapis.com/maps/api/directions/json?`+
`origin=${driverLocation.latitude},${driverLocation.longitude}`+
`&destination=${endPoint.latitude},${endPoint.longitude}`+
`&mode=driving&key=${GOOGLE_MAPS_KEY}`

const res = await fetch(url)
const json = await res.json()

if(!json.routes?.length) return

const route = json.routes[0]
const leg = route.legs[0]

setEta(`${leg.duration.text} • ${leg.distance.text}`)

const nextStep = leg.steps[0]?.html_instructions?.replace(/<[^>]+>/g,"")

if(nextStep){

setInstruction(nextStep)

if(nextStep !== lastSpoken){

Speech.speak(nextStep,{
language:"fr",
rate:0.9
})

setLastSpoken(nextStep)

}

}

const decoded = decodePolyline(route.overview_polyline.points)
setRouteCoords(decoded)

setLoading(false)

}catch(e){

console.log("NAV ERROR",e)

}

}

useEffect(()=>{

if(driverLocation && endPoint){
fetchRoute()
}

},[driverLocation,endPoint])

/* =========================
   Sortie de route
========================= */

useEffect(()=>{

if(!driverLocation || routeCoords.length===0) return

let minDistance = Infinity

routeCoords.forEach(p=>{

const d = distanceBetween(driverLocation,p)

if(d < minDistance) minDistance = d

})

if(minDistance > 60){
fetchRoute()
}

},[driverLocation])

/* =========================
   Loader
========================= */

if(loading || !driverLocation || !endPoint){

return(
<View style={styles.center}>
<ActivityIndicator size="large"/>
<Text>Navigation en cours...</Text>
</View>
)

}

const isNight = new Date().getHours() >= 19 || new Date().getHours() <= 6

return(

<View style={{flex:1}}>

<View style={[styles.banner,isNight && styles.bannerNight]}>

<Text style={styles.instructionText}>
🧭 {instruction}
</Text>

<Text style={styles.etaText}>
⏱️ {eta}
</Text>

</View>

<MapView
ref={mapRef}
style={styles.map}
customMapStyle={isNight ? nightMapStyle : []}
initialRegion={{
latitude:driverLocation.latitude,
longitude:driverLocation.longitude,
latitudeDelta:0.05,
longitudeDelta:0.05
}}
>

<Marker coordinate={driverLocation} rotation={heading} flat>
<Text style={{fontSize:28}}>🚗</Text>
</Marker>

<Marker coordinate={endPoint} title="Arrivée" pinColor="red"/>

<Polyline
coordinates={routeCoords}
strokeWidth={6}
strokeColor="#2563EB"
/>

</MapView>

</View>

)

}

/* =========================
   Distance GPS
========================= */

function distanceBetween(a:any,b:any){

const R = 6371e3

const φ1 = a.latitude*Math.PI/180
const φ2 = b.latitude*Math.PI/180

const Δφ = (b.latitude-a.latitude)*Math.PI/180
const Δλ = (b.longitude-a.longitude)*Math.PI/180

const x =
Math.sin(Δφ/2)*Math.sin(Δφ/2)+
Math.cos(φ1)*Math.cos(φ2)*
Math.sin(Δλ/2)*Math.sin(Δλ/2)

const c = 2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))

return R*c

}

/* =========================
   Polyline decode
========================= */

function decodePolyline(encoded:string){

let points:any[]=[]
let index=0,lat=0,lng=0

while(index<encoded.length){

let b,shift=0,result=0

do{
b=encoded.charCodeAt(index++)-63
result|=(b&0x1f)<<shift
shift+=5
}while(b>=0x20)

lat+=result&1?~(result>>1):(result>>1)

shift=0
result=0

do{
b=encoded.charCodeAt(index++)-63
result|=(b&0x1f)<<shift
shift+=5
}while(b>=0x20)

lng+=result&1?~(result>>1):(result>>1)

points.push({
latitude:lat/1e5,
longitude:lng/1e5
})

}

return points

}

/* =========================
   Styles
========================= */

const styles = StyleSheet.create({

map:{ flex:1 },

center:{
flex:1,
justifyContent:"center",
alignItems:"center"
},

banner:{
position:"absolute",
top:40,
width:width-20,
alignSelf:"center",
backgroundColor:"#fff",
padding:14,
borderRadius:16,
zIndex:10,
elevation:5
},

bannerNight:{
backgroundColor:"#111827"
},

instructionText:{
fontSize:16,
fontWeight:"700",
color:"#2563EB",
textAlign:"center"
},

etaText:{
fontSize:13,
color:"#9CA3AF",
textAlign:"center",
marginTop:4
}

})

/* =========================
   Map style nuit
========================= */

const nightMapStyle=[
{elementType:"geometry",stylers:[{color:"#1f2933"}]},
{elementType:"labels.text.fill",stylers:[{color:"#9CA3AF"}]},
{elementType:"labels.text.stroke",stylers:[{color:"#111827"}]}
]