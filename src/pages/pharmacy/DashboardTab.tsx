// แท็บ Dashboard ห้องจ่ายยา — สถิติ + ตัวกรอง + รายการรอจ่าย/จ่ายแล้ว + คิวนัด
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import type { Dispense } from '../../types'
import { confirmDispense } from '../../services/dispenses'
import {
  buildClientPharmacyDashboard,
  getDashboardDispensedOrders,
  getDashboardSummaryText,
  getUniqueDispensedPatientCount,
  type DashboardFilters,
} from '../../lib/dashboard'
import { formatNextAppointmentLabel, formatThaiDate, getOrderFluidNames, normalizeHN } from '../../lib/format'
import { openDispenseDialog } from '../../lib/dispenseDialog'
import { Swal } from '../../lib/swal'

const DEFAULT_FILTERS: DashboardFilters = { period: 'current_month', dateFrom: '', dateTo: '', search: '' }

export default function DashboardTab({ onGotoPending, onGotoHistory }: { onGotoPending: () => void; onGotoHistory: () => void }) {
  const { user } = useAuth()
  const { orders, patients, fluids, appointments, refresh } = useData()
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders])
  const filteredDispensed = useMemo(() => getDashboardDispensedOrders(orders, filters), [orders, filters])
  const snapshot = useMemo(
    () => buildClientPharmacyDashboard({ orders, patientsList: patients, fluidsList: fluids, appointmentsList: appointments, user }),
    [orders, patients, fluids, appointments, user],
  )
  const todayAppointments = snapshot.upcomingAppointments.filter((a) => a.daysUntil === 0)
  const futureAppointments = snapshot.upcomingAppointments.filter((a) => a.daysUntil > 0)

  async function dispense(order: Dispense) {
    const note = await openDispenseDialog(order)
    if (note === null || !user) return
    const res = await confirmDispense(order.id, user, note)
    if (res.status === 'success') {
      Swal.fire({ icon: 'success', title: 'จ่ายยาเรียบร้อย', timer: 1800, showConfirmButton: false })
      await refresh()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  const isCustom = filters.period === 'custom'

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-slate-800 font-semibold">ตัวกรองสรุปการจ่ายยา</h3>
              <p className="text-xs text-slate-500 mt-1">เริ่มต้นแสดงเฉพาะข้อมูลการจ่ายของเดือนปัจจุบัน และสามารถเปลี่ยนช่วงเวลาได้ตามต้องการ</p>
            </div>
            <button type="button" onClick={() => setShowFilters((s) => !s)} className="text-xs px-3 py-1.5 bg-white rounded-lg text-slate-700 border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2">
              <span>{showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}</span>
              <svg className="w-4 h-4 transition-transform" style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </div>
        <div className="p-5">
          <div className="mt-3 flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-600">{getDashboardSummaryText(filters)}</p>
            <p className="text-xs text-slate-400">รายการรอจ่ายยังคงแสดงสถานะปัจจุบันของระบบเสมอ</p>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-emerald-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ช่วงข้อมูล</label>
                  <select value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value as DashboardFilters['period'] })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <option value="current_month">เดือนปัจจุบัน</option>
                    <option value="today">วันนี้</option>
                    <option value="last_30_days">30 วันล่าสุด</option>
                    <option value="current_year">ปีปัจจุบัน</option>
                    <option value="custom">กำหนดเอง</option>
                    <option value="all">ทั้งหมด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ตั้งแต่วันที่</label>
                  <input type="date" disabled={!isCustom} value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ถึงวันที่</label>
                  <input type="date" disabled={!isCustom} value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ค้นหาเพิ่มเติม</label>
                  <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="HN, ชื่อ, น้ำยา, ผู้จ่าย..." className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs px-3 py-1.5 bg-white rounded-lg text-slate-700 border border-slate-200 hover:bg-slate-50">รีเซ็ตตัวกรอง</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard className="stat-gradient-2 pulse-urgent" label="รอจ่าย" value={pendingOrders.length} />
        <StatCard className="stat-gradient-3" label="จ่ายในช่วงที่เลือก" value={filteredDispensed.length} />
        <StatCard className="stat-gradient-1" label="ผู้ป่วยทั้งหมด" value={patients.length} />
        <StatCard className="stat-gradient-4" label="รายที่จ่ายน้ำยา" value={getUniqueDispensedPatientCount(filteredDispensed)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
            <h3 className="text-white font-semibold">⏰ รายการรอจ่าย (ด่วน)</h3>
            <button onClick={onGotoPending} className="text-xs bg-white/20 text-white px-3 py-1 rounded-full hover:bg-white/30">ดูทั้งหมด →</button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">ไม่มีรายการรอจ่าย</div>
            ) : (
              <>
                {pendingOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="p-3 mb-2 rounded-xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50 transition">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{o.name}</p>
                        <p className="text-xs text-slate-600">HN: {o.hn}</p>
                        <div className="text-sm text-slate-700 mt-1">{getOrderFluidNames(o).map((n, i) => <div key={i}>{n}</div>)}</div>
                        <p className="text-xs text-slate-400 mt-1">สั่ง: {o.orderDate}</p>
                        <p className="text-xs text-amber-700 mt-1">นัดถัดไป: {formatNextAppointmentLabel(o)}</p>
                      </div>
                      <button onClick={() => dispense(o)} className="btn-success px-3 py-1.5 rounded-lg text-xs font-medium">จ่ายยา</button>
                    </div>
                  </div>
                ))}
                {pendingOrders.length > 5 && (
                  <div className="text-center pt-2"><button onClick={onGotoPending} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">ดูทั้งหมด {pendingOrders.length} รายการ →</button></div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4">
            <h3 className="text-white font-semibold">✓ รายการจ่ายตามตัวกรอง</h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {filteredDispensed.length === 0 ? (
              <div className="text-center py-8 text-slate-400">ไม่พบรายการจ่ายตามตัวกรอง</div>
            ) : (
              filteredDispensed.slice(0, 5).map((o) => (
                <div key={o.id} className="p-3 mb-2 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">{o.name}</p>
                      <div className="text-xs text-slate-500">HN: {o.hn} • {getOrderFluidNames(o).join(', ')}</div>
                      <p className="text-xs text-emerald-600 mt-1">จ่ายโดย: {o.dispenser} • {o.dispenseDate}</p>
                    </div>
                    <span className="status-dispensed px-2 py-0.5 rounded-md text-xs font-medium h-fit">✓</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Appointment panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <PharmacyApptPanel title="ผู้ป่วยนัดวันนี้" subtitle="ติดตามผู้ป่วยที่น่าจะมารับน้ำยาวันนี้" headerClass="from-rose-50 to-orange-50" countClass="bg-rose-100 text-rose-700" items={todayAppointments} emptyText="ยังไม่มีนัดวันนี้" pendingOrders={pendingOrders} patients={patients} onGotoPending={onGotoPending} onHistory={onGotoHistory} />
        <PharmacyApptPanel title="ผู้ป่วยใกล้ถึงนัด" subtitle="นัดที่กำลังจะมาถึงภายใน 7 วัน" headerClass="from-amber-50 to-yellow-50" countClass="bg-amber-100 text-amber-700" items={futureAppointments} emptyText="ยังไม่มีนัดใกล้ถึง" pendingOrders={pendingOrders} patients={patients} onGotoPending={onGotoPending} onHistory={onGotoHistory} />
      </div>
    </>
  )
}

function StatCard({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <div className={`${className} rounded-2xl p-5 text-white card-hover shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>
      <p className="text-white/80 text-xs font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

function PharmacyApptPanel({
  title, subtitle, headerClass, countClass, items, emptyText, pendingOrders, patients, onGotoPending, onHistory,
}: {
  title: string; subtitle: string; headerClass: string; countClass: string
  items: { hn: string; name: string; date: string; time: string; daysUntil: number }[]
  emptyText: string; pendingOrders: Dispense[]; patients: { hn: string; name: string; phone: string }[]
  onGotoPending: () => void; onHistory: () => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      <div className={`px-5 py-4 border-b border-emerald-100 bg-gradient-to-r ${headerClass} flex items-center justify-between gap-3 flex-wrap`}>
        <div>
          <h3 className="text-slate-800 font-semibold">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${countClass}`}>{items.length} ราย</span>
      </div>
      <div className="p-3 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400">{emptyText}</div>
        ) : (
          items.map((item) => {
            const patient = patients.find((p) => normalizeHN(p.hn) === normalizeHN(item.hn))
            const patientPending = pendingOrders.find((o) => normalizeHN(o.hn) === normalizeHN(item.hn))
            return (
              <div key={`${item.hn}-${item.date}`} className={`rounded-xl border ${item.daysUntil === 0 ? 'border-rose-200 bg-rose-50/70' : 'border-amber-200 bg-amber-50/70'} p-4`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.daysUntil === 0 ? (
                        <span className="status-urgent px-2 py-0.5 rounded-md text-xs font-medium">วันนี้</span>
                      ) : (
                        <span className="status-pending px-2 py-0.5 rounded-md text-xs font-medium">อีก {item.daysUntil} วัน</span>
                      )}
                      <span className="text-xs text-slate-500">{formatThaiDate(item.date)}{item.time ? ` • ${item.time}` : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-2">{patient?.name || item.name}</p>
                    <p className="text-xs text-slate-500 mt-1">HN: {patient?.hn || item.hn}{patient?.phone ? ` • โทร: ${patient.phone}` : ''}</p>
                    <p className="text-xs text-slate-500 mt-1">{patientPending ? `มีรายการรอจ่าย ${getOrderFluidNames(patientPending).join(', ')}` : 'ยังไม่มีรายการรอจ่ายค้างในระบบ'}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {patientPending && <button type="button" onClick={onGotoPending} className="text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium">ไปที่รายการรอจ่าย</button>}
                    <button type="button" onClick={onHistory} className="text-xs px-3 py-2 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-medium">ดูประวัติผู้ป่วย</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
