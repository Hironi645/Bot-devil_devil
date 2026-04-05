const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  getContentType,
  isJidGroup,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");

// =============================================
//         KONFIGURASI BOT
// =============================================
const CONFIG = {
  botNumber: "6282157298268",
  botName: "🤖 WelcomeBot Pro",
  ownerName: "Admin",
  prefix: "!",
};

// =============================================
//         PESAN SAMBUTAN (Welcome Message)
// =============================================
function generateWelcomeMessage(groupName, participantNumber, totalMembers) {
  return `╔══════════════════════╗
║   🎉 SELAMAT DATANG! 🎉   ║
╚══════════════════════╝

Halo @${participantNumber}! 👋

Kami dengan senang hati menyambut kamu
di grup *${groupName}*!

━━━━━━━━━━━━━━━━━━━━━
📌 *PERATURAN GRUP:*
━━━━━━━━━━━━━━━━━━━━━
✅ Saling menghormati sesama anggota
✅ Dilarang spam & promosi tanpa izin
✅ Gunakan bahasa yang sopan & santun
✅ Dilarang share konten SARA & hoaks
✅ Topik diskusi sesuai tema grup

━━━━━━━━━━━━━━━━━━━━━
👥 *Kamu adalah anggota ke-${totalMembers}*
━━━━━━━━━━━━━━━━━━━━━

Semoga betah & nyaman bergabung! 🙏
Jangan ragu untuk berkenalan ya! 😊

_Pesan otomatis oleh ${CONFIG.botName}_`;
}

// =============================================
//         PESAN PERPISAHAN (Goodbye Message)
// =============================================
function generateGoodbyeMessage(groupName, memberNumber) {
  return `╔══════════════════════╗
║   👋 SAMPAI JUMPA!    ║
╚══════════════════════╝

*@${memberNumber}* telah meninggalkan
grup *${groupName}*.

Semoga sukses selalu! 🌟
Terima kasih sudah bergabung 🙏

_Pesan otomatis oleh ${CONFIG.botName}_`;
}

// =============================================
//         HELPER: Format Uptime
// =============================================
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}j ${m}m ${s}d`;
}

// =============================================
//         KONEKSI UTAMA
// =============================================
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`\n🤖 ${CONFIG.botName} Starting...`);
  console.log(`📱 WA Web v${version.join(".")} | Terbaru: ${isLatest}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    browser: ["WelcomeBot Pro", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  // CONNECTION UPDATE
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Scan QR Code di atas dengan WhatsApp kamu!");
      console.log("   Buka WA → Perangkat Tertaut → Tautkan Perangkat\n");
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log("❌ Koneksi terputus:", lastDisconnect?.error?.message || "Unknown");
      if (shouldReconnect) {
        console.log("🔄 Reconnect dalam 5 detik...\n");
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log("🚪 Logout. Hapus folder auth_info_baileys lalu jalankan ulang.\n");
      }
    }

    if (connection === "open") {
      console.log("\n✅ BOT BERHASIL TERHUBUNG!");
      console.log(`📱 Nomor  : ${CONFIG.botNumber}`);
      console.log(`🤖 Nama   : ${CONFIG.botName}`);
      console.log(`⏰ Waktu  : ${new Date().toLocaleString("id-ID")}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🟢 Bot siap menyambut anggota baru!\n");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // GROUP PARTICIPANTS UPDATE
  sock.ev.on("group-participants.update", async (update) => {
    const { id: groupId, participants, action } = update;
    try {
      const groupMetadata = await sock.groupMetadata(groupId);
      const groupName = groupMetadata.subject;
      const totalMembers = groupMetadata.participants.length;

      for (const participant of participants) {
        const participantNumber = participant.split("@")[0];

        if (action === "add") {
          console.log(`\n🎉 [${groupName}] JOIN: +${participantNumber}`);
          await sock.sendMessage(groupId, {
            text: generateWelcomeMessage(groupName, participantNumber, totalMembers),
            mentions: [participant],
          });
          console.log(`✅ Pesan sambutan terkirim!`);
        }

        if (action === "remove") {
          console.log(`\n👋 [${groupName}] KELUAR: +${participantNumber}`);
          await sock.sendMessage(groupId, {
            text: generateGoodbyeMessage(groupName, participantNumber),
            mentions: [participant],
          });
          console.log(`✅ Pesan perpisahan terkirim!`);
        }
      }
    } catch (err) {
      console.error("❌ Error group update:", err.message);
    }
  });

  // MESSAGES (Commands)
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const isGroup = isJidGroup(from);
      const sender = isGroup ? msg.key.participant : from;
      const senderNumber = sender?.split("@")[0];

      const msgType = getContentType(msg.message);
      let body = "";

      if (msgType === "conversation") body = msg.message.conversation || "";
      else if (msgType === "extendedTextMessage") body = msg.message.extendedTextMessage?.text || "";
      else if (msgType === "imageMessage") body = msg.message.imageMessage?.caption || "";

      if (!body.startsWith(CONFIG.prefix)) continue;

      const args = body.slice(CONFIG.prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();
      console.log(`💬 CMD: ${CONFIG.prefix}${command} | Dari: ${senderNumber}`);

      if (command === "ping") {
        const latency = Math.abs(Date.now() - msg.messageTimestamp * 1000);
        await sock.sendMessage(from, {
          text: `🏓 *Pong!*\n⚡ Latensi: ${latency}ms\n🟢 Bot aktif & normal!`,
        }, { quoted: msg });
      }

      if (command === "info") {
        await sock.sendMessage(from, {
          text: `╔══════════════════════╗\n║     ℹ️  INFO BOT      ║\n╚══════════════════════╝\n\n🤖 *Nama*   : ${CONFIG.botName}\n📱 *Nomor*  : ${CONFIG.botNumber}\n👤 *Owner*  : ${CONFIG.ownerName}\n🕐 *Uptime* : ${formatUptime(process.uptime())}\n📅 *Waktu*  : ${new Date().toLocaleString("id-ID")}\n\n*Fitur Aktif:*\n✅ Auto Welcome Member\n✅ Auto Goodbye Member\n✅ Command Handler\n\n_Ketik ${CONFIG.prefix}help untuk daftar perintah_`,
        }, { quoted: msg });
      }

      if (command === "help") {
        await sock.sendMessage(from, {
          text: `╔══════════════════════╗\n║    📋 DAFTAR MENU    ║\n╚══════════════════════╝\n\n*Perintah Umum:*\n${CONFIG.prefix}ping  - Cek status bot\n${CONFIG.prefix}info  - Info tentang bot\n${CONFIG.prefix}help  - Tampilkan menu ini\n\n*Fitur Otomatis:*\n🎉 Auto Welcome - Sambut member baru\n👋 Auto Goodbye - Pesan perpisahan\n\n_${CONFIG.botName} | Powered by Baileys_`,
        }, { quoted: msg });
      }
    }
  });

  return sock;
}

connectToWhatsApp().catch(console.error);
