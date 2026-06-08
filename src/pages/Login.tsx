// หน้า login (ใช้ทั้งห้องตรวจ/ห้องจ่ายยา ปรับธีมตาม target) — พอร์ตจาก #view-login
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { toastError } from '../lib/swal'

export default function Login({
  target,
  onBack,
  onSuccess,
}: {
  target: 'nurse' | 'pharmacy'
  onBack: () => void
  onSuccess: () => void
}) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isExamRoom = target === 'nurse'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await login(username.trim(), password)
    setSubmitting(false)
    if (res.ok) {
      onSuccess()
    } else {
      toastError(res.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          กลับหน้าหลัก
        </button>
        <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden border ${isExamRoom ? 'border-cyan-100' : 'border-emerald-100'}`}>
          <div className={`${isExamRoom ? 'bg-gradient-to-br from-cyan-500 to-cyan-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'} p-8 text-center`}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{isExamRoom ? 'ห้องตรวจ' : 'ห้องจ่ายยา'}</h2>
            <p className={`${isExamRoom ? 'text-cyan-50' : 'text-emerald-50'} text-sm`}>
              {isExamRoom ? 'กรุณาเข้าสู่ระบบเพื่อใช้งานห้องตรวจ' : 'กรุณาเข้าสู่ระบบเพื่อใช้งานห้องจ่ายยา'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className={`${isExamRoom ? 'btn-primary' : 'btn-success'} w-full px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-60`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                <span>{submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
