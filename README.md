# 🤖 WhatsApp Welcome Bot — SQ DR

Bot WhatsApp otomatis untuk menyambut anggota baru yang masuk ke grup **Squad DR (SQ DR)**.
Login menggunakan **Pairing Code** (tanpa scan QR).

---

## ✨ Fitur

- 🎉 Auto kirim pesan welcome saat anggota baru join
- 📅 Tampil tanggal bergabung otomatis
- 👥 Menampilkan total member grup
- 🔄 Auto reconnect jika koneksi putus
- 🔑 Login via **Pairing Code** (input nomor HP di terminal)

---

## 📱 Cara Install di Termux

### Langkah 1 — Persiapan Termux

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs git
```

### Langkah 2 — Clone Repository dari GitHub

```bash
git clone https://github.com/USERNAME/wa-bot-sqdr.git
cd wa-bot-sqdr
```

> ⚠️ Ganti `USERNAME` dengan username GitHub kamu

### Langkah 3 — Install Dependensi

```bash
npm install
```

### Langkah 4 — Jalankan Bot

```bash
node index.js
```

### Langkah 5 — Masukkan Nomor & Pairing Code

1. Bot akan meminta nomor WA kamu → ketik misal: `628123456789`
2. Bot akan menampilkan **kode 8 digit**, contoh: `ABCD-EFGH`
3. Buka **WhatsApp** → ⋮ → **Perangkat Tertaut** → **Tautkan Perangkat**
4. Tap **"Tautkan dengan nomor telepon"**
5. Masukkan kode yang muncul di Termux

✅ Bot langsung aktif!

---

## 🔄 Cara Update Bot

```bash
cd wa-bot-sqdr
git pull
npm install
node index.js
```

---

## 🛑 Jika Bot Error / Perlu Login Ulang

```bash
rm -rf auth_info
node index.js
```

---

## 📌 Catatan Penting

- Bot harus jadi **Admin grup** agar bisa detect anggota baru
- Disarankan pakai **nomor WhatsApp khusus** untuk bot
- Biarkan Termux tetap terbuka, atau gunakan `tmux`

### Jalankan di Background dengan tmux:

```bash
pkg install tmux -y
tmux new -s sqdr-bot
node index.js
# Keluar tanpa matikan: CTRL+B lalu D
# Kembali: tmux attach -t sqdr-bot
```

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| `command not found: node` | `pkg install nodejs -y` |
| `command not found: git` | `pkg install git -y` |
| Gagal generate pairing code | Pastikan nomor benar & WA aktif |
| Bot tidak kirim welcome | Pastikan bot sudah jadi **admin grup** |
| Koneksi sering putus | Internet tidak stabil, bot akan auto reconnect |

---

_Dibuat dengan ❤️ untuk keluarga SQ DR_
