import { useState } from 'react'
import { AuthProvider, canAccessView, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NurseApp from './pages/nurse/NurseApp'
import PharmacyApp from './pages/pharmacy/PharmacyApp'
import { roleLabel } from './lib/dashboard'
import { Swal } from './lib/swal'

type View = 'landing' | 'nurse' | 'pharmacy'

function Shell() {
  const { user, ready } = useAuth()
  const [view, setView] = useState<View>('landing')

  if (!ready) return null

  function goTo(next: View) {
    if (next === 'nurse' || next === 'pharmacy') {
      if (user && !canAccessView(next, user.role)) {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่มีสิทธิ์เข้าใช้งาน',
          text: `บัญชี ${roleLabel(user.role)} ไม่สามารถเข้าใช้งาน ${next === 'nurse' ? 'ห้องตรวจ' : 'ห้องจ่ายยา'} ได้`,
          confirmButtonColor: '#0891b2',
        }).then(() => setView('landing'))
        return
      }
    }
    setView(next)
  }

  if (view === 'landing') return <Landing onSelect={goTo} />

  // ต้อง login ก่อนเข้าห้องตรวจ/ห้องจ่ายยา
  if (!user) {
    return <Login target={view} onBack={() => setView('landing')} onSuccess={() => goTo(view)} />
  }

  if (!canAccessView(view, user.role)) {
    goTo(view)
    return null
  }

  return (
    <DataProvider>
      {view === 'nurse' ? (
        <NurseApp onHome={() => setView('landing')} />
      ) : (
        <PharmacyApp onHome={() => setView('landing')} />
      )}
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
