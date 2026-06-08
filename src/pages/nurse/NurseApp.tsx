// ห้องตรวจ (Exam Room) — แท็บ สั่งจ่าย/ลงทะเบียน/ประวัติ (พอร์ตจาก #view-nurse)
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import Loading from '../../components/Loading'
import OrderTab from './OrderTab'
import RegisterTab from './RegisterTab'
import PatientHistoryView from '../../components/PatientHistoryView'
import { formatThaiDate } from '../../lib/format'
import { confirmDialog } from '../../lib/swal'
import { openProfileDialog } from '../../lib/profileDialog'

type Tab = 'order' | 'register' | 'history'

export default function NurseApp({ onHome }: { onHome: () => void }) {
  const { user, token, logout, setUser } = useAuth()
  const { loading } = useData()
  const [tab, setTab] = useState<Tab>('order')
  // ใช้ส่งค่า HN เริ่มต้นข้ามแท็บ (เช่น กดลงทะเบียนจากหน้าสั่งจ่าย)
  const [registerPrefillHN, setRegisterPrefillHN] = useState('')
  const [orderPrefillHN, setOrderPrefillHN] = useState('')

  const today = formatThaiDate(new Date().toISOString())

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

  function tabClass(active: boolean) {
    return `${active ? 'tab-active' : 'tab-inactive'} flex-1 min-w-[120px] px-4 py-3 rounded-xl font-medium text-sm transition-all`
  }

  return (
    <>
      <Loading show={loading} />
      <header className="bg-white shadow-sm border-b border-cyan-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /></svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">ห้องตรวจ</h1>
                <p className="text-xs text-slate-500 mobile-hide">Exam Room Module</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mobile-hide">
                <p className="text-xs text-slate-500">วันนี้</p>
                <p className="text-sm font-medium text-slate-700">{today}</p>
              </div>
              <button onClick={handleProfile} className="p-2 rounded-lg hover:bg-slate-100" title="โปรไฟล์">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-100" title="ออกจากระบบ">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
              <button onClick={onHome} className="p-2 rounded-lg hover:bg-slate-100" title="กลับหน้าหลัก">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-wrap gap-2 bg-white/50 backdrop-blur p-2 rounded-2xl shadow-sm border border-cyan-100">
          <button onClick={() => setTab('order')} className={tabClass(tab === 'order')}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              สั่งจ่ายน้ำยา
            </span>
          </button>
          <button onClick={() => setTab('register')} className={tabClass(tab === 'register')}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              ลงทะเบียนผู้ป่วย
            </span>
          </button>
          <button onClick={() => setTab('history')} className={tabClass(tab === 'history')}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ประวัติผู้ป่วย
            </span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'order' && (
          <OrderTab
            prefillHN={orderPrefillHN}
            onConsumePrefill={() => setOrderPrefillHN('')}
            onRegisterNew={(hn) => {
              setRegisterPrefillHN(hn)
              setTab('register')
            }}
          />
        )}
        {tab === 'register' && (
          <RegisterTab
            prefillHN={registerPrefillHN}
            onConsumePrefill={() => setRegisterPrefillHN('')}
            onOrderForPatient={(hn) => {
              setOrderPrefillHN(hn)
              setTab('order')
            }}
          />
        )}
        {tab === 'history' && (
          <div className="slide-in">
            <PatientHistoryView />
          </div>
        )}
      </main>
    </>
  )
}
