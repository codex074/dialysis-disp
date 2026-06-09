// แท็บ Dashboard ห้องจ่ายยา — สถิติ + ตัวกรอง + รายการรอจ่าย/จ่ายแล้ว (2 คอลัมน์)
import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import {
  getDashboardDispensedOrders,
  getDashboardSummaryText,
  getUniqueDispensedPatientCount,
  type DashboardFilters,
} from '../../lib/dashboard'
import PendingTab from './PendingTab'
import DispensedTab from './DispensedTab'

const DEFAULT_FILTERS: DashboardFilters = { period: 'current_month', dateFrom: '', dateTo: '', search: '' }

export default function DashboardTab() {
  const { orders, patients } = useData()
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders])
  const filteredDispensed = useMemo(() => getDashboardDispensedOrders(orders, filters), [orders, filters])

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

      {/* รายการรอจ่าย + จ่ายแล้ว (2 คอลัมน์) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <PendingTab />
        <DispensedTab />
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
