import React, { useEffect, useState, useRef } from "react";
import {
View,
StyleSheet,
ActivityIndicator,
Text,
Dimensions
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";

import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";

const GOOGLE_MAPS_KEY = "AIzaSyDfq25kW4d-Td3LZeM3HUO38XGcyxRxkE8";

const { width } = Dimensions.get("window");

export default function TripReservationScreen(){

const params = useLocalSearchParams()
const tripId = Number(params?.tripId ?? 0)

const mapRef = useRef<MapView | null>(null)

const [driverLocation,setDriverLocation] = useState<any>(null)
const [destination,setDestination] = useState<any>(null)
const [routeCoords,setRouteCoords] = useState<any[]>([])

const [heading,setHeading] = useState(0)
const [loading,setLoading] = useState(true)

/* =========================
   Boussole
========================= */

useEffect(()=>{

const sub = Magnetometer.addListener(data=>{

const angle = Math.atan2(data.y,data.x)*(180/Math.PI)
setHeading(angle >= 0 ? angle : angle + 360)

})

return ()=>sub.remove()

},[])

/* =========================
   GPS chauffeur
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
loc=>{

const pos = {
latitude:loc.coords.latitude,
longitude:loc.coords.longitude
}

setDriverLocation(pos)

if(mapRef.current){

mapRef.current.animateCamera({
center:pos,
heading,
zoom:17,
pitch:45
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

const res = await fetch(
`${API_URL}/api/trips/coords?tripId=${tripId}`
)

const data = await res.json()

if(data?.success){

setDestination({
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
   Calcul route Google
========================= */

useEffect(()=>{

if(!driverLocation || !destination) return

const fetchRoute = async()=>{

try{

const url =
`https://maps.googleapis.com/maps/api/directions/json?`+
`origin=${driverLocation.latitude},${driverLocation.longitude}`+
`&destination=${destination.latitude},${destination.longitude}`+
`&mode=driving&key=${GOOGLE_MAPS_KEY}`

const res = await fetch(url)
const json = await res.json()

if(json.routes?.length){

const route = json.routes[0]

const decoded = decodePolyline(
route.overview_polyline.points
)

setRouteCoords(decoded)
setLoading(false)

}

}catch(e){

console.log("ROUTE ERROR",e)

}

}

fetchRoute()

},[driverLocation,destination])

/* =========================
   Loader
========================= */

if(loading || !driverLocation || !destination){

return(
<View style={styles.center}>
<ActivityIndicator size="large"/>
<Text>Chargement navigation...</Text>
</View>
)

}

return(

<View style={{flex:1}}>

<MapView
ref={mapRef}
style={styles.map}
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

<Marker coordinate={destination} title="Destination" pinColor="red"/>

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
   Decode polyline
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

map:{
flex:1
},

center:{
flex:1,
justifyContent:"center",
alignItems:"center"
}

})
