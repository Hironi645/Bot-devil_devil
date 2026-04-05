/**
 * SQ DR WELCOME BOT v5.0
 * Fix: Connection Closed saat requestPairingCode
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');

const logger = pino({ level: 'silent' });

function tanyaNomor() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n======================================');
        console.log('      SQ DR WELCOME BOT v5.0');
        console.log('======================================\n');
        console.log('Login menggunakan Pairing Code\n');
        rl.question('Masukkan nomor WA (contoh: 6282157298268) : ', (ans) => {
            rl.close();
            resolve(ans.trim().replace(/[^0-9]/g, ''));
        });
    });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    // FIX: pakai makeCacheableSignalKeyStore agar koneksi stabil
    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        // FIX: browser harus persis format ini agar WA izinkan pairing
        browser: ['Ubuntu', 'Chrome', '22.04'],
        // FIX: nonaktifkan fitur yang bisa bikin koneksi ditolak WA
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        getMessage: async () => undefined,
    });

    // FIX: Pairing code harus diminta SETELAH event QR pertama muncul
    // bukan langsung setelah socket dibuat
    let pairingRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        // FIX: Gunakan event 'qr' sebagai sinyal bahwa socket sudah siap
        // lalu ganti ke pairing code
        if (qr && !pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true;

            const nomor = await tanyaNomor();

            if (!nomor || nomor.length < 8) {
                console.log('\n❌ Nomor tidak valid! Jalankan ulang.\n');
                process.exit(1);
            }

            try {
                const code = await sock.requestPairingCode(nomor);
                const formatted = code?.match(/.{1,4}/g)?.join('-') ?? code;

                console.log('\n======================================');
                console.log('        PAIRING CODE KAMU');
                console.log('======================================');
                console.log(`\n   >>> ${formatted} <<<\n`);
                console.log('======================================');
                console.log('\nCara memasukkan di WhatsApp:');
                console.log('1. Buka WhatsApp');
                console.log('2. Tap titik tiga (pojok kanan atas)');
                console.log('3. Pilih "Perangkat Tertaut"');
                console.log('4. Tap "Tautkan Perangkat"');
                console.log('5. Tap "Tautkan dengan nomor telepon"');
                console.log(`6. Ketik kode: ${formatted}`);
                console.log('\nMenunggu kamu memasukkan kode...\n');
            } catch (err) {
                console.log('\n❌ Gagal generate pairing code:', err.message);
                console.log('Coba jalankan ulang: node index.js\n');
                process.exit(1);
            }
        }

        if (connection === 'close') {
            const code = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode
                : 500;

            console.log(`\n[${getTime()}] Koneksi putus - kode: ${code}`);

            if (code === DisconnectReason.loggedOut) {
                console.log('Logged out. Hapus auth_info lalu jalankan ulang.\n');
                process.exit(0);
            } else {
                console.log('Reconnecting dalam 5 detik...\n');
                setTimeout(startBot, 5000);
            }
        }

        if (connection === 'open') {
            console.clear();
            console.log('\n======================================');
            console.log('   BOT SQ DR BERHASIL TERHUBUNG!');
            console.log('======================================');
            console.log('\nBot aktif - siap menyambut anggota baru');
            console.log('Tekan CTRL+C untuk matikan bot\n');
            console.log('--------------------------------------');
            console.log('LOG AKTIVITAS:');
            console.log('--------------------------------------\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Event: anggota baru masuk grup
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'add') return;

        try {
            const groupMeta  = await sock.groupMetadata(id);
            const groupName  = groupMeta.name;
            const totalMember = groupMeta.participants.length;

            for (const participant of participants) {
                const userNumber = participant.split('@')[0];

                const welcomeMsg =
`╔════════════════════════════╗
║   🌟 *WELCOME TO SQ DR* 🌟   ║
╚════════════════════════════╝

Assalamu'alaikum Warahmatullahi Wabarakatuh 🤲

Selamat datang, @${userNumber}! 🎉

Kami dengan bangga menyambut kamu sebagai bagian dari keluarga besar *Squad DR (SQ DR)* 💪✨

━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *INFORMASI GRUP*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Grup       : *${groupName}*
🏅 Member ke  : *${totalMember}*
📅 Bergabung  : *${getFormattedDate()}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 *PERATURAN GRUP*
━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ Saling menghormati sesama anggota
2️⃣ Dilarang spam & promosi tanpa izin
3️⃣ Gunakan bahasa yang sopan & santun
4️⃣ Dilarang share konten negatif/SARA
5️⃣ Tetap jaga kerukunan & kekompakan

━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 Jangan ragu untuk berkenalan dengan anggota lainnya ya! 😊

Semoga betah & nyaman di sini! 🏡
Bersama *SQ DR*, kita lebih kuat! 💪🔥

_Bot by SQ DR_ 🤖`;

                await sock.sendMessage(id, {
                    text: welcomeMsg,
                    mentions: [participant],
                });

                console.log(`✅ [${getTime()}] Welcome → @${userNumber} | "${groupName}"`);
            }
        } catch (err) {
            console.error(`❌ [${getTime()}] Error:`, err.message);
        }
    });
}

function getFormattedDate() {
    const now = new Date();
    const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getTime() {
    return new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

startBot();
