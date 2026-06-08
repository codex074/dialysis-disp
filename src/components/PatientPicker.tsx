// ช่องค้นหา/เลือกผู้ป่วยแบบ dropdown (พอร์ตจาก patient picker ใน index.html)
import { useMemo, useRef, useState } from 'react'
import type { Patient } from '../types'
import { normalizeHN } from '../lib/format'
import { isPatientInactive } from '../lib/dashboard'
import { PatientStatusBadge } from './badges'

export function findPatientsByQuery(patients: Patient[], query: string): Patient[] {
  const value = (query || '').trim().toLowerCase()
  if (!value) return []
  const exact = patients.filter(
    (p) => String(p.hn).toLowerCase() === value || (p.name || '').toLowerCase() === value,
  )
  if (exact.length > 0) return exact
  return patients.filter(
    (p) => String(p.hn).toLowerCase().includes(value) || (p.name || '').toLowerCase().includes(value),
  )
}

export default function PatientPicker({
  patients,
  value,
  onChange,
  onSelect,
  disabled,
  placeholder = 'พิมพ์ค้นหา HN หรือชื่อผู้ป่วย...',
}: {
  patients: Patient[]
  value: string
  onChange: (text: string) => void
  onSelect: (patient: Patient) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<number | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    const list = q
      ? patients.filter((p) => String(p.hn).toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))
      : patients
    return list.slice(0, 50)
  }, [patients, value])

  function choose(p: Patient) {
    window.clearTimeout(blurTimer.current)
    onSelect(p)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150)
        }}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        className="w-full px-4 py-2.5 pr-20 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100"
      />
      {value && !disabled && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onChange('')
          }}
          className="absolute inset-y-0 right-10 my-auto clear-search-button"
          aria-label="ล้างข้อความค้นหา"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          setOpen((o) => !o)
        }}
        className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-cyan-600"
        aria-label="เปิดรายการผู้ป่วย"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-cyan-100 bg-white shadow-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">{value ? 'ไม่พบผู้ป่วยที่ค้นหา' : 'ยังไม่มีข้อมูลผู้ป่วยให้เลือก'}</div>
            ) : (
              filtered.map((patient) => (
                <button
                  key={normalizeHN(patient.hn)}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(patient)
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-transparent transition hover:bg-cyan-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{patient.name}</p>
                      <p className="text-xs text-slate-500">HN: {patient.hn}{patient.phone ? ` • โทร: ${patient.phone}` : ''}</p>
                      {isPatientInactive(patient) && patient.inactiveNote && (
                        <p className="text-xs text-rose-600 mt-1">Inactive: {patient.inactiveNote}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <PatientStatusBadge patient={patient} />
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-500">{patient.treatmentRights || 'ไม่ระบุสิทธิ์'}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
