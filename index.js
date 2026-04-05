const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');

// ============================================================
//   ⚙️  KONFIGURASI — EDIT BAGIAN INI
// ============================================================
const CONFIG = {
    // ✅ Isi nomor WA kamu di sini (format: 62xxx tanpa + atau spasi)
    phoneNumber: '628xxxxxxxxxx',

    sessionDir: './sessions',

    welcomeMessage: `╔══════════════════════════╗
║  🎉 WELCOME TO SQ HH DR 🎉  ║
╚══════════════════════════╝

Halo @{nomor}! 👋

Selamat datang di *SQ HH DR* 🙌
Senang kamu bergabung bersama kami!

📌 *Harap perhatikan:*
• Baca dan ikuti aturan grup
• Jaga sopan santun & saling menghormati
• Dilarang spam & promosi tanpa izin

Semoga betah dan enjoy ya! 😊🔥

_— Admin SQ HH DR_`,
};

// ============================================================
//   UTILITY
// ============================================================
const logger = pino({ level: 'silent' });

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function formatWelcome(template, nomor) {
    return template.replace(/\{nomor\}/g, nomor).replace(/\{nama\}/g, nomor);
}

if (!fs.existsSync(CONFIG.sessionDir)) fs.mkdirSync(CONFIG.sessionDir, { recursive: true });

// ============================================================
//   MAIN BOT
// ============================================================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['SQ HH DR Bot', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
    });

    // ── Pairing Code ──────────────────────────────────────────
    if (!sock.authState.creds.registered) {
        // Tunggu socket siap dulu sebelum request pairing code
        await sleep(3000);

        const phoneNumber = CONFIG.phoneNumber.replace(/[^0-9]/g, '');

        if (!phoneNumber || phoneNumber === '628xxxxxxxxxx') {
            console.log('\n❌ STOP! Isi dulu CONFIG.phoneNumber di index.js dengan nomor WA kamu!');
            console.log('   Contoh: phoneNumber: \'6281234567890\'\n');
            process.exit(1);
        }

        if (!phoneNumber.startsWith('62')) {
            console.log('❌ Nomor harus diawali 62 (kode Indonesia). Contoh: 6281234567890');
            process.exit(1);
        }

        console.log('\n╔══════════════════════════════════════╗');
        console.log('║       🤖  SQ HH DR - WA BOT         ║');
        console.log('╚══════════════════════════════════════╝');
        console.log(`\n📱 Meminta pairing code untuk: +${phoneNumber}`);

        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('\n╔══════════════════════════════╗');
            console.log(`║  🔑 PAIRING CODE: ${code}   ║`);
            console.log('╚══════════════════════════════╝');
            console.log('\n📲 Cara pairing di HP:');
            console.log('   1. Buka WhatsApp');
            console.log('   2. Titik 3 (⋮) → Perangkat Tertaut');
            console.log('   3. Tautkan Perangkat → Tautkan dengan nomor telepon');
            console.log('   4. Masukkan kode di atas');
            console.log('\n⏳ Menunggu konfirmasi pairing...\n');
        } catch (err) {
            console.error('❌ Gagal mendapatkan pairing code:', err.message);
            console.log('💡 Tips: Pastikan nomor aktif & terhubung internet, lalu coba lagi.');
            process.exit(1);
        }
    }

    // ── Connection Update ─────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;

            console.log(`\n⚠️  Koneksi terputus (kode: ${code})`);

            if (code === DisconnectReason.loggedOut) {
                console.log('🔴 Sesi logout. Hapus folder sessions/ lalu jalankan ulang.');
                fs.rmSync(CONFIG.sessionDir, { recursive: true, force: true });
                process.exit(0);
            }

            if (shouldReconnect) {
                console.log('🔄 Mencoba reconnect...');
                await sleep(3000);
                startBot();
            }
        }

        if (connection === 'open') {
            const me = sock.user?.id?.split(':')[0] || '-';
            console.log(`\n✅ Bot terhubung! (${me})`);
            console.log('👀 Memantau anggota baru di semua grup...\n');
        }
    });

    // ── Simpan Kredensial ─────────────────────────────────────
    sock.ev.on('creds.update', saveCreds);

    // ── Welcome Member Baru ───────────────────────────────────
    sock.ev.on('group-participants.update', async (event) => {
        const { id: groupJid, participants, action } = event;

        if (action !== 'add') return;               // Hanya proses jika ada yang join

        for (const participant of participants) {
            try {
                const nomor = participant.replace('@s.whatsapp.net', '');
                const welcomeText = formatWelcome(CONFIG.welcomeMessage, nomor);

                await sock.sendMessage(groupJid, {
                    text: welcomeText,
                    mentions: [participant],
                });

                console.log(`🎉 Welcome dikirim ke @${nomor} di grup ${groupJid}`);
                await sleep(500); // Anti-spam jika banyak join sekaligus
            } catch (err) {
                console.error(`❌ Gagal kirim welcome ke ${participant}:`, err.message);
            }
        }
    });

    return sock;
}

// ── Entry Point ───────────────────────────────────────────────
startBot().catch((err) => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
});
