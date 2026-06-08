// หน้า Landing — เลือกห้องตรวจ / ห้องจ่ายยา (พอร์ต markup เดิม)
export default function Landing({ onSelect }: { onSelect: (view: 'nurse' | 'pharmacy') => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-3xl shadow-xl mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">ระบบจ่ายน้ำยาล้างไต</h1>
          <p className="text-slate-600 text-lg">Dialysis Fluid Dispensing System</p>
        </div>

        <div className="landing-mobile-buttons">
          <button type="button" onClick={() => onSelect('nurse')} className="landing-mobile-button landing-mobile-button--nurse text-left">
            <span className="flex items-center gap-3">
              <span className="landing-mobile-button__icon">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block landing-mobile-button__title">ห้องตรวจ</span>
                <span className="block landing-mobile-button__subtitle">ลงทะเบียน • สั่งจ่าย</span>
              </span>
            </span>
          </button>
          <button type="button" onClick={() => onSelect('pharmacy')} className="landing-mobile-button landing-mobile-button--pharmacy text-left">
            <span className="flex items-center gap-3">
              <span className="landing-mobile-button__icon">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block landing-mobile-button__title">ห้องจ่ายยา</span>
                <span className="block landing-mobile-button__subtitle">รอจ่าย • Dashboard</span>
              </span>
            </span>
          </button>
        </div>

        <div className="landing-desktop-cards hidden md:grid md:grid-cols-2 gap-6">
          <div onClick={() => onSelect('nurse')} className="landing-card cursor-pointer bg-white rounded-3xl p-8 shadow-xl border-2 border-cyan-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-50 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl shadow-lg mb-5">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">สำหรับห้องตรวจ</h2>
              <p className="text-slate-500 mb-4">ลงทะเบียนผู้ป่วย • สั่งจ่ายน้ำยา • นัดครั้งต่อไป</p>
              <ul className="text-sm text-slate-600 space-y-1.5 mb-6">
                <li className="flex items-center gap-2"><span className="text-cyan-500">✓</span> ลงทะเบียนผู้ป่วยใหม่</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">✓</span> ค้นหาจาก HN สำหรับผู้ป่วยเดิม</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">✓</span> สั่งจ่ายน้ำยา + กำหนดวันนัด</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">✓</span> ดูประวัติการรับน้ำยา</li>
              </ul>
              <div className="flex items-center text-cyan-600 font-semibold">
                เข้าสู่ระบบ
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
          </div>

          <div onClick={() => onSelect('pharmacy')} className="landing-card cursor-pointer bg-white rounded-3xl p-8 shadow-xl border-2 border-emerald-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg mb-5">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">ห้องจ่ายยา</h2>
              <p className="text-slate-500 mb-4">จ่ายน้ำยา • จัดการชนิดน้ำยา • Dashboard</p>
              <ul className="text-sm text-slate-600 space-y-1.5 mb-6">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> รายการรอจ่ายจากห้องตรวจ</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> กดยืนยันการจ่ายเมื่อผู้ป่วยมารับ</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> จัดการชนิดน้ำยา</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> รายงานและสถิติ</li>
              </ul>
              <div className="flex items-center text-emerald-600 font-semibold">
                เข้าสู่ระบบ
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">เลือกส่วนที่ต้องการใช้งาน</p>
      </div>
    </div>
  )
}
