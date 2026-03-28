export type Driver = {
  id: number
  fullname: string
  email?: string
  status: "approved" | "pending" | "rejected"
  brand?: string
  seats?: number
  license_type?: string
  plate_number?: string
}

export type Trip = {
  id: number
  departure: string
  destination: string
  date: string
  time: string
  price: number
  seats: number
}

export type Reservation = {
  id: number
  passenger_name: string
  passenger_phone: string
  seats_reserved: number
  status: "pending" | "accepted" | "rejected"
}