// ห้องจ่ายยา (Pharmacy) — แท็บ Dashboard (รวมรอจ่าย/จ่ายแล้ว)/ประวัติ/น้ำยา/ผู้ใช้/นำเข้า
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import Loading from '../../components/Loading'
import PatientHistoryView from '../../components/PatientHistoryView'
import DashboardTab from './DashboardTab'
import FluidsTab from './FluidsTab'
import UsersTab from './UsersTab'
import ImportTab from './ImportTab'
import { roleLabel } from '../../lib/dashboard'
import { confirmDialog } from '../../lib/swal'
import { openProfileDialog } from '../../lib/profileDialog'

type Tab = 'dashboard' | 'history' | 'fluids' | 'users' | 'import'

export default function PharmacyApp({ onHome }: { onHome: () => void }) {
  const { user, token, logout, setUser } = useAuth()
  const { orders, loading } = useData()
  const [tab, setTab] = useState<Tab>('dashboard')
  const isAdmin = user?.role === 'admin'
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  async function handleLogout() {
    const ok = await confirmDialog({ title: 'ออกจากระบบ?', icon: 'warning', confirmText: 'ออกจากระบบ', confirmColor: '#ef4444' })
    if (!ok) return
    logout()
    onHome()
  }

  async function handleProfile() {
    if (!user || !token) return
    const updated = await openProfileDialog(user, token)
    if (updated) setUser(updated)
  }

  function tabClass(active: boolean, extra = '') {
    return `${active ? 'tab-active' : 'tab-inactive'} flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium text-sm transition-all ${extra}`
  }

  const tabs: { key: Tab; label: string; adminOnly?: boolean; badge?: boolean }[] = [
    { key: 'dashboard', label: 'Dashboard', badge: true },
    { key: 'history', label: 'ประวัติผู้ป่วย' },
    { key: 'fluids', label: 'ชนิดน้ำยา' },
    { key: 'users', label: 'ผู้ใช้งาน', adminOnly: true },
    { key: 'import', label: 'นำเข้า CSV', adminOnly: true },
  ]

  return (
    <>
      <Loading show={loading} />
      <header className="bg-white shadow-sm border-b border-emerald-100 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/logo-pharmacy.svg" alt="ห้องจ่ายยา" className="w-10 h-10 rounded-xl shadow-lg" />
              <div>
                <h1 className="text-lg font-bold text-slate-800">ห้องจ่ายยา</h1>
                <p className="text-xs text-slate-500 mobile-hide">Pharmacy Module</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mobile-hide">
                <p className="text-xs text-slate-500">{user?.fullName}</p>
                <p className="text-xs text-slate-400">{roleLabel(user?.role || '')}</p>
              </div>
              <button onClick={onHome} className="p-2 rounded-lg hover:bg-slate-100" title="กลับหน้าหลัก">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <button onClick={handleProfile} className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center hover:bg-emerald-100 transition-colors" title="จัดการโปรไฟล์">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </button>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="ออกจากระบบ">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-wrap gap-2 bg-white/50 backdrop-blur p-2 rounded-2xl shadow-sm border border-emerald-100">
          {tabs
            .filter((t) => !t.adminOnly || isAdmin)
            .map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tabClass(tab === t.key, 'relative')}>
                <span className="flex items-center justify-center gap-2">
                  {t.label}
                  {t.badge && pendingCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{pendingCount}</span>
                  )}
                </span>
              </button>
            ))}
        </div>
      </nav>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="slide-in">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'history' && <PatientHistoryView />}
          {tab === 'fluids' && <FluidsTab />}
          {tab === 'users' && isAdmin && <UsersTab />}
          {tab === 'import' && isAdmin && <ImportTab />}
        </div>
      </main>
    </>
  )
}
