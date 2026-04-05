# 🤖 WelcomeBot Pro - Panduan Instalasi Termux

## ✅ LANGKAH-LANGKAH INSTALASI

### 1. Update & Install Node.js di Termux
```bash
pkg update && pkg upgrade -y
pkg install nodejs -y
pkg install git -y
```

### 2. Buat Folder Bot & Masuk ke Folder
```bash
mkdir wa-bot
cd wa-bot
```

### 3. Copy File Bot
Salin file `index.js` dan `package.json` ke folder `wa-bot`

### 4. Install Dependencies
```bash
npm install
```
> ⏳ Proses ini butuh beberapa menit, tunggu sampai selesai

### 5. Jalankan Bot
```bash
node index.js
```

---

## 📲 CARA SCAN QR CODE

1. Jalankan bot dengan `node index.js`
2. QR Code akan muncul di terminal
3. Buka **WhatsApp** di HP nomor `6282157298268`
4. Tap **⋮ Menu** → **Perangkat Tertaut** → **Tautkan Perangkat**
5. Scan QR Code yang muncul di Termux
6. Bot akan otomatis terhubung ✅

---

## 📋 FITUR BOT

| Fitur | Keterangan |
|-------|-----------|
| ✅ Auto Welcome | Menyambut member baru saat join grup |
| ✅ Auto Goodbye | Mengirim pesan saat member keluar |
| ✅ !ping | Cek status & latensi bot |
| ✅ !info | Informasi bot & uptime |
| ✅ !help | Daftar semua perintah |

---

## ⚙️ KONFIGURASI

Edit bagian `CONFIG` di `index.js`:
```javascript
const CONFIG = {
  botNumber: "6282157298268",  // Nomor bot kamu
  botName: "🤖 WelcomeBot Pro", // Nama bot
  ownerName: "Admin",           // Nama owner
  prefix: "!",                  // Prefix command
};
```

---

## 🔧 TROUBLESHOOTING

**Bot terputus / disconnect:**
```bash
# Jalankan ulang bot
node index.js
```

**Hapus sesi & scan ulang:**
```bash
rm -rf auth_info_baileys
node index.js
```

**Error npm install:**
```bash
npm install --legacy-peer-deps
```

---

## 💡 TIPS

- Gunakan **screen** atau **tmux** agar bot tetap berjalan saat Termux ditutup:
  ```bash
  pkg install screen -y
  screen -S wabot
  node index.js
  # Tekan Ctrl+A lalu D untuk detach
  ```

- Untuk kembali ke sesi bot:
  ```bash
  screen -r wabot
  ```

---

## ⚠️ CATATAN PENTING

- Pastikan nomor `6282157298268` sudah menjadi **admin** di grup yang ingin dimonitor
- Bot harus **aktif (online)** agar fitur welcome bekerja
- Jangan gunakan bot untuk spam atau melanggar TOS WhatsApp

---

_WelcomeBot Pro v1.0.0 | Powered by @whiskeysockets/baileys_
