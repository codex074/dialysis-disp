// แท็บจัดการผู้ใช้งาน (admin) — เพิ่ม/ลบ/รีเซ็ตรหัส (พอร์ตจาก #ptab-content-users)
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { addUser, deleteUser, getUsers, resetUserPassword, type UserListItem } from '../../services/users'
import { normalizeRole } from '../../services/api'
import { Swal, toastSuccess } from '../../lib/swal'

const EMPTY = { username: '', password: '', fullName: '', role: 'nurse' }

export default function UsersTab() {
  const { user, token } = useAuth()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const res = await getUsers(token)
    setLoading(false)
    if (res.status === 'success') setUsers(res.data || [])
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    const res = await addUser({ username: form.username.trim(), password: form.password, fullName: form.fullName.trim(), role: form.role }, token)
    setSubmitting(false)
    if (res.status === 'success') {
      toastSuccess(res.message || 'เพิ่มผู้ใช้เรียบร้อย')
      setForm({ ...EMPTY })
      await load()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  async function resetPassword(username: string) {
    if (!token) return
    const result = await Swal.fire({
      title: `รีเซ็ตรหัสผ่าน: ${username}`,
      input: 'password',
      inputLabel: 'รหัสผ่านใหม่',
      inputAttributes: { minlength: '4' },
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0891b2',
      inputValidator: (value) => (!value || value.length < 4 ? 'ต้องมีอย่างน้อย 4 ตัวอักษร' : null),
    })
    if (!result.isConfirmed) return
    const res = await resetUserPassword(token, username, String(result.value))
    if (res.status === 'success') toastSuccess(res.message || 'รีเซ็ตรหัสผ่านเรียบร้อย')
    else Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
  }

  async function doDelete(username: string) {
    if (!token) return
    const result = await Swal.fire({ title: 'ลบผู้ใช้?', text: `ต้องการลบ ${username}`, icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#ef4444' })
    if (!result.isConfirmed) return
    const res = await deleteUser(username, token)
    if (res.status === 'success') {
      toastSuccess(res.message || 'ลบผู้ใช้เรียบร้อย')
      await load()
    } else {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, confirmButtonColor: '#0891b2' })
    }
  }

  function roleChip(role: string) {
    const r = normalizeRole(role)
    if (r === 'admin') return <span className="text-xs px-2 py-0.5 rounded-md bg-violet-100 text-violet-700">Admin</span>
    if (r === 'nurse') return <span className="text-xs px-2 py-0.5 rounded-md bg-sky-100 text-sky-700">Nurse</span>
    return <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700">Pharmacist</span>
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h3 className="text-slate-800 font-semibold">เพิ่มผู้ใช้งานใหม่</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input type="text" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input type="password" required minLength={4} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-สกุล *</label>
              <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">บทบาท</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <option value="nurse">Nurse (ห้องตรวจ)</option>
                <option value="pharmacist">Pharmacist (ห้องจ่ายยา)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-success w-full px-6 py-3 rounded-lg font-medium shadow-md disabled:opacity-60">เพิ่มผู้ใช้</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h3 className="text-slate-800 font-semibold">รายชื่อผู้ใช้งาน</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-600 uppercase">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">ชื่อ-สกุล</th>
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">กำลังโหลด...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">ไม่มีข้อมูล</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.username} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{u.username}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{u.fullName}</td>
                    <td className="px-4 py-3">{roleChip(u.role)}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => resetPassword(u.username)} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">รีเซ็ตรหัส</button>
                      {u.username !== user?.username && (
                        <button onClick={() => doDelete(u.username)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">ลบ</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
