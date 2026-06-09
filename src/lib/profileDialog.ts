// โมดัลจัดการโปรไฟล์ (พอร์ตจาก openProfileDialog) — ใช้ updateMyProfile service
import { Swal } from './swal'
import { roleLabel } from './dashboard'
import { updateMyProfile } from '../services/auth'
import type { User } from '../types'

function esc(value: unknown): string {
  return String(value ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ไอคอนตา (แสดง/ซ่อนรหัสผ่าน) — ใช้ใน innerHTML ของ SweetAlert
const EYE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><circle cx="12" cy="12" r="3"/></svg>'
const EYE_OFF_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.584 10.587a2 2 0 002.829 2.83"/><path d="M9.363 5.365A9.47 9.47 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.79 9.79 0 01-2.1 3.39M6.1 6.1A9.8 9.8 0 002.458 12c1.274 4.057 5.064 7 9.542 7 1.06 0 2.082-.165 3.04-.47"/></svg>'

function eyeButton(targetId: string): string {
  return `<button type="button" class="profile-dialog__eye" data-target="${targetId}" aria-label="แสดง/ซ่อนรหัสผ่าน" tabindex="-1">${EYE_SVG}</button>`
}

export async function openProfileDialog(user: User, token: string): Promise<User | null> {
  const displayName = String(user.fullName || user.username || '').trim()
  const initial = esc(displayName.charAt(0).toUpperCase() || '?')
  const result = await Swal.fire({
    title: '',
    html: `
      <div class="profile-dialog">
        <div class="profile-dialog__hero">
          <div class="profile-dialog__avatar">${initial}</div>
          <div class="profile-dialog__hero-text">
            <div class="profile-dialog__eyebrow">Profile Settings</div>
            <h3 class="profile-dialog__title">จัดการโปรไฟล์</h3>
            <p class="profile-dialog__subtitle">อัปเดตชื่อที่แสดง หรือเปลี่ยนรหัสผ่านของบัญชีนี้ได้จากหน้าต่างเดียว</p>
          </div>
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
            <div class="profile-dialog__section-head">
              <span class="profile-dialog__section-icon">🔒</span>
              <div>
                <p class="profile-dialog__section-title">เปลี่ยนรหัสผ่าน</p>
                <p class="profile-dialog__section-desc">เว้นทุกช่องว่างไว้ หากไม่ต้องการเปลี่ยน</p>
              </div>
            </div>
            <label class="profile-dialog__field">
              <span class="profile-dialog__label">รหัสผ่านเดิม</span>
              <div class="profile-dialog__input-wrap">
                <input id="profileCurrentPassword" type="password" class="profile-dialog__input" placeholder="กรอกรหัสผ่านเดิม">
                ${eyeButton('profileCurrentPassword')}
              </div>
            </label>
            <div class="profile-dialog__grid" style="margin-top:0.85rem">
              <label class="profile-dialog__field">
                <span class="profile-dialog__label">รหัสผ่านใหม่</span>
                <div class="profile-dialog__input-wrap">
                  <input id="profileNewPassword" type="password" class="profile-dialog__input" placeholder="อย่างน้อย 4 ตัวอักษร">
                  ${eyeButton('profileNewPassword')}
                </div>
              </label>
              <label class="profile-dialog__field">
                <span class="profile-dialog__label">ยืนยันรหัสผ่านใหม่</span>
                <div class="profile-dialog__input-wrap">
                  <input id="profileConfirmPassword" type="password" class="profile-dialog__input" placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง">
                  ${eyeButton('profileConfirmPassword')}
                </div>
              </label>
            </div>
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
    didOpen: () => {
      // ปุ่มแสดง/ซ่อนรหัสผ่านในแต่ละช่อง
      document.querySelectorAll<HTMLButtonElement>('.profile-dialog__eye').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-target')
          const input = id ? document.getElementById(id) as HTMLInputElement | null : null
          if (!input) return
          const reveal = input.type === 'password'
          input.type = reveal ? 'text' : 'password'
          btn.innerHTML = reveal ? EYE_OFF_SVG : EYE_SVG
          btn.classList.toggle('is-on', reveal)
        })
      })
    },
    preConfirm: () => {
      const fullName = (document.getElementById('profileFullName') as HTMLInputElement).value.trim()
      const currentPassword = (document.getElementById('profileCurrentPassword') as HTMLInputElement).value
      const newPassword = (document.getElementById('profileNewPassword') as HTMLInputElement).value
      const confirmPassword = (document.getElementById('profileConfirmPassword') as HTMLInputElement).value
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
      if (newPassword && newPassword !== confirmPassword) {
        Swal.showValidationMessage('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน')
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
