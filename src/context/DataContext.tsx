import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Appointment, Dispense, Fluid, Patient } from '../types'
import { getPatientsData } from '../services/patients'
import { getFluidsData } from '../services/fluids'
import { getAllDispenseData, getAppointmentsData } from '../services/dispenses'

interface DataState {
  patients: Patient[]
  fluids: Fluid[]
  orders: Dispense[] // เรียงใหม่ -> เก่า (reverse)
  appointments: Appointment[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [fluids, setFluids] = useState<Fluid[]>([])
  const [orders, setOrders] = useState<Dispense[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, f, o, a] = await Promise.all([
        getPatientsData(),
        getFluidsData(),
        getAllDispenseData(),
        getAppointmentsData(),
      ])
      setPatients(p)
      setFluids(f)
      setOrders([...o].reverse())
      setAppointments(a)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // โหลดข้อมูลครั้งแรกเมื่อ mount (sync จาก Firestore เข้าสู่ React)
    refresh()
  }, [refresh])

  return (
    <DataContext.Provider value={{ patients, fluids, orders, appointments, loading, error, refresh }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
