// หน้าดูประวัติผู้ป่วย (ใช้ร่วมกันทั้งห้องตรวจ/ห้องจ่ายยา) — พอร์ตจาก HISTORY tab
import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import type { Dispense, Patient } from '../types'
import { getPatientHistory } from '../services/dispenses'
import { getOrderFluidNames, splitOrderLines } from '../lib/format'
import { isPatientInactive } from '../lib/dashboard'
import { getPaginationData } from '../lib/pagination'
import { toastError } from '../lib/swal'
import PatientPicker, { findPatientsByQuery } from './PatientPicker'
import Pagination from './Pagination'
import { PatientStatusBadge, StatusBadge } from './badges'

export default function PatientHistoryView() {
  const { patients } = useData()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Patient | null>(null)
  const [history, setHistory] = useState<Dispense[] | null>(null)
  const [page, setPage] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const patientList = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? patients.filter((p) => p.hn.toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))
      : patients
    return list
  }, [patients, query])

  async function loadHistoryFor(patient: Patient) {
    setSelected(patient)
    setQuery(`${patient.hn} - ${patient.name}`)
    setLoadingHistory(true)
    const res = await getPatientHistory(patient.hn)
    setLoadingHistory(false)
    if (res.status !== 'success') {
      toastError(res.message || 'โหลดประวัติไม่สำเร็จ')
      return
    }
    setHistory(res.data || [])
    setPage(1)
  }

  function handleSearch() {
    if (!query.trim()) {
      toastError('กรุณากรอก HN')
      return
    }
    if (selected) {
      loadHistoryFor(selected)
      return
    }
    const matches = findPatientsByQuery(patients, query)
    if (matches.length === 1) loadHistoryFor(matches[0])
    else if (matches.length > 1) toastError('พบหลายผู้ป่วย กรุณาระบุ HN หรือชื่อเต็มให้ชัดเจนขึ้น')
    else toastError(`ไม่พบข้อมูลผู้ป่วย: ${query}`)
  }

  const pagination = history ? getPaginationData(history, page) : null
  const totalDispensed = history?.filter((o) => o.status === 'dispensed').length || 0
  const pendingCount = history?.filter((o) => o.status === 'pending').length || 0

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-slate-800 font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            ดูประวัติการรับน้ำยา
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">เลือกผู้ป่วย (HN หรือชื่อ)</label>
              <PatientPicker
                patients={patients}
                value={query}
                onChange={(text) => {
                  setQuery(text)
                  setSelected(null)
                }}
                onSelect={loadHistoryFor}
                placeholder="พิมพ์ค้นหา HN หรือชื่อ..."
              />
            </div>
            <div className="flex items-end">
              <button onClick={handleSearch} className="btn-primary w-full px-4 py-2.5 rounded-lg font-medium">ดูประวัติ</button>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-cyan-100 bg-slate-50/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-cyan-100 bg-white/80 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-slate-800">รายชื่อผู้ป่วยสำหรับดูประวัติ</p>
                <p className="text-xs text-slate-500 mt-1">{patients.length === 0 ? 'ยังไม่มีข้อมูลผู้ป่วย' : `ทั้งหมด ${patientList.length} ราย`}</p>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {patientList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">ยังไม่มีข้อมูลผู้ป่วย</div>
              ) : (
                patientList.map((p) => (
                  <button
                    key={p.hn}
                    type="button"
                    onClick={() => loadHistoryFor(p)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition ${selected?.hn === p.hn ? 'border-cyan-300 bg-cyan-50' : 'border-transparent hover:bg-cyan-50'} ${isPatientInactive(p) ? 'bg-rose-50/40' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">HN: {p.hn}{p.phone ? ` • โทร: ${p.phone}` : ''}</p>
                      </div>
                      <PatientStatusBadge patient={p} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50">
            <h3 className="text-slate-800 font-semibold">{selected.name} (HN: {selected.hn})</h3>
          </div>
          {loadingHistory ? (
            <div className="text-center py-8 text-slate-400">กำลังโหลด...</div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">ยังไม่มีประวัติการรับน้ำยา</div>
          ) : (
            <>
              <div className="p-5 bg-gradient-to-br from-cyan-50 to-blue-50 border-b border-cyan-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-xs text-slate-500">ทั้งหมด</p><p className="text-xl font-bold text-cyan-700">{history.length}</p></div>
                  <div><p className="text-xs text-slate-500">จ่ายแล้ว</p><p className="text-xl font-bold text-emerald-600">{totalDispensed}</p></div>
                  <div><p className="text-xs text-slate-500">รอจ่าย</p><p className="text-xl font-bold text-amber-600">{pendingCount}</p></div>
                </div>
                {selected.phone && <p className="text-xs text-slate-500 mt-3 text-center">โทร: {selected.phone}</p>}
                {selected.treatmentRights && <p className="text-xs text-slate-500 mt-1 text-center">สิทธิการรักษา: {selected.treatmentRights}</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-medium text-slate-600 uppercase">
                      <th className="px-4 py-3">วันที่จ่าย</th>
                      <th className="px-4 py-3">น้ำยา</th>
                      <th className="px-4 py-3">จำนวน</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">ผู้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagination!.items.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{o.dispenseDateOnly || '-'}</td>
                        <td className="px-4 py-3">{getOrderFluidNames(o).map((n, i) => <div key={i} className="mb-1 last:mb-0">{n}</div>)}</td>
                        <td className="px-4 py-3 font-medium">{splitOrderLines(o.quantity).map((q, i) => <div key={i}>{q}</div>)}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 text-slate-500">{o.dispenser || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && pagination.totalPages > 1 && (
                <div className="px-5 py-4 border-t border-cyan-100 bg-slate-50">
                  <Pagination data={pagination} onChange={(d) => setPage((p) => p + d)} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
