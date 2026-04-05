const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");

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
function generateWelcomeMessage(groupName, newMemberName, totalMembers) {
  const messages = [
    `╔══════════════════════╗
║   🎉 SELAMAT DATANG! 🎉   ║
╚══════════════════════╝

Halo @${newMemberName}! 👋

Kami dengan senang hati menyambut kamu di grup *${groupName}*!

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

Semoga betah & nyaman bergabung bersama kami! 🙏
Jangan ragu untuk berkenalan dengan anggota lain ya! 😊

_Pesan ini dikirim otomatis oleh ${CONFIG.botName}_`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

// =============================================
//         PESAN PERPISAHAN (Goodbye Message)
// =============================================
function generateGoodbyeMessage(groupName, memberName) {
  return `╔══════════════════════╗
║   👋 SAMPAI JUMPA! 👋    ║
╚══════════════════════╝

*${memberName}* telah meninggalkan grup *${groupName}*.

Semoga sukses selalu & sampai jumpa lagi! 🌟
Terima kasih sudah bergabung bersama kami 🙏

_Pesan ini dikirim otomatis oleh ${CONFIG.botName}_`;
}

// =============================================
//         STORE & AUTH
// =============================================
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`\n🤖 ${CONFIG.botName} Starting...`);
  console.log(`📱 Versi WA Web: v${version.join(".")} | Terbaru: ${isLatest}`);
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

  store?.bind(sock.ev);

  // =============================================
  //         EVENT: CONNECTION UPDATE
  // =============================================
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Scan QR Code di atas dengan WhatsApp kamu!");
      console.log("   Buka WA > Perangkat Tertaut > Tautkan Perangkat\n");
    }

    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        "❌ Koneksi terputus:",
        lastDisconnect?.error?.message || "Unknown"
      );

      if (shouldReconnect) {
        console.log("🔄 Menghubungkan ulang dalam 5 detik...\n");
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log("🚪 Sesi berakhir. Hapus folder auth_info_baileys lalu jalankan ulang.\n");
      }
    }

    if (connection === "open") {
      console.log("\n✅ BOT BERHASIL TERHUBUNG!");
      console.log(`📱 Nomor Bot  : ${CONFIG.botNumber}`);
      console.log(`🤖 Nama Bot   : ${CONFIG.botName}`);
      console.log(`⏰ Waktu      : ${new Date().toLocaleString("id-ID")}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🟢 Bot siap menyambut anggota baru!\n");
    }
  });

  // =============================================
  //         EVENT: CREDENTIALS UPDATE
  // =============================================
  sock.ev.on("creds.update", saveCreds);

  // =============================================
  //         EVENT: GROUP PARTICIPANTS UPDATE
  //         (Anggota join / keluar grup)
  // =============================================
  sock.ev.on("group-participants.update", async (update) => {
    const { id: groupId, participants, action } = update;

    try {
      // Ambil metadata grup
      const groupMetadata = await sock.groupMetadata(groupId);
      const groupName = groupMetadata.subject;
      const totalMembers = groupMetadata.participants.length;

      for (const participant of participants) {
        // Ambil nama peserta
        const participantJid = participant;
        const participantNumber = participantJid.split("@")[0];

        // Coba ambil nama dari kontak
        let participantName = participantNumber;
        try {
          const contact = store.contacts[participantJid];
          if (contact?.name) participantName = contact.name;
          else if (contact?.notify) participantName = contact.notify;
        } catch (_) {}

        // ─── ANGGOTA BARU JOIN ───────────────────
        if (action === "add") {
          console.log(`\n👋 [${groupName}] Anggota baru: ${participantName} (${participantNumber})`);

          const welcomeMsg = generateWelcomeMessage(
            groupName,
            participantNumber,
            totalMembers
          );

          await sock.sendMessage(groupId, {
            text: welcomeMsg,
            mentions: [participantJid],
          });

          console.log(`✅ Pesan sambutan terkirim ke ${participantName}`);
        }

        // ─── ANGGOTA KELUAR / DIKELUARKAN ────────
        if (action === "remove") {
          console.log(`\n👋 [${groupName}] Anggota keluar: ${participantName} (${participantNumber})`);

          const goodbyeMsg = generateGoodbyeMessage(groupName, participantName);

          await sock.sendMessage(groupId, {
            text: goodbyeMsg,
          });

          console.log(`✅ Pesan perpisahan terkirim`);
        }
      }
    } catch (error) {
      console.error("❌ Error saat mengirim pesan grup:", error.message);
    }
  });

  // =============================================
  //         EVENT: PESAN MASUK (Commands)
  // =============================================
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const sender = isGroup ? msg.key.participant : from;
      const senderNumber = sender?.split("@")[0];

      const messageType = getContentType(msg.message);
      let body = "";

      if (messageType === "conversation") {
        body = msg.message.conversation;
      } else if (messageType === "extendedTextMessage") {
        body = msg.message.extendedTextMessage?.text;
      } else if (messageType === "imageMessage") {
        body = msg.message.imageMessage?.caption || "";
      }

      if (!body.startsWith(CONFIG.prefix)) continue;

      const args = body.slice(CONFIG.prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      console.log(`\n💬 Command: ${CONFIG.prefix}${command} | Dari: ${senderNumber} | Grup: ${isGroup}`);

      // ─── COMMAND: !ping ───────────────────────
      if (command === "ping") {
        const latency = Date.now() - msg.messageTimestamp * 1000;
        await sock.sendMessage(from, {
          text: `🏓 *Pong!*\n⚡ Latensi: ${Math.abs(latency)}ms\n🟢 Bot aktif & berjalan normal!`,
        }, { quoted: msg });
      }

      // ─── COMMAND: !info ───────────────────────
      if (command === "info") {
        await sock.sendMessage(from, {
          text: `╔══════════════════════╗
║     ℹ️  INFO BOT      ║
╚══════════════════════╝

🤖 *Nama*  : ${CONFIG.botName}
📱 *Nomor* : ${CONFIG.botNumber}
👤 *Owner* : ${CONFIG.ownerName}
🕐 *Uptime*: ${formatUptime(process.uptime())}
📅 *Waktu* : ${new Date().toLocaleString("id-ID")}

*Fitur Aktif:*
✅ Auto Welcome Member
✅ Auto Goodbye Member
✅ Command Handler

_Ketik ${CONFIG.prefix}help untuk daftar perintah_`,
        }, { quoted: msg });
      }

      // ─── COMMAND: !help ───────────────────────
      if (command === "help") {
        await sock.sendMessage(from, {
          text: `╔══════════════════════╗
║    📋 DAFTAR MENU    ║
╚══════════════════════╝

*Perintah Umum:*
${CONFIG.prefix}ping   - Cek status bot
${CONFIG.prefix}info   - Info tentang bot
${CONFIG.prefix}help   - Tampilkan menu ini

*Fitur Otomatis:*
🎉 Auto Welcome - Sambut member baru
👋 Auto Goodbye - Pesan perpisahan

_${CONFIG.botName} | Powered by Baileys_`,
        }, { quoted: msg });
      }
    }
  });

  return sock;
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
//         START BOT
// =============================================
connectToWhatsApp().catch(console.error);
