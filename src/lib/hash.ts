// พอร์ตจาก Code.gs:544 hashPassword()
//   GAS: Utilities.computeDigest(SHA_256, password + 'dialysis_salt_2026') -> hex (lowercase)
// ใช้ Web Crypto ให้ได้ค่า hex ตรงกันทุกตัวอักษร เพื่อให้ user ที่ย้ายมาจากระบบเดิม login ได้
const SALT = 'dialysis_salt_2026'

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(String(password) + SALT)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
