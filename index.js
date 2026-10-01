require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  AttachmentBuilder,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
} = require('@discordjs/voice');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { Readable } = require('stream');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Health-check server để treo trên Cloud 24/7 (Render, Koyeb, Railway)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Discord AI Bot đang hoạt động 24/7!');
}).listen(PORT, () => {
  console.log(`🌐 Health-check server sẵn sàng trên cổng ${PORT}`);
});

// ==========================================
// 1. KIỂM TRA BIẾN MÔI TRƯỜNG & CHỐNG CRASH
// ==========================================
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ LỖI: Chưa cấu hình DISCORD_TOKEN trong file .env');
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ LỖI: Chưa cấu hình GEMINI_API_KEY trong file .env');
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});

// ==========================================
// 2. CẤU HÌNH GOOGLE GEMINI AI (MULTI-MODEL FALLBACK)
// ==========================================
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

const SYSTEM_PROMPT = `Bạn là Khun Aguero Agnis, một nhân vật xuất thân từ Gia tộc Khun (Tower of God).
Bạn là Light Bearer (Người điều khiển Hải đăng), cực kỳ thông minh, điềm tĩnh, nhạy bén và mưu lược.
Hãy trả lời người dùng một cách lịch thiệp, sắc sảo, tự tin và hữu ích bằng tiếng Việt.
Nếu người dùng đính kèm hình ảnh, hãy quan sát kỹ lưỡng và đưa ra phân tích chính xác nhất.`;

async function urlToInlineData(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return {
      inlineData: {
        mimeType: mimeType.split(';')[0],
        data: Buffer.from(arrayBuffer).toString('base64'),
      },
    };
  } catch (err) {
    console.error('Lỗi tải ảnh:', err.message);
    return null;
  }
}

async function callGemini(contents) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}`;
        console.warn(`⚠️ [Model ${model} bận]: ${errMsg} -> Thử model dự phòng...`);
        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn(`⚠️ [Model ${model} lỗi]: ${err.message} -> Đang thử model khác...`);
      lastError = err;
    }
  }

  throw lastError || new Error('Tất cả các mô hình AI hiện đang bận. Vui lòng thử lại sau vài giây!');
}

// ==========================================
// 3. HỆ THỐNG GIỌNG ĐỌC AI (MICROSOFT EDGE TTS)
// ==========================================
const VOICE_NAME = 'vi-VN-NamMinhNeural';

function cleanTextForTTS(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' đoạn mã ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#]/g, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/<a?:\w+:\d+>/g, '') // Bỏ custom emoji discord
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateAudioBuffer(text) {
  try {
    const clean = cleanTextForTTS(text);
    if (!clean || clean.length < 2) return null;

    const textToRead = clean.slice(0, 500);

    // Tạo thư mục tạm thời để lưu file âm thanh
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'khun-tts-'));
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE_NAME, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Tinh chỉnh: Tốc độ đọc +12% (nhanh dứt khoát) & Hạ âm trầm -2Hz (ngầu, trầm ấm)
    const res = await tts.toFile(tempDir, textToRead, {
      rate: 1.12,
      pitch: '-2Hz',
    });

    const buffer = fs.readFileSync(res.audioFilePath);

    // Xóa thư mục tạm thời sau khi đọc xong
    fs.rmSync(tempDir, { recursive: true, force: true });

    return buffer;
  } catch (err) {
    console.error('Lỗi tạo giọng đọc TTS:', err.message);
    return null;
  }
}

// ==========================================
// 4. QUẢN LÝ VOICE CHANNEL & HÀNG ĐỢI ÂM THANH (AUDIO QUEUE)
// ==========================================
let isVoiceEnabled = true;       // Bật/tắt giọng đọc AI
let isReadChatEnabled = true;   // Bật/tắt tính năng tự đọc tin nhắn chat vào voice

// Quản lý audio queue và text channels cho từng guild
// Cấu trúc: guildId -> { player, queue: [], isPlaying: false, boundChannels: Set }
const guildVoiceSessions = new Map();

function getOrCreateVoiceSession(guildId) {
  if (!guildVoiceSessions.has(guildId)) {
    const player = createAudioPlayer();
    const session = {
      player,
      queue: [],
      isPlaying: false,
      boundChannels: new Set(),
    };

    player.on(AudioPlayerStatus.Idle, () => {
      session.isPlaying = false;
      playNextInQueue(guildId);
    });

    player.on('error', (err) => {
      console.error(`[Player Error ${guildId}]:`, err.message);
      session.isPlaying = false;
      playNextInQueue(guildId);
    });

    guildVoiceSessions.set(guildId, session);
  }
  return guildVoiceSessions.get(guildId);
}

function playNextInQueue(guildId) {
  const session = guildVoiceSessions.get(guildId);
  if (!session || session.isPlaying || session.queue.length === 0) return;

  const audioBuffer = session.queue.shift();
  session.isPlaying = true;

  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.subscribe(session.player);
    const resource = createAudioResource(Readable.from(audioBuffer));
    session.player.play(resource);
  } else {
    session.isPlaying = false;
  }
}

// Thêm âm thanh vào hàng đợi phát
function queueAudio(guildId, audioBuffer) {
  const session = getOrCreateVoiceSession(guildId);
  session.queue.push(audioBuffer);
  if (!session.isPlaying) {
    playNextInQueue(guildId);
  }
}

// ==========================================
// 5. QUẢN LÝ BỘ NHỚ HỘI THOẠI & COOLDOWN
// ==========================================
const conversationHistories = new Map();
const userCooldowns = new Map();

function getHistory(convoId) {
  if (!conversationHistories.has(convoId)) {
    conversationHistories.set(convoId, []);
  }
  return conversationHistories.get(convoId);
}

function addToHistory(convoId, role, parts) {
  const history = getHistory(convoId);
  history.push({ role, parts });
  if (history.length > 10) history.splice(0, history.length - 10);
}

function clearHistory(convoId) {
  conversationHistories.delete(convoId);
}

function splitMessage(text, maxLength = 1900) {
  const chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

// ==========================================
// 6. KHỞI TẠO DISCORD CLIENT
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

client.once('ready', async () => {
  console.log(`=============================================`);
  console.log(`🤖 Bot đã online: ${client.user.tag}`);
  console.log(`ID Bot: ${client.user.id}`);
  console.log(`🧠 AI Engine: Google Gemini (Multi-Model Fallback)`);
  console.log(`🎙️ TTS Engine: Microsoft Edge (${VOICE_NAME}) - MIỄN PHÍ`);

  // Đăng ký Slash Commands
  const commands = [
    new SlashCommandBuilder()
      .setName('ask')
      .setDescription('Hỏi đáp với Khun Aguero Agnis hoặc phân tích ảnh')
      .addStringOption((opt) =>
        opt.setName('prompt').setDescription('Nội dung câu hỏi').setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt.setName('private').setDescription('Chỉ một mình bạn nhìn thấy câu trả lời? (Mặc định: False)').setRequired(false)
      )
      .addAttachmentOption((opt) =>
        opt.setName('image').setDescription('Ảnh đính kèm cần phân tích (tùy chọn)').setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('voice')
      .setDescription('Bật hoặc tắt giọng đọc lồng tiếng của Bot')
      .addStringOption((opt) =>
        opt
          .setName('state')
          .setDescription('Trạng thái giọng đọc')
          .setRequired(true)
          .addChoices(
            { name: 'Bật giọng đọc (ON)', value: 'on' },
            { name: 'Tắt giọng đọc (OFF)', value: 'off' }
          )
      ),

    new SlashCommandBuilder()
      .setName('readchat')
      .setDescription('Bật hoặc tắt chức năng tự đọc tin nhắn chat trong phòng thoại')
      .addStringOption((opt) =>
        opt
          .setName('state')
          .setDescription('Trạng thái đọc tin nhắn')
          .setRequired(true)
          .addChoices(
            { name: 'Bật đọc tin nhắn chat (ON)', value: 'on' },
            { name: 'Tắt đọc tin nhắn chat (OFF)', value: 'off' }
          )
      ),

    new SlashCommandBuilder()
      .setName('join')
      .setDescription('Mời bot tham gia vào kênh thoại (Voice Channel) của bạn'),

    new SlashCommandBuilder()
      .setName('leave')
      .setDescription('Cho bot rời khỏi kênh thoại (Voice Channel)'),

    new SlashCommandBuilder()
      .setName('reset')
      .setDescription('Xóa lịch sử hội thoại để bắt đầu cuộc trò chuyện mới'),
  ];

  try {
    if (process.env.GUILD_ID) {
      await client.application.commands.set(commands, process.env.GUILD_ID);
      console.log(`⚡ Đã đăng ký Slash Commands cho Server ID: ${process.env.GUILD_ID}`);
    } else {
      await client.application.commands.set(commands);
      console.log(`🌐 Đã đăng ký Slash Commands toàn cầu`);
    }
  } catch (cmdErr) {
    console.error('⚠️ Không thể đăng ký Slash Commands:', cmdErr.message);
  }

  console.log(`=============================================`);
});

// ==========================================
// 7. XỬ LÝ SLASH COMMANDS
// ==========================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const convoId = `user-${interaction.user.id}`;
  const guildId = interaction.guildId;

  // Lệnh /reset
  if (interaction.commandName === 'reset') {
    clearHistory(convoId);
    await interaction.reply({
      content: '🧹 Đã xóa sạch lịch sử hội thoại! Bạn có thể bắt đầu chủ đề mới.',
      ephemeral: true,
    });
    return;
  }

  // Lệnh /voice (Bật/Tắt giọng đọc AI)
  if (interaction.commandName === 'voice') {
    const state = interaction.options.getString('state');
    isVoiceEnabled = state === 'on';
    await interaction.reply({
      content: isVoiceEnabled
        ? '🎙️ **Đã BẬT** giọng đọc lồng tiếng (Nam Minh Neural)!'
        : '🔇 **Đã TẮT** giọng đọc lồng tiếng!',
      ephemeral: true,
    });
    return;
  }

  // Lệnh /readchat (Bật/Tắt tự động đọc chat vào room)
  if (interaction.commandName === 'readchat') {
    const state = interaction.options.getString('state');
    isReadChatEnabled = state === 'on';
    await interaction.reply({
      content: isReadChatEnabled
        ? '📖 **Đã BẬT** chức năng tự động đọc tin nhắn chat vào phòng thoại (chỉ đọc nội dung, không đọc tên)!'
        : '🔇 **Đã TẮT** chức năng tự động đọc tin nhắn chat!',
      ephemeral: true,
    });
    return;
  }

  // Lệnh /join (Vào phòng thoại)
  if (interaction.commandName === 'join') {
    const memberVoiceChannel = interaction.member?.voice?.channel;
    if (!memberVoiceChannel) {
      await interaction.reply({
        content: '⚠️ Bạn phải ở trong một kênh thoại (Voice Channel) trước thì tôi mới vào được!',
        ephemeral: true,
      });
      return;
    }

    try {
      const connection = joinVoiceChannel({
        channelId: memberVoiceChannel.id,
        guildId: memberVoiceChannel.guild.id,
        adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
      });

      const session = getOrCreateVoiceSession(memberVoiceChannel.guild.id);
      connection.subscribe(session.player);

      // Ghi nhớ kênh chat để tự động đọc tin nhắn
      session.boundChannels.add(memberVoiceChannel.id); // Khung chat của voice channel
      session.boundChannels.add(interaction.channelId);  // Kênh text nơi gõ /join

      await interaction.reply({
        content: `🔊 Đã tham gia kênh thoại **${memberVoiceChannel.name}**!\n📖 Tôi sẽ tự động đọc mọi tin nhắn bạn gõ trong khung chat vào phòng thoại (chỉ đọc nội dung, không đọc tên người gửi).`,
      });
    } catch (err) {
      console.error('Lỗi /join:', err);
      await interaction.reply({ content: `⚠️ Không thể vào phòng thoại: ${err.message}`, ephemeral: true });
    }
    return;
  }

  // Lệnh /leave (Rời phòng thoại)
  if (interaction.commandName === 'leave') {
    const connection = guildId ? getVoiceConnection(guildId) : null;
    if (connection) {
      connection.destroy();
      guildVoiceSessions.delete(guildId);
      await interaction.reply('👋 Đã rời khỏi kênh thoại!');
    } else {
      await interaction.reply({ content: '⚠️ Bot hiện không ở trong kênh thoại nào!', ephemeral: true });
    }
    return;
  }

  // Lệnh /ask
  if (interaction.commandName === 'ask') {
    const prompt = interaction.options.getString('prompt');
    const attachment = interaction.options.getAttachment('image');
    const isPrivate = interaction.options.getBoolean('private') ?? false;

    await interaction.deferReply({ ephemeral: isPrivate });

    try {
      const parts = [{ text: prompt }];
      if (attachment && attachment.contentType?.startsWith('image/')) {
        const imgData = await urlToInlineData(attachment.url);
        if (imgData) parts.push(imgData);
      }

      addToHistory(convoId, 'user', parts);
      const replyText = await callGemini(getHistory(convoId));
      addToHistory(convoId, 'model', [{ text: replyText }]);

      const chunks = splitMessage(replyText);

      const connection = guildId ? getVoiceConnection(guildId) : null;
      const isInVoiceRoom = connection && connection.state.status === VoiceConnectionStatus.Ready;

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(replyText);
      }

      if (isInVoiceRoom && audioBuffer) {
        // ĐÃ TRONG PHÒNG THOẠI -> PHÁT QUA MIC, KHÔNG GỬI FILE VÀO CHAT
        queueAudio(guildId, audioBuffer);
        await interaction.editReply({ content: chunks[0] });
      } else if (audioBuffer && !isInVoiceRoom) {
        // KHÔNG TRONG PHÒNG THOẠI -> GỬI KÈM FILE MP3 VÀO CHAT
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'khun_voice.mp3' });
        await interaction.editReply({ content: chunks[0], files: [voiceAttachment] });
      } else {
        await interaction.editReply({ content: chunks[0] });
      }

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i], ephemeral: isPrivate });
      }
    } catch (err) {
      console.error('❌ Lỗi /ask:', err);
      await interaction.editReply(`⚠️ Đã có lỗi xảy ra: ${err.message}`).catch(() => {});
    }
  }
});

// ==========================================
// 8. XỬ LÝ CHAT TRỰC TIẾP & ĐỌC VĂN BẢN VÀO VOICE ROOM
// ==========================================
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    const guildId = message.guildId;
    const connection = guildId ? getVoiceConnection(guildId) : null;
    const isInVoiceRoom = connection && connection.state.status === VoiceConnectionStatus.Ready;
    const isBotMentioned = message.mentions.has(client.user.id);
    const isDirectMessage = !message.guild;

    // ========================================================
    // TÍNH NĂNG 1: TỰ ĐỘNG ĐỌC TIN NHẮN CHAT VÀO PHÒNG THOẠI (TTS CHAT READER)
    // Nếu bot đang trong phòng thoại, người dùng gõ tin nhắn (không tag bot)
    // -> Bot đọc trực tiếp nội dung qua mic, KHÔNG đọc tên, KHÔNG gửi tin nhắn vào chat!
    // ========================================================
    if (isInVoiceRoom && isReadChatEnabled && !isBotMentioned && !isDirectMessage) {
      const session = guildVoiceSessions.get(guildId);
      const isTargetChannel = session && (session.boundChannels.has(message.channelId) || session.boundChannels.size === 0);

      if (isTargetChannel) {
        const senderName = message.member?.displayName || message.author.displayName || message.author.username;
        const cleanText = cleanTextForTTS(message.content);

        // Kiểm tra xem có chứa Link hay Tệp đính kèm không
        const hasLink = /https?:\/\/\S+/i.test(message.content);
        const attachments = message.attachments;
        const hasAttachment = attachments && attachments.size > 0;

        let fileAnnouncement = '';
        if (hasAttachment) {
          const firstAtt = attachments.first();
          const contentType = firstAtt?.contentType || '';
          if (contentType.startsWith('image/')) {
            fileAnnouncement = `${senderName} đã gửi một hình ảnh`;
          } else if (contentType.startsWith('video/')) {
            fileAnnouncement = `${senderName} đã gửi một video`;
          } else if (contentType.startsWith('audio/')) {
            fileAnnouncement = `${senderName} đã gửi một tệp âm thanh`;
          } else {
            fileAnnouncement = `${senderName} đã gửi một tệp tin`;
          }
        } else if (hasLink) {
          fileAnnouncement = `${senderName} đã gửi một liên kết`;
        }

        // Tạo câu đọc hoàn chỉnh
        let finalSpokenText = '';
        if (fileAnnouncement && cleanText) {
          finalSpokenText = `${cleanText}. ${fileAnnouncement}.`;
        } else if (fileAnnouncement) {
          finalSpokenText = `${fileAnnouncement}.`;
        } else if (cleanText && cleanText.length >= 1) {
          // Tin nhắn văn bản thông thường: CHỈ ĐỌC NỘI DUNG, KHÔNG ĐỌC TÊN
          finalSpokenText = cleanText;
        }

        if (finalSpokenText) {
          const audioBuffer = await generateAudioBuffer(finalSpokenText);
          if (audioBuffer) {
            queueAudio(guildId, audioBuffer);
          }
          return; // Đã đọc vào room xong, không xử lý AI nữa
        }
      }
    }

    // ========================================================
    // TÍNH NĂNG 2: HỎI ĐÁP VỚI AI (KHI ĐƯỢC TAG HOẶC TRONG DM)
    // ========================================================
    if (!isDirectMessage && !isBotMentioned) return;

    const cleanText = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
    const convoId = `user-${message.author.id}`;

    // Lệnh reset nhanh
    if (cleanText.toLowerCase() === 'reset' || cleanText.toLowerCase() === '!reset') {
      clearHistory(convoId);
      await message.reply('🧹 Đã xóa lịch sử hội thoại của bạn! Hãy bắt đầu chủ đề mới nhé.');
      return;
    }

    // Cooldown 3s
    const now = Date.now();
    const lastTime = userCooldowns.get(message.author.id) || 0;
    if (now - lastTime < 3000) {
      await message.react('⏳').catch(() => {});
      return;
    }
    userCooldowns.set(message.author.id, now);

    const imageAttachments = message.attachments.filter(
      (att) => att.contentType && att.contentType.startsWith('image/')
    );

    if (!cleanText && imageAttachments.size === 0) {
      await message.reply('Chào bạn! Tôi là Khun Aguero Agnis. Hãy đặt câu hỏi hoặc gửi ảnh để tôi giải đáp nhé!');
      return;
    }

    await message.channel.sendTyping();
    const typingInterval = setInterval(() => {
      message.channel.sendTyping().catch(() => {});
    }, 4000);

    const parts = [];
    if (cleanText) parts.push({ text: cleanText });

    for (const [, att] of imageAttachments) {
      const imgData = await urlToInlineData(att.url);
      if (imgData) parts.push(imgData);
    }

    addToHistory(convoId, 'user', parts);
    const replyText = await callGemini(getHistory(convoId));
    clearInterval(typingInterval);

    addToHistory(convoId, 'model', [{ text: replyText }]);

    const chunks = splitMessage(replyText);

    let audioBuffer = null;
    if (isVoiceEnabled) {
      audioBuffer = await generateAudioBuffer(replyText);
    }

    if (isInVoiceRoom && audioBuffer) {
      // ĐÃ TRONG PHÒNG THOẠI -> PHÁT QUA MIC, KHÔNG GỬI FILE VÀO CHAT
      queueAudio(guildId, audioBuffer);
      await message.reply(chunks[0]);
    } else if (audioBuffer && !isInVoiceRoom) {
      // KHÔNG TRONG PHÒNG THOẠI -> GỬI KÈM FILE MP3 VÀO CHAT
      const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'khun_voice.mp3' });
      await message.reply({ content: chunks[0], files: [voiceAttachment] });
    } else {
      await message.reply(chunks[0]);
    }

    for (let i = 1; i < chunks.length; i++) {
      await message.channel.send(chunks[i]);
    }

  } catch (error) {
    console.error('❌ Lỗi tin nhắn:', error);
    await message.reply(`⚠️ Đã có lỗi xảy ra: ${error.message}`).catch(() => {});
  }
});

// ==========================================
// 9. ĐĂNG NHẬP BOT
// ==========================================
client.login(process.env.DISCORD_TOKEN);
