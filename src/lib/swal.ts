// ครอบ SweetAlert2 ให้ใช้สะดวก (คงรูปแบบ toast/dialog เดิม)
import Swal from 'sweetalert2'

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
})

export function toastSuccess(title: string) {
  return Toast.fire({ icon: 'success', title })
}

export function toastError(title: string) {
  return Toast.fire({ icon: 'error', title })
}

export function alertError(text: string, title = 'เกิดข้อผิดพลาด') {
  return Swal.fire({ icon: 'error', title, text, confirmButtonColor: '#0891b2' })
}

export function alertSuccess(text: string, title = 'สำเร็จ') {
  return Swal.fire({ icon: 'success', title, text, confirmButtonColor: '#0891b2' })
}

export async function confirmDialog(opts: {
  title: string
  text?: string
  html?: string
  confirmText?: string
  cancelText?: string
  icon?: 'warning' | 'question' | 'info'
  confirmColor?: string
}): Promise<boolean> {
  const res = await Swal.fire({
    title: opts.title,
    text: opts.text,
    html: opts.html,
    icon: opts.icon || 'question',
    showCancelButton: true,
    confirmButtonText: opts.confirmText || 'ยืนยัน',
    cancelButtonText: opts.cancelText || 'ยกเลิก',
    confirmButtonColor: opts.confirmColor || '#0891b2',
    cancelButtonColor: '#94a3b8',
    reverseButtons: true,
  })
  return res.isConfirmed
}

export { Swal }
