// พอร์ตตรรกะ dashboard/ตัวกรองวันที่ จาก index.html (buildClient* + date helpers)
import type { Appointment, Dispense, Fluid, Patient, User } from '../types'
import { formatOrderItemsText, getDaysUntil, normalizeHN, formatThaiDate } from './format'

export type DashboardPeriod =
  | 'today'
  | 'current_month'
  | 'last_30_days'
  | 'current_year'
  | 'custom'
  | 'all'

export interface DashboardFilters {
  period: DashboardPeriod
  dateFrom: string
  dateTo: string
  search: string
}

export function getTodayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getCurrentMonthRange() {
  const now = new Date()
  return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
}

function shiftDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return ymd(date)
}

export function getDashboardDateRange(filters: DashboardFilters): { from: string; to: string } {
  switch (filters.period) {
    case 'today':
      return { from: getTodayDateString(), to: getTodayDateString() }
    case 'last_30_days':
      return { from: shiftDateString(-29), to: getTodayDateString() }
    case 'current_year': {
      const y = new Date().getFullYear()
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }
    case 'custom':
      return { from: filters.dateFrom || '', to: filters.dateTo || '' }
    case 'all':
      return { from: '', to: '' }
    case 'current_month':
    default:
      return getCurrentMonthRange()
  }
}

function compareDateStrings(dateValue: string, from: string, to: string): boolean {
  if (!dateValue) return false
  if (from && dateValue < from) return false
  if (to && dateValue > to) return false
  return true
}

export function isPatientInactive(patient?: Patient): boolean {
  return String(patient?.status || '').toLowerCase() === 'inactive'
}

export function getDashboardDispensedOrders(allOrders: Dispense[], filters: DashboardFilters): Dispense[] {
  const { from, to } = getDashboardDateRange(filters)
  const search = (filters.search || '').trim().toLowerCase()
  return (allOrders || []).filter((order) => {
    if (order.status !== 'dispensed') return false
    const dispenseDate = order.dispenseDateOnly || (order.dispenseDate || '').split(' ')[0] || ''
    if (!compareDateStrings(dispenseDate, from, to)) return false
    if (!search) return true
    return [order.hn, order.name, order.fluidType, formatOrderItemsText(order), order.dispenser, order.dispenseDate].some((value) =>
      String(value || '').toLowerCase().includes(search),
    )
  })
}

export function getUniqueDispensedPatientCount(orders: Dispense[] = []): number {
  return new Set(orders.map((order) => normalizeHN(order.hn)).filter(Boolean)).size
}

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  current_month: 'เดือนปัจจุบัน',
  today: 'วันนี้',
  last_30_days: '30 วันล่าสุด',
  current_year: 'ปีปัจจุบัน',
  all: 'ทุกช่วงเวลา',
  custom: 'ช่วงกำหนดเอง',
}

export function getDashboardSummaryText(filters: DashboardFilters): string {
  const { from, to } = getDashboardDateRange(filters)
  let baseLabel = PERIOD_LABELS[filters.period] || PERIOD_LABELS.current_month
  if (filters.period === 'custom') baseLabel = from && to ? `${formatThaiDate(from)} ถึง ${formatThaiDate(to)}` : 'ช่วงกำหนดเอง'
  const search = (filters.search || '').trim()
  return search
    ? `กำลังแสดงข้อมูลการจ่ายของ ${baseLabel} และค้นหา "${search}"`
    : `กำลังแสดงข้อมูลการจ่ายของ ${baseLabel}`
}

export interface NurseDashboard {
  totalPatients: number
  pendingCount: number
  todayOrderCount: number
}

export function buildClientNurseDashboard(orders: Dispense[] = [], patientsList: Patient[] = []): NurseDashboard {
  const today = getTodayDateString()
  return {
    totalPatients: patientsList.length,
    pendingCount: orders.filter((order) => order.status === 'pending').length,
    todayOrderCount: orders.filter((order) => order.orderDateOnly === today).length,
  }
}

export interface PharmacyDashboard {
  user: User | null
  totalPatients: number
  totalFluids: number
  pendingCount: number
  todayDispensedCount: number
  dispensedPatientCount: number
  pendingOrders: Dispense[]
  recentDispensed: Dispense[]
  recentDispenses: Dispense[]
  upcomingAppointments: (Appointment & { daysUntil: number })[]
  allOrders: Dispense[]
  fluids: Fluid[]
  patients: Patient[]
}

export function buildClientPharmacyDashboard(opts: {
  orders?: Dispense[]
  patientsList?: Patient[]
  fluidsList?: Fluid[]
  appointmentsList?: Appointment[]
  user?: User | null
}): PharmacyDashboard {
  const { orders = [], patientsList = [], fluidsList = [], appointmentsList = [], user = null } = opts
  const today = getTodayDateString()
  const pendingOrdersList = orders.filter((order) => order.status === 'pending')
  const dispensedOrders = orders.filter((order) => order.status === 'dispensed')
  const recentDispensed = dispensedOrders.slice(0, 10)
  const patientByHN = new Map(patientsList.map((patient) => [normalizeHN(patient.hn), patient]))
  const upcomingAppointments = appointmentsList
    .filter((appointment) => !['completed', 'cancelled', 'dispensed'].includes(String(appointment.status || '').toLowerCase()))
    .filter((appointment) => !isPatientInactive(patientByHN.get(normalizeHN(appointment.hn))))
    .map((appointment) => ({ ...appointment, daysUntil: getDaysUntil(appointment.date) }))
    .filter((appointment) => appointment.daysUntil >= 0 && appointment.daysUntil <= 7)
    .sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(a.time || '').localeCompare(String(b.time || ''))
    })
    .slice(0, 10)
  return {
    user,
    totalPatients: patientsList.length,
    totalFluids: fluidsList.length,
    pendingCount: pendingOrdersList.length,
    todayDispensedCount: orders.filter((order) => order.status === 'dispensed' && (order.dispenseDate || '').startsWith(today)).length,
    dispensedPatientCount: getUniqueDispensedPatientCount(dispensedOrders),
    pendingOrders: pendingOrdersList,
    recentDispensed,
    recentDispenses: orders.slice(0, 10),
    upcomingAppointments,
    allOrders: orders,
    fluids: fluidsList,
    patients: patientsList,
  }
}

export function roleLabel(role: string): string {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'admin') return 'Admin (ผู้ดูแลระบบ)'
  if (normalized === 'nurse') return 'Nurse (ห้องตรวจ)'
  return 'Pharmacist (ห้องจ่ายยา)'
}
