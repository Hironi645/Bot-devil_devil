const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');

// ──────────────────────────────────────────────────
// INPUT: Minta nomor HP dari terminal
// ──────────────────────────────────────────────────
function tanyaNomor() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.clear();
        console.log('\n╔══════════════════════════════════════╗');
        console.log('║     🤖 SQ DR WELCOME BOT             ║');
        console.log('╚══════════════════════════════════════╝\n');
        console.log('📌 Masukkan nomor WhatsApp yang akan dipakai bot.');
        console.log('📌 Format: 628xxxxxxxxxx (tanpa + dan tanpa spasi)\n');
        rl.question('📱 Nomor WA : ', (nomor) => {
            rl.close();
            // Bersihkan input: hapus spasi, strip, +, dan 0 di depan → ganti dengan 62
            nomor = nomor.replace(/\D/g, '');
            if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);
            resolve(nomor);
        });
    });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    // Cek apakah sudah pernah login sebelumnya
    const sudahLogin = state.creds?.registered;

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['SQ DR Welcome Bot', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    // Kirim pairing code jika belum login
    if (!sudahLogin) {
        const nomor = await tanyaNomor();
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(nomor);
                const codeFmt = code.match(/.{1,4}/g)?.join('-') || code;
                console.clear();
                console.log('\n╔══════════════════════════════════════╗');
                console.log('║     🔐 PAIRING CODE SQ DR BOT        ║');
                console.log('╚══════════════════════════════════════╝\n');
                console.log(`📱 Nomor  : ${nomor}`);
                console.log(`🔑 Kode   : \x1b[1;32m${codeFmt}\x1b[0m`);
                console.log('\n📋 Cara pakai kode:');
                console.log('   1. Buka WhatsApp di HP kamu');
                console.log('   2. Tap ⋮ → Perangkat Tertaut');
                console.log('   3. Tap "Tautkan Perangkat"');
                console.log('   4. Tap "Tautkan dengan nomor telepon"');
                console.log(`   5. Masukkan kode: \x1b[1;32m${codeFmt}\x1b[0m`);
                console.log('\n⏳ Kode berlaku beberapa menit...\n');
            } catch (err) {
                console.error('\n❌ Gagal generate pairing code:', err.message);
                console.log('💡 Pastikan nomor benar dan WhatsApp aktif.\n');
                process.exit(1);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log(`\n🔌 Koneksi terputus karena: ${lastDisconnect?.error?.message}`);

            if (shouldReconnect) {
                console.log('🔄 Mencoba reconnect...\n');
                setTimeout(startBot, 3000);
            } else {
                console.log('❌ Logged out! Hapus folder auth_info dan jalankan ulang.\n');
                process.exit(0);
            }
        }

        if (connection === 'open') {
            console.clear();
            console.log('\n╔══════════════════════════════════════╗');
            console.log('║   ✅ BOT SQ DR BERHASIL TERHUBUNG!   ║');
            console.log('╚══════════════════════════════════════╝');
            console.log('\n📌 Bot aktif dan siap menyambut anggota baru');
            console.log('📌 Tekan CTRL+C untuk mematikan bot\n');
        }
    });

    // ──────────────────────────────────────────────────
    // EVENT: Anggota baru masuk grup
    // ──────────────────────────────────────────────────
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;

        if (action === 'add') {
            try {
                const groupMeta = await sock.groupMetadata(id);
                const groupName = groupMeta.name;

                for (const participant of participants) {
                    const userNumber = participant.split('@')[0];
                    const mention = [participant];

                    // Hitung total anggota
                    const totalMember = groupMeta.participants.length;

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
💬 Jangan ragu untuk bertanya & berkenalan dengan anggota lainnya ya! 😊

Semoga betah & nyaman di sini! 🏡
Bersama *SQ DR*, kita lebih kuat! 💪🔥

_Bot by SQ DR_ 🤖`;

                    await sock.sendMessage(id, {
                        text: welcomeMessage,
                        mentions: mention
                    });

                    console.log(`✅ [${getTime()}] Welcome terkirim ke @${userNumber} di grup "${groupName}"`);
                }
            } catch (err) {
                console.error(`❌ Gagal kirim welcome:`, err.message);
            }
        }
    });
}

// ──────────────────────────────────────────────────
// HELPER: Format tanggal & waktu
// ──────────────────────────────────────────────────
function getFormattedDate() {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getTime() {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Jalankan bot
startBot();
