// frontend/src/lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',       // สำคัญ: มีสแลชนำหน้า → เข้่า proxy ของ Vite แน่นอน
  withCredentials: true, // ส่ง cookie ไป backend
});

// แปลง error ของ Zod ให้เป็นข้อความอ่านง่าย
export function extractErrorMessage(err, fallback = 'Request failed') {
  const data = err?.response?.data;
  const raw = data?.error;

  if (typeof raw === 'string') return raw;

  if (raw && typeof raw === 'object') {
    const msgs = [];
    // zod.flatten() => { formErrors: [], fieldErrors: { email: ['...'], password: ['...'] } }
    if (Array.isArray(raw.formErrors) && raw.formErrors.length) {
      msgs.push(...raw.formErrors);
    }
    if (raw.fieldErrors && typeof raw.fieldErrors === 'object') {
      for (const [k, v] of Object.entries(raw.fieldErrors)) {
        if (Array.isArray(v) && v.length) msgs.push(`${k}: ${v.join(', ')}`);
      }
    }
    if (msgs.length) return msgs.join(' | ');
  }

  return err?.message || fallback;
}

export default api;
