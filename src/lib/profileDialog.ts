// โมดัลจัดการโปรไฟล์ (พอร์ตจาก openProfileDialog) — ใช้ updateMyProfile service
import { Swal } from './swal'
import { roleLabel } from './dashboard'
import { updateMyProfile } from '../services/auth'
import type { User } from '../types'

function esc(value: unknown): string {
  return String(value ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function openProfileDialog(user: User, token: string): Promise<User | null> {
  const result = await Swal.fire({
    title: '',
    html: `
      <div class="profile-dialog">
        <div class="profile-dialog__hero">
          <div class="profile-dialog__eyebrow">Profile Settings</div>
          <h3 class="profile-dialog__title">จัดการโปรไฟล์</h3>
          <p class="profile-dialog__subtitle">อัปเดตชื่อที่แสดงในระบบ หรือเปลี่ยนรหัสผ่านของบัญชีนี้ได้จากหน้าต่างเดียว</p>
        </div>
        <div class="profile-dialog__content">
          <div class="profile-dialog__grid">
            <label class="profile-dialog__field">
              <span class="profile-dialog__label">Username</span>
              <input id="profileUsername" class="profile-dialog__input" value="${esc(user.username)}" disabled>
            </label>
            <label class="profile-dialog__field">
              <span class="profile-dialog__label">Role</span>
              <input id="profileRole" class="profile-dialog__input" value="${esc(roleLabel(user.role))}" disabled>
            </label>
          </div>
          <label class="profile-dialog__field">
            <span class="profile-dialog__label">ชื่อ-สกุล</span>
            <input id="profileFullName" class="profile-dialog__input" value="${esc(user.fullName || '')}" placeholder="ชื่อ-สกุล">
          </label>
          <div class="profile-dialog__section">
            <p class="profile-dialog__section-title">เปลี่ยนรหัสผ่าน</p>
            <label class="profile-dialog__field">
              <span class="profile-dialog__label">รหัสผ่านเดิม</span>
              <input id="profileCurrentPassword" type="password" class="profile-dialog__input" placeholder="กรอกรหัสผ่านเดิม">
            </label>
            <label class="profile-dialog__field">
              <span class="profile-dialog__label">รหัสผ่านใหม่</span>
              <input id="profileNewPassword" type="password" class="profile-dialog__input" placeholder="อย่างน้อย 4 ตัวอักษร">
            </label>
            <p class="profile-dialog__hint">หากยังไม่ต้องการเปลี่ยนรหัสผ่าน สามารถเว้นสองช่องนี้ว่างไว้ได้</p>
          </div>
        </div>
      </div>`,
    width: 560,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    buttonsStyling: false,
    focusConfirm: false,
    customClass: {
      popup: 'profile-swal-popup',
      title: 'profile-swal-title',
      htmlContainer: 'profile-swal-html',
      actions: 'profile-swal-actions',
      confirmButton: 'profile-swal-confirm',
      cancelButton: 'profile-swal-cancel',
    },
    preConfirm: () => {
      const fullName = (document.getElementById('profileFullName') as HTMLInputElement).value.trim()
      const currentPassword = (document.getElementById('profileCurrentPassword') as HTMLInputElement).value
      const newPassword = (document.getElementById('profileNewPassword') as HTMLInputElement).value
      if (!fullName) {
        Swal.showValidationMessage('กรุณากรอกชื่อ-สกุล')
        return false
      }
      if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
        Swal.showValidationMessage('หากจะเปลี่ยนรหัสผ่าน กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่ให้ครบ')
        return false
      }
      if (newPassword && newPassword.length < 4) {
        Swal.showValidationMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร')
        return false
      }
      return { fullName, currentPassword, newPassword }
    },
  })
  if (!result.isConfirmed || !result.value) return null
  const { fullName, currentPassword, newPassword } = result.value as { fullName: string; currentPassword: string; newPassword: string }
  Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading(), allowOutsideClick: false })
  const res = await updateMyProfile({ fullName, currentPassword, newPassword }, token)
  Swal.close()
  if (res.status !== 'success' || !res.user) {
    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message || 'ไม่สามารถอัปเดตโปรไฟล์ได้' })
    return null
  }
  Swal.fire({ icon: 'success', title: newPassword ? 'บันทึกโปรไฟล์และเปลี่ยนรหัสผ่านเรียบร้อย' : 'บันทึกโปรไฟล์เรียบร้อย', confirmButtonColor: '#0891b2' })
  return res.user
}
