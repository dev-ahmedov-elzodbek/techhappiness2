# 🤟 SignSpeak AI — Supabase bilan Real-time Chat

## ⚡ Tezkor sozlash (3 qadam)

### 1-qadam: Supabase loyiha yarating
1. [supabase.com](https://supabase.com) → **New project** yarating
2. **SQL Editor** ga kiring → `schema.sql` faylini to'liq copy-paste qiling → **Run**
3. **Settings → API** ga kiring, quyidagilarni oling:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_KEY`

### 2-qadam: .env faylini to'ldiring
```env
PORT=5000
JWT_SECRET=signspeakai_super_secret_2024
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3-qadam: Ishga tushiring
```bash
npm install
cd client && npm install && cd ..
npm run dev
```
Brauzerda: **http://localhost:5173**

---

## 📁 Fayl tuzilishi
```
SignSpeak-AI/
├── server.js        # Express + Socket.io + Supabase
├── schema.sql       # Supabase jadvallarini yaratish SQL
├── .env             # Supabase kalitlari (bu yerga yozing)
├── package.json
└── client/
    └── src/App.jsx  # React frontend
```

## 🔌 API
| Method | URL | Tavsif |
|--------|-----|--------|
| POST | /api/register | Ro'yxat |
| POST | /api/login | Kirish |
| GET | /api/users | Foydalanuvchilar ro'yxati |
| GET | /api/users/search?q= | @username / ism / ID qidirish |
| PUT | /api/users/:id | Profil yangilash |
| GET | /api/messages/:userId | Direct xabarlar |
| POST | /api/groups | Guruh yaratish |
| GET | /api/groups | Mening guruhlarim |
| GET | /api/groups/:id/messages | Guruh xabarlari |

## 🌟 Imkoniyatlar
- ✅ Real foydalanuvchilar (@username, ID orqali topish)
- ✅ Real-time xabar almashish (Socket.io)
- ✅ Guruh chat
- ✅ Yozmoqda... indikatori
- ✅ O'qildi belgisi ✓✓
- ✅ Ma'lumotlar Supabase da saqlanadi (kompyuter o'chsa ham yo'qolmaydi)
# techhappiness2
