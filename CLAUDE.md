# CLAUDE.md

แนวทางสำหรับ Claude Code เมื่อทำงานกับโค้ดในโปรเจกต์นี้

## ภาพรวม
ระบบจ่ายน้ำยาล้างไต (Peritoneal Dialysis fluid dispensing) — เว็บแอป React + TypeScript + Tailwind
ที่พอร์ตมาจากเวอร์ชัน Google Apps Script เดิม (`Code.gs` + `index.html`) โดยใช้ **Firebase Firestore**
เป็นฐานข้อมูล

**ข้อจำกัดเชิงสถาปัตยกรรมที่สำคัญที่สุด: ไม่ใช้ Firebase Auth** — เก็บผู้ใช้ (รวม hash รหัสผ่าน)
ไว้ใน Firestore collection `users` เอง และทำ auth ทั้งหมดฝั่ง client ดู [ความปลอดภัย](#ความปลอดภัย)

โค้ดและคอมเมนต์ส่วนใหญ่เป็นภาษาไทย — เขียนโค้ดใหม่ให้คอมเมนต์/ข้อความ UI เป็นไทยให้เข้ากับของเดิม

## คำสั่ง
```bash
npm run dev      # dev server (http://localhost:5173)
npm run build    # tsc -b && vite build -> dist/
npm run preview  # ดู production build
npm run lint     # eslint
npm run seed     # สร้าง admin เริ่มต้น (admin / admin123) ถ้ายังไม่มี — อ่านค่าจาก .env
```
ต้องมีไฟล์ `.env` (คัดลอกจาก `.env.example`) ที่มีค่า `VITE_FIREBASE_*` ก่อนรัน
ทั้ง dev และ `seed`

## สถาปัตยกรรม

### ชั้นข้อมูล (data flow)
```
Firestore  ──services/──►  DataContext (โหลดรวมตอน mount)  ──►  pages/components
                                  │
                          AuthContext (token ใน localStorage)
```
- **`src/firebase.ts`** — init Firebase + ค่าคงที่ชื่อ collection `COL` (`users`, `patients`, `fluids`, `dispenses`, `appointments`)
- **`src/services/*`** — ชั้นเดียวที่คุยกับ Firestore โดยตรง ทุกฟังก์ชันคืนค่ารูปแบบ
  `ServiceResult` (`{ status: 'success' | 'error', message?, data? }`) เลียนแบบ `Code.gs` เดิม
  ห้ามเรียก `firebase/firestore` จาก component ตรง ๆ ให้ผ่าน service เสมอ
- **`src/context/DataContext.tsx`** — โหลด patients/fluids/orders/appointments พร้อมกันตอน mount
  (`Promise.all`) เก็บใน state, มี `refresh()` ให้เรียกซ้ำหลังเขียนข้อมูล
  **ไม่มี realtime listener** — ต้อง `refresh()` เองหลังทุก mutation
- **`src/context/AuthContext.tsx`** — สถานะผู้ใช้/token, persist เฉพาะ token ใน `localStorage`
  (key `dialysis_auth`), verify token ตอน mount

### Auth & token (ฝั่ง client ล้วน)
- รหัสผ่าน hash ด้วย `lib/hash.ts`: `SHA-256(password + 'dialysis_salt_2026')` เป็น hex ตัวพิมพ์เล็ก
  — **ห้ามแก้ salt/อัลกอริทึม** เพราะต้องตรงกับ hash ที่ย้ายมาจากระบบเดิม (และกับ `seed.mjs`)
- token = `base64(username:timestamp)` (ดู `services/api.ts`), TTL 8 ชั่วโมง — ไม่ได้เซ็นชื่อ, กันปลอมไม่ได้
- **สิทธิ์การเข้าหน้า** (`canAccessView` ใน `AuthContext.tsx`):
  - `admin` → เข้าได้ทุกหน้า
  - ห้องตรวจ (nurse) → `nurse`, `pharmacist`, `admin`
  - ห้องจ่ายยา (pharmacy) → `pharmacist`, `admin` เท่านั้น
  - แท็บ "ผู้ใช้งาน" และ "นำเข้า CSV" เป็น `adminOnly`

### โครงหน้า (`src/pages/`)
- `App.tsx` — สลับ view ด้วย state เดียว (`landing | nurse | pharmacy`) ไม่มี router
- `Landing.tsx`, `Login.tsx`
- `nurse/NurseApp.tsx` — แท็บ `order | register | history`
- `pharmacy/PharmacyApp.tsx` — แท็บ `dashboard | pending | dispensed | history | fluids | users | import`

### lib/ (logic ที่ใช้ซ้ำ ไม่แตะ Firestore)
- `format.ts` — แปลงวันที่ไทย, ชื่อน้ำยา, แตก/รวมรายการ order หลายบรรทัด
- `dashboard.ts` — คำนวณสรุป dashboard ฝั่ง client, `roleLabel`
- `orders.ts` — เลือก order ที่นำมาใช้ซ้ำ, คิว appointment
- `pagination.ts` — แบ่งหน้า (PAGE_SIZE = 10)
- `swal.ts`, `dispenseDialog.ts`, `profileDialog.ts`, `historyModal.ts` — โมดัล SweetAlert2

## รูปแบบข้อมูลและ CSV
- ชนิดข้อมูลทั้งหมดอยู่ที่ `src/types.ts`
- `Dispense` เก็บทั้ง `items: OrderItem[]` (array) **และ** field สรุปข้อความ `fluidType`/`quantity`
  (หลายบรรทัด `"1. ...\n2. ..."`) เพื่อความเข้ากันได้กับชีตเดิม — เวลาแก้ต้องอัปเดตให้ตรงกันทั้งคู่
  (ดู `summarizeItems` ใน `api.ts`)
- การนำเข้า (`services/importCsv.ts`) รองรับหัวตารางภาษาไทยจากชีตเดิม นำเข้าได้ 5 ชนิด
  ตามลำดับ `users → patients → fluids → appointments → dispenses` และเขียนทับ id ซ้ำ (merge)

## ความปลอดภัย
`firestore.rules` ปัจจุบัน **เปิดอ่าน/เขียนทั้งหมด** (`allow read, write: if true`) เพราะไม่มี Firebase Auth
จึงใช้ `request.auth` ไม่ได้ — เหมาะกับใช้งานภายใน/ทดสอบเท่านั้น **อย่าใส่ข้อมูลผู้ป่วยจริง
บนอินเทอร์เน็ตสาธารณะ** เมื่อแก้เรื่อง auth/rules ให้คงข้อจำกัดนี้ไว้ในใจ และอัปเดตคอมเมนต์เตือนในไฟล์ด้วย

## เกร็ดสำหรับแก้โค้ด
- เพิ่ม field ข้อมูล → แก้ `types.ts` + service ที่อ่าน/เขียน + ตัว map ใน `importCsv.ts` ให้ครบ
- หลังเขียนข้อมูลทุกครั้งให้เรียก `refresh()` จาก `useData()` เพื่อให้ UI ตรงกับ Firestore
- ข้อความ/ป๊อปอัปทั้งหมดใช้ SweetAlert2 ผ่าน helper ใน `lib/swal.ts` (อย่าเรียก `Swal` ตรง ๆ เว้นแต่จำเป็น)
- ยังไม่มีชุดทดสอบอัตโนมัติ (`scripts/test-import.ts` เป็นสคริปต์ช่วยตรวจ import แบบ manual)
