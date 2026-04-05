const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['SQ DR Bot', 'Chrome', '120.0.0'],
        markOnlineOnConnect: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log('\n╔══════════════════════════════════════════╗');
            console.log('║       🤖 SQ DR WELCOME BOT v3.0          ║');
            console.log('╚══════════════════════════════════════════╝\n');
            console.log('📱 SCAN QR CODE INI DENGAN WHATSAPP:\n');
            qrcode.generate(qr, { small: true });
            console.log('\n📋 Cara scan:');
            console.log('   1. Buka WhatsApp');
            console.log('   2. Tap ⋮ → Perangkat Tertaut');
            console.log('   3. Tap "Tautkan Perangkat"');
            console.log('   4. Arahkan kamera ke QR Code di atas\n');
            console.log('⚠️  QR berlaku 60 detik. Jika expired, tunggu QR baru otomatis.\n');
        }

        if (connection === 'close') {
            const code = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode
                : null;

            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log(`\n🔌 [${getTime()}] Koneksi terputus: ${lastDisconnect?.error?.message || 'unknown'}`);

            if (shouldReconnect) {
                console.log('🔄 Reconnecting dalam 3 detik...\n');
                setTimeout(startBot, 3000);
            } else {
                console.log('❌ Sesi habis! Jalankan:\n   rm -rf auth_info && node index.js\n');
                process.exit(0);
            }
        }

        if (connection === 'open') {
            console.clear();
            console.log('\n╔══════════════════════════════════════════╗');
            console.log('║    ✅ BOT SQ DR BERHASIL TERHUBUNG! ✅   ║');
            console.log('╚══════════════════════════════════════════╝');
            console.log('\n🟢 Bot aktif — siap menyambut anggota baru');
            console.log('🔴 Tekan CTRL+C untuk mematikan bot\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 LOG AKTIVITAS:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;

        if (action !== 'add') return;

        try {
            const groupMeta = await sock.groupMetadata(id);
            const groupName = groupMeta.name;
            const totalMember = groupMeta.participants.length;

            for (const participant of participants) {
                const userNumber = participant.split('@')[0];

                const welcomeMessage = `╔════════════════════════════╗
║   🌟 *WELCOME TO SQ DR* 🌟   ║
╚════════════════════════════╝

Assalamu'alaikum Warahmatullahi Wabarakatuh 🤲

Selamat datang, @${userNumber}! 🎉

Kami sangat senang menyambut kamu sebagai bagian dari keluarga besar *Squad DR (SQ DR)* 💪✨

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
                    text: welcomeMessage,
                    mentions: [participant]
                });

                console.log(`✅ [${getTime()}] Welcome → @${userNumber} di grup "${groupName}"`);
            }
        } catch (err) {
            console.error(`❌ [${getTime()}] Gagal kirim welcome:`, err.message);
        }
    });
}

function getFormattedDate() {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getTime() {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

startBot();
