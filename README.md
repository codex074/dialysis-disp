<div align="center">

# 💧 ระบบจ่ายน้ำยาล้างไต

### Dialysis Fluid Dispensing System

ระบบบริหารจัดการการสั่งจ่ายน้ำยาล้างไตทางช่องท้อง สำหรับห้องตรวจและห้องจ่ายยา

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

</div>

---

## ✨ ภาพรวม

แปลงจากเวอร์ชัน **Google Apps Script** เดิม (`Code.gs` + `index.html`) มาเป็นเว็บแอป React สมัยใหม่
โดยใช้ **Firebase Firestore** เป็นฐานข้อมูล และ **เก็บข้อมูลผู้ใช้ไว้ใน Firestore เอง (ไม่ใช้ Firebase Auth)**
🎨 หน้าตา/ธีมยังคงเหมือนเดิม (คัดลอก CSS เดิมมาไว้ที่ `src/index.css`)

<table>
<tr>
<td width="50%" valign="top">

### 🩺 ห้องตรวจ (Exam Room)
- 💊 สั่งจ่ายน้ำยา
- 📝 ลงทะเบียนผู้ป่วย
- 📋 ดูประวัติการจ่าย

</td>
<td width="50%" valign="top">

### 🏥 ห้องจ่ายยา (Pharmacy)
- 📊 Dashboard สรุปภาพรวม
- ⏳ รายการรอจ่าย / ✅ จ่ายแล้ว
- 👤 ประวัติผู้ป่วย · 🧪 ชนิดน้ำยา
- 👥 ผู้ใช้งาน · 📥 นำเข้า CSV *(admin)*

</td>
</tr>
</table>

### 🔐 บทบาทผู้ใช้งาน

| บทบาท | ห้องตรวจ | ห้องจ่ายยา | จัดการผู้ใช้ / นำเข้า |
|:--|:--:|:--:|:--:|
| 👑 **admin** | ✅ | ✅ | ✅ |
| 💉 **pharmacist** | ✅ | ✅ | ❌ |
| 👩‍⚕️ **nurse** | ✅ | ❌ | ❌ |

> 🗂️ **Firestore collections:** `users` · `patients` · `fluids` · `dispenses` · `appointments`

---

## 🚀 เริ่มต้นใช้งาน

### 1️⃣ ติดตั้งและตั้งค่า Firebase

```bash
npm install
cp .env.example .env   # แล้วกรอกค่าจาก Firebase Console
```

ค่าใน `.env` ดูได้จาก **Firebase Console → Project settings → General → Your apps → SDK setup and configuration**

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

จากนั้นเปิดใช้งาน **Cloud Firestore** (โหมด Native) และตั้ง Security Rules ตามไฟล์ `firestore.rules`
👉 *(ดู [หมายเหตุด้านความปลอดภัย](#️-หมายเหตุดานความปลอดภย-สำคญ))*

### 2️⃣ สร้างผู้ใช้เริ่มต้น

<table>
<tr><td valign="top">

**🅰️ มีข้อมูลผู้ใช้เดิมอยู่แล้ว**

ใช้หน้า "นำเข้า CSV" (ข้อ 3) นำเข้าชีต Users
รหัสผ่านเดิมใช้ได้ทันที เพราะ hash ตรงกัน
`SHA-256(password + 'dialysis_salt_2026')`

</td><td valign="top">

**🅱️ เริ่มใหม่**

สร้าง admin เริ่มต้น (`admin` / `admin123`):
```bash
npm run seed
```
⚠️ เปลี่ยนรหัสผ่านทันทีหลังเข้าครั้งแรก

</td></tr>
</table>

### 3️⃣ นำข้อมูลจาก Google Sheet เดิมเข้า Firestore

1. ใน Google Sheets เดิม เปิดแต่ละชีต แล้ว **ไฟล์ → ดาวน์โหลด → CSV**
   *(Users, Patients, Fluids, Appointments, Dispenses)*
2. เข้าสู่ระบบห้องจ่ายยาด้วยบัญชี **admin** → แท็บ **นำเข้า CSV**
3. นำเข้าตามลำดับ:

   ```
   👥 Users  →  🧑‍🤝‍🧑 Patients  →  🧪 Fluids  →  📅 Appointments  →  💊 Dispenses
   ```

   ระบบรองรับหัวตารางภาษาไทยแบบชีตเดิม และเขียนทับเอกสารที่ id ซ้ำ (merge)

> 💡 คอลัมน์ "ชนิดน้ำยา/จำนวน" ของชีต Dispenses ที่เป็นข้อความหลายบรรทัด (`"1. ...\n2. ..."`)
> จะถูกแปลงเป็น array รายการน้ำยาอัตโนมัติตอนนำเข้า

### 4️⃣ รัน

| คำสั่ง | คำอธิบาย |
|:--|:--|
| `npm run dev` | 🔧 โหมดพัฒนา → http://localhost:5173 |
| `npm run build` | 📦 สร้างไฟล์ production ที่ `dist/` |
| `npm run preview` | 👀 ดู production build |
| `npm run lint` | 🧹 ตรวจโค้ดด้วย ESLint |
| `npm run seed` | 🌱 สร้างผู้ใช้ admin เริ่มต้น |

---

## ⚠️ หมายเหตุด้านความปลอดภัย (สำคัญ)

เนื่องจาก **ไม่ใช้ Firebase Auth** (ตามที่กำหนด) Security Rules จึงใช้ `request.auth` ไม่ได้
ฐานข้อมูล (รวมถึง hash รหัสผ่าน) จะเข้าถึงได้โดยผู้ที่มี public config ของโปรเจกต์
`firestore.rules` ที่ให้มาจึง **🔓 เปิดอ่าน/เขียนทั้งหมด** — เหมาะกับการใช้งานภายใน/ทดสอบเท่านั้น

> 🚫 **อย่าใส่ข้อมูลผู้ป่วยจริงบนอินเทอร์เน็ตสาธารณะ**

🛡️ แนวทางเสริมความปลอดภัย (follow-up ที่แนะนำ):

1. เปิด **Firebase App Check** (reCAPTCHA) เพื่อกันการเรียกจากนอกแอป
2. จำกัดการเข้าถึงด้วย **IP allowlist** ผ่าน reverse proxy
3. ถ้าต้องการความปลอดภัยเต็มรูปแบบ ให้พิจารณาเปิดใช้ **Firebase Auth** ภายหลัง

---

## 🗂️ แผนผังโค้ด

```
src/
├── 🔥 firebase.ts          init Firebase + ชื่อ collection
├── 📘 types.ts             ชนิดข้อมูลหลัก
├── 🧩 lib/                 hash, format, pagination, dashboard, orders, swal, โมดัลต่าง ๆ
├── 🔌 services/            ชั้นคุย Firestore (auth, users, patients, fluids, dispenses, importCsv)
├── 🌐 context/             AuthContext (token ใน localStorage), DataContext (โหลดข้อมูลรวม)
├── 🎛️ components/          ปุ่ม/การ์ด/picker/ตารางที่ใช้ซ้ำ
└── 📄 pages/               Landing, Login, nurse/*, pharmacy/*
```

> 📌 รายละเอียดสถาปัตยกรรมเชิงลึกสำหรับนักพัฒนา/AI ดูที่ [`CLAUDE.md`](./CLAUDE.md)

<div align="center">

---

Made with 💧 for dialysis care

</div>
