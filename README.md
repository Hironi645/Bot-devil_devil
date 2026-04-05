# 🤖 Bot WA Welcome – SQ HH DR

Bot WhatsApp otomatis untuk menyambut anggota baru menggunakan **Baileys + Pairing Code** (tanpa QR scan).

---

## ✅ Persyaratan

- Node.js **v18 ke atas** ([download](https://nodejs.org))
- Nomor WhatsApp aktif
- Bot harus menjadi **admin grup**

---

## 🚀 Cara Instalasi & Jalankan

```bash
# 1. Masuk ke folder bot
cd wa-bot-welcome

# 2. Install dependensi
npm install

# 3. Jalankan bot
npm start
```

---

## 🔑 Proses Pairing

Saat pertama kali dijalankan:

1. Bot akan meminta nomor WA kamu (format: `628xxxxxxxxxx`)
2. Bot menampilkan **kode pairing 8 digit**
3. Di HP → WhatsApp → Titik 3 ⋮ → **Perangkat Tertaut**
4. Pilih **Tautkan dengan nomor telepon**
5. Masukkan kode yang muncul di terminal

Setelah pairing berhasil, sesi tersimpan otomatis di folder `sessions/`.
Jalankan ulang bot → **langsung terhubung tanpa pairing lagi**.

---

## 💬 Pesan Welcome

Pesan dapat diedit di bagian `CONFIG.welcomeMessage` dalam `index.js`.

Gunakan `{nomor}` untuk menyebut nomor anggota baru.

Contoh pesan default:
```
╔══════════════════════════╗
║   🎉 WELCOME TO SQ HH DR 🎉   ║
╚══════════════════════════╝

Halo @{nomor}! 👋
Selamat datang di SQ HH DR ...
```

---

## ⚙️ Konfigurasi

Edit bagian `CONFIG` di `index.js`:

| Opsi            | Keterangan                          |
|-----------------|-------------------------------------|
| `sessionDir`    | Folder penyimpanan sesi (default: `./sessions`) |
| `welcomeMessage`| Template pesan sambutan             |

---

## 🔄 Restart Otomatis (opsional)

Gunakan PM2 agar bot tetap hidup:

```bash
npm install -g pm2
pm2 start index.js --name sqhhdr-bot
pm2 save
pm2 startup
```

---

## 🗑️ Reset Sesi

Jika ingin login ulang dengan nomor berbeda:

```bash
rm -rf sessions/
npm start
```

---

## ❗ Catatan Penting

- Bot **wajib jadi admin** di grup yang ingin dipantau
- Satu bot bisa memantau **banyak grup sekaligus**
- Jangan jalankan nomor yang sama di dua perangkat/bot bersamaan
