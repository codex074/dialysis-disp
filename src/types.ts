// ชนิดข้อมูลหลักของระบบ (พอร์ตจากโครงสร้างข้อมูลใน Code.gs)

export type Role = 'admin' | 'pharmacist' | 'nurse'
export type DispenseStatus = 'pending' | 'dispensed' | 'cancelled'
export type PatientStatus = 'active' | 'inactive'

export interface User {
  username: string
  name: string
  fullName: string
  role: Role
  token: string
}

// เอกสารใน Firestore collection `users` (รวม hash รหัสผ่าน)
export interface UserDoc {
  username: string
  password: string // SHA-256(password + salt) hex
  name: string
  role: Role
  createdDate?: string
}

export interface Patient {
  hn: string
  name: string
  phone: string
  treatmentRights: string
  note: string
  registeredDate: string
  status: PatientStatus
  inactiveNote: string
}

export interface Fluid {
  code: string
  name: string
  labelName: string
  ingredient: string
  conc: string
  price: number | ''
  addedDate: string
}

export interface OrderItem {
  fluidType: string
  quantity: number | string
}

export interface Dispense {
  id: string
  orderDate: string
  orderDateOnly: string
  hn: string
  name: string
  fluidType: string
  quantity: string
  items: OrderItem[]
  orderedBy: string
  nurse: string
  note: string
  nurseNote: string
  status: DispenseStatus
  dispensedDate: string
  dispenseDate: string
  dispenseDateOnly: string
  dispensedBy: string
  dispenser: string
  nextAppointment: string
  nextTime: string
}

export interface Appointment {
  id: string
  hn: string
  name: string
  date: string
  time: string
  status: string
  note: string
  dispenseId: string
}

// รูปแบบ response มาตรฐานของ service (เลียนแบบ Code.gs)
export type ServiceResult<T = unknown> =
  | { status: 'success'; message?: string; data?: T; [k: string]: unknown }
  | { status: 'error'; message: string; [k: string]: unknown }
