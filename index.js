const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidGroup,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');

// ============================================================
//   KONFIGURASI BOT
// ============================================================
const CONFIG = {
    sessionDir: './sessions',
    welcomeMessage: `╔══════════════════════════╗
║   🎉 WELCOME TO SQ HH DR 🎉   ║
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

function question(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(prompt, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function formatWelcome(template, nomor, pushName) {
    return template
        .replace('{nomor}', nomor)
        .replace('{nama}', pushName || nomor);
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
        printQRInTerminal: false,      // Pakai pairing code, bukan QR
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['SQ HH DR Bot', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
    });

    // ── Pairing Code ──────────────────────────────────────────
    if (!sock.authState.creds.registered) {
        await sleep(1500);
        console.log('\n╔══════════════════════════════════════╗');
        console.log('║       🤖  SQ HH DR - WA BOT         ║');
        console.log('╚══════════════════════════════════════╝\n');

        let phoneNumber = await question('📱 Masukkan nomor WA kamu (contoh: 628xxxxxxxxxx): ');
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (!phoneNumber.startsWith('62')) {
            console.log('❌ Nomor harus diawali dengan kode negara (misal: 628xxx)');
            process.exit(1);
        }

        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('\n╔══════════════════════════╗');
            console.log(`║   🔑 PAIRING CODE: ${code}  ║`);
            console.log('╚══════════════════════════╝');
            console.log('\n📲 Langkah pairing di HP:');
            console.log('   1. Buka WhatsApp → Titik 3 (⋮) → Perangkat tertaut');
            console.log('   2. Tautkan perangkat → Tautkan dengan nomor telepon');
            console.log('   3. Masukkan kode di atas\n');
        } catch (err) {
            console.error('❌ Gagal mendapatkan pairing code:', err.message);
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
                const pushName = (await sock.onWhatsApp(participant))?.[0]?.notify || nomor;

                const welcomeText = formatWelcome(CONFIG.welcomeMessage, nomor, pushName);

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
