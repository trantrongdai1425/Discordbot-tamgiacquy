const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

try {
  const { Agent, setGlobalDispatcher } = require('undici');
  setGlobalDispatcher(new Agent({
    connect: { family: 4 }
  }));
} catch (e) {
  // Bỏ qua nếu undici không sẵn sàng
}

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  EndBehaviorType,
} = require('@discordjs/voice');
const prism = require('prism-media');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { Readable } = require('stream');
const play = require('play-dl');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

let loginStatus = 'Khởi tạo...';
let loginError = null;
let lastReadyTime = null;
let apiCheckResult = 'Đang kiểm tra kết nối API...';
const recentDebugLogs = [];

async function testDiscordApiConnection() {
  const t = (process.env.DISCORD_TOKEN || '').replace(/^["']|["']$/g, '').trim();
  const start = Date.now();
  try {
    const res = await fetch('https://discord.com/api/v10/gateway/bot', {
      headers: { Authorization: `Bot ${t}` },
      signal: AbortSignal.timeout(10000),
    });
    const status = res.status;
    const text = await res.text();
    apiCheckResult = `HTTP ${status} (${Date.now() - start}ms): ${text.slice(0, 150)}`;
    console.log(`[API Probe]: ${apiCheckResult}`);
  } catch (err) {
    apiCheckResult = `Lỗi sau ${Date.now() - start}ms: ${err.message}`;
    console.error(`[API Probe Error]: ${apiCheckResult}`);
  }
}
testDiscordApiConnection();

// Health-check server để treo trên Cloud 24/7 (Render, Koyeb, Railway)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  const rawToken = (process.env.DISCORD_TOKEN || '').trim();
  const tokenMask = rawToken.length > 10 ? `${rawToken.slice(0, 6)}...${rawToken.slice(-6)} (len: ${rawToken.length})` : `(len: ${rawToken.length})`;
  const isReady = typeof client !== 'undefined' && client && typeof client.isReady === 'function' && client.isReady();
  const statusStr = isReady ? `🟢 ONLINE (${client.user?.tag})` : `🟡 CHƯA SẴN SÀNG (${loginStatus})`;

  let out = `🤖 Khun Aguero Agnis - Discord AI Bot đang chạy 24/7!\n`;
  out += `Trạng thái: ${statusStr}\n`;
  out += `Token Render: ${tokenMask}\n`;
  out += `API Probe: ${apiCheckResult}\n`;
  if (lastReadyTime) out += `Online lúc: ${lastReadyTime}\n`;
  if (loginError) out += `Lỗi kết nối: ${loginError}\n`;
  if (recentDebugLogs.length > 0) {
    out += `\nNhật ký Gateway (5 gần nhất):\n${recentDebugLogs.slice(-5).join('\n')}\n`;
  }
  res.end(out);
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

const SYSTEM_PROMPT_KHUN = `Bạn là Khun Aguero Agnis, một nhân vật xuất thân từ Gia tộc Khun (Tower of God).
Bạn là Light Bearer (Người điều khiển Hải đăng), cực kỳ thông minh, điềm tĩnh, nhạy bén và mưu lược.
Hãy trả lời người dùng một cách lịch thiệp, sắc sảo, tự tin và hữu ích bằng tiếng Việt.
Nếu người dùng đính kèm hình ảnh, hãy quan sát kỹ lưỡng và đưa ra phân tích chính xác nhất.`;

const SYSTEM_PROMPT_NORMAL = `Bạn là một trợ lý AI thông minh, hữu ích, khách quan, chính xác và chuyên nghiệp.
Hãy trả lời câu hỏi của người dùng một cách trực tiếp, mạch lạc, ngắn gọn và hữu ích bằng tiếng Việt.
Không cần xưng hô theo bất kỳ nhân vật hư cấu nào. Trả lời một cách chuẩn mực, khách quan như một mô hình ngôn ngữ lớn (LLM).
Nếu người dùng đính kèm hình ảnh, hãy quan sát kỹ lưỡng và đưa ra phân tích chính xác nhất.`;

// Map lưu chế độ phong cách phản hồi theo từng Server (Guild)
const guildPersonalityModes = new Map();

function getSystemPrompt(guildId) {
  const mode = guildPersonalityModes.get(guildId) || 'khun';
  return mode === 'khun' ? SYSTEM_PROMPT_KHUN : SYSTEM_PROMPT_NORMAL;
}

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

async function callGemini(contents, customSystemPrompt = null, guildId = null) {
  const promptToUse = customSystemPrompt || getSystemPrompt(guildId);
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: promptToUse }] },
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
// 3. HỆ THỐNG GIỌNG ĐỌC AI (TINH CHỈNH TỐC ĐỘ +12%, PITCH -2Hz)
// ==========================================
const VOICE_NAME = 'vi-VN-NamMinhNeural';

function cleanTextForTTS(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' đoạn mã ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#]/g, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateAudioBuffer(text) {
  try {
    const clean = cleanTextForTTS(text);
    if (!clean || clean.length < 2) return null;

    const textToRead = clean.slice(0, 500);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'khun-tts-'));
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE_NAME, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const res = await tts.toFile(tempDir, textToRead, {
      rate: 1.12,
      pitch: '-2Hz',
    });

    const buffer = fs.readFileSync(res.audioFilePath);
    fs.rmSync(tempDir, { recursive: true, force: true });

    return buffer;
  } catch (err) {
    console.error('Lỗi tạo giọng đọc TTS:', err.message);
    return null;
  }
}

// ==========================================
// 3.5. HỆ THỐNG VẼ TRANH AI (POLLINATIONS & GEMINI PROMPT ENHANCER)
// ==========================================
async function generateAIImageBuffer(prompt, style = '') {
  let promptToUse = prompt;
  try {
    const promptEnhanceSystem = 'Bạn là chuyên gia tạo prompt vẽ tranh AI. Hãy dịch và mở rộng ý tưởng của người dùng thành một prompt tiếng Anh chi tiết, tuyệt đẹp cho AI art (FLUX/SDXL). Chỉ xuất ra DUY NHẤT câu prompt tiếng Anh, không giải thích hay thêm bớt lời chào.';
    const translated = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], promptEnhanceSystem);
    if (translated && translated.trim()) {
      promptToUse = translated.trim().replace(/\n+/g, ' ');
    }
  } catch (err) {
    console.warn('Lỗi mở rộng prompt qua Gemini:', err.message);
  }

  if (style) {
    promptToUse += `, ${style} style`;
  }
  promptToUse += ', masterpiece, best quality, highly detailed, vibrant lighting, 4k';

  const seed = Math.floor(Math.random() * 10000000);
  const polliKey = process.env.POLLINATIONS_API_KEY;
  if (!polliKey) {
    throw new Error('Chưa cấu hình biến môi trường POLLINATIONS_API_KEY (.env / Render).');
  }
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(promptToUse)}?key=${polliKey}&seed=${seed}&width=1024&height=1024`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Máy chủ tạo ảnh báo lỗi (${res.status}): ${errText.slice(0, 100)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ==========================================
// 4. QUẢN LÝ VOICE CHANNEL, HÀNG ĐỢI ÂM THANH & PHÁT NHẠC (YOUTUBE / SPOTIFY)
// ==========================================
let isVoiceEnabled = true;
let isReadChatEnabled = true;

const guildVoiceSessions = new Map();

// Quản lý Client ID cho SoundCloud (Dự phòng đa nguồn 100% không bị chặn cloud IP)
let scClientId = null;
async function ensureSoundCloudClient() {
  if (!scClientId) {
    try {
      scClientId = await play.getFreeClientID();
      await play.setToken({ soundcloud: { client_id: scClientId } });
    } catch (e) {
      console.warn('Lỗi khởi tạo SoundCloud Client ID:', e.message);
    }
  }
}

// Hàm làm sạch tiêu đề video YouTube (Loại bỏ các tag rác thường gặp như [MV], [Vietsub], (4K), v.v.)
function cleanYouTubeTitle(rawTitle) {
  let cleaned = rawTitle
    .replace(/\[(official|audio|mv|music video|lyric|lyrics|vietsub|kara|karaoke|full hd|4k|1080p|hd|hq|prod\.[^\]]*|teasing|trailer|remix|cover|beat)[^\]]*\]/gi, '')
    .replace(/\((official|audio|mv|music video|lyric|lyrics|vietsub|kara|karaoke|full hd|4k|1080p|hd|hq|prod\.[^)]*|teasing|trailer|remix|cover|beat)[^)]*\)/gi, '')
    .replace(/\|.*$/g, '')
    .replace(/#(shorts|nhacbuontiktok|music|tiktok|[a-z0-9_]+)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || rawTitle;
}

// Bộ giải mã và tìm nạp thông tin bài hát (Hỗ trợ Từ khóa, Spotify, YouTube, SoundCloud, File trực tiếp)
async function resolveTrackInfo(query, requestedBy) {
  await ensureSoundCloudClient();
  let title = '';
  let artist = '';
  let thumbnail = '';
  let originalUrl = query.trim();
  let fallbackUrls = [];
  const candidates = [];

  // 0. Kiểm tra link file âm thanh trực tiếp (.mp3, .wav, .ogg, .m4a)
  if (query.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i)) {
    const filename = query.split('/').pop().split('?')[0];
    return {
      title: decodeURIComponent(filename),
      artist: 'Direct Audio Stream',
      url: originalUrl,
      originalUrl: originalUrl,
      thumbnail: '',
      duration: 'Live / File',
      sourceType: 'direct',
      requestedBy: requestedBy,
    };
  }

  // 1. Kiểm tra link Spotify
  if (query.includes('spotify.com')) {
    try {
      const oembedRes = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(query));
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || '';
        thumbnail = data.thumbnail_url || '';

        try {
          const pageRes = await fetch(query, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const html = await pageRes.text();
          const match = html.match(/<title>([^<]+)<\/title>/);
          if (match && match[1]) {
            const pageTitle = match[1].replace(/ \| Spotify$/, '');
            const parts = pageTitle.split(' - song and lyrics by ');
            if (parts.length === 2) {
              title = parts[0];
              artist = parts[1];
              candidates.push(`${title} ${artist}`.trim());
            }
          }
        } catch (_) {}
        if (title) candidates.push(title);
      }
    } catch (e) {
      console.warn('Lỗi phân tích Spotify:', e.message);
    }
  }
  // 2. Kiểm tra link YouTube
  else if (query.includes('youtube.com') || query.includes('youtu.be')) {
    try {
      const oembedRes = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent(query) + '&format=json');
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || '';
        artist = data.author_name || '';
        thumbnail = data.thumbnail_url || '';

        const cleaned = cleanYouTubeTitle(title);
        candidates.push(cleaned);
        if (artist && !cleaned.toLowerCase().includes(artist.toLowerCase())) {
          candidates.push(`${cleaned} ${artist}`.trim());
        }
        if (cleaned.includes('-')) {
          const parts = cleaned.split('-');
          candidates.push(parts[0].trim());
          candidates.push(parts[1].trim());
        }
        candidates.push(title);
      }
    } catch (e) {
      console.warn('Lỗi phân tích YouTube:', e.message);
    }
  }
  // 3. Link SoundCloud trực tiếp
  else if (query.includes('soundcloud.com')) {
    try {
      const oembedRes = await fetch('https://soundcloud.com/oembed?url=' + encodeURIComponent(query) + '&format=json');
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || '';
        artist = data.author_name || '';
        thumbnail = data.thumbnail_url || '';
        candidates.push(query);
        if (title) candidates.push(title.replace(/\s+by\s+.*$/i, ''));
      }
    } catch (e) {
      console.warn('Lỗi phân tích SoundCloud:', e.message);
    }
  }
  // 4. Tìm kiếm từ khóa thông thường
  else {
    candidates.push(query.trim());
  }

  // Tìm kiếm theo danh sách ứng viên (Multi-tier candidate search)
  let bestTrack = null;
  for (const candidate of candidates) {
    if (!candidate || candidate.length < 2) continue;
    try {
      let results = await play.search(candidate, { source: { soundcloud: 'tracks' }, limit: 5 });
      if (!results || results.length === 0) {
        scClientId = null;
        await ensureSoundCloudClient();
        results = await play.search(candidate, { source: { soundcloud: 'tracks' }, limit: 5 });
      }

      if (results && results.length > 0) {
        const fullTracks = results.filter((t) => t.durationInSec && t.durationInSec > 45);
        const nonRemix = fullTracks.filter((t) => !/remix|bootleg|cover/i.test(t.name));
        const sorted = [
          ...nonRemix,
          ...fullTracks.filter((t) => /remix|bootleg|cover/i.test(t.name)),
          ...results,
        ];
        bestTrack = sorted[0];
        fallbackUrls = sorted.slice(1, 4).map((t) => t.url);
        if (bestTrack) break;
      }
    } catch (err) {
      console.warn(`Lỗi tìm kiếm ứng viên [${candidate}]:`, err.message);
    }
  }

  if (!bestTrack) {
    return null;
  }

  return {
    title: title || bestTrack.name,
    artist: artist || bestTrack.user?.name || 'Nghệ sĩ',
    url: bestTrack.url,
    fallbackUrls: fallbackUrls || [],
    originalUrl: originalUrl.startsWith('http') ? originalUrl : bestTrack.url,
    thumbnail: thumbnail || bestTrack.thumbnail || '',
    duration: bestTrack.durationInSec
      ? `${Math.floor(bestTrack.durationInSec / 60)}:${('0' + (bestTrack.durationInSec % 60)).slice(-2)}`
      : 'N/A',
    sourceType: 'soundcloud',
    requestedBy: requestedBy,
  };
}

// Bảng điều khiển nút bấm âm nhạc (Interactive Buttons)
function createMusicControlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_music_toggle')
      .setLabel('⏯️ Tạm dừng / Tiếp tục')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_music_skip')
      .setLabel('⏭️ Bỏ qua')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_music_stop')
      .setLabel('⏹️ Dừng phát')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('btn_music_queue')
      .setLabel('📜 Hàng đợi')
      .setStyle(ButtonStyle.Secondary)
  );
}

// Embed hiển thị bài hát đang phát
function createNowPlayingEmbed(song) {
  const embed = new EmbedBuilder()
    .setTitle(`🎶 Đang Phát: ${song.title.slice(0, 80)}`)
    .setDescription(
      `**Ca sĩ / Nghệ sĩ:** ${song.artist}\n` +
      `**Thời lượng:** \`${song.duration}\`\n` +
      `**Người yêu cầu:** <@${song.requestedBy.id}>\n` +
      `**Nguồn bài:** [Nhấn vào đây để xem](${song.originalUrl})`
    )
    .setColor(0x1DB954)
    .setFooter({ text: 'Khun Aguero Agnis • Music Engine 24/7' })
    .setTimestamp();

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }
  return embed;
}

function getOrCreateVoiceSession(guildId) {
  if (!guildVoiceSessions.has(guildId)) {
    const player = createAudioPlayer();
    const musicPlayer = createAudioPlayer();
    const session = {
      player,
      musicPlayer,
      queue: [],
      isPlaying: false,
      isMusicPausedForTTS: false,
      musicQueue: {
        songs: [],
        isPlaying: false,
        currentSong: null,
        textChannel: null,
      },
      boundChannels: new Set(),
    };

    // Khi TTS đọc xong
    player.on(AudioPlayerStatus.Idle, () => {
      session.isPlaying = false;
      if (session.queue.length > 0) {
        playNextInQueue(guildId);
      } else {
        // Nếu nhạc bị tạm dừng vì TTS, tự động tiếp tục phát nhạc!
        if (session.isMusicPausedForTTS && session.musicQueue.isPlaying) {
          session.isMusicPausedForTTS = false;
          const connection = getVoiceConnection(guildId);
          if (connection) {
            connection.subscribe(session.musicPlayer);
            session.musicPlayer.unpause();
          }
        }
      }
    });

    player.on('error', (err) => {
      console.error(`[TTS Player Error ${guildId}]:`, err.message);
      session.isPlaying = false;
      if (session.queue.length > 0) {
        playNextInQueue(guildId);
      } else if (session.isMusicPausedForTTS && session.musicQueue.isPlaying) {
        session.isMusicPausedForTTS = false;
        const connection = getVoiceConnection(guildId);
        if (connection) {
          connection.subscribe(session.musicPlayer);
          session.musicPlayer.unpause();
        }
      }
    });

    // Khi bài hát kết thúc -> Chuyển bài kế tiếp
    musicPlayer.on(AudioPlayerStatus.Idle, () => {
      playNextSongInQueue(guildId);
    });

    musicPlayer.on('error', (err) => {
      console.error(`[Music Player Error ${guildId}]:`, err.message);
      playNextSongInQueue(guildId);
    });

    guildVoiceSessions.set(guildId, session);
  }
  return guildVoiceSessions.get(guildId);
}

// Phát bài hát tiếp theo trong danh sách chờ
async function playNextSongInQueue(guildId) {
  const session = guildVoiceSessions.get(guildId);
  if (!session) return;

  const musicQueue = session.musicQueue;
  if (musicQueue.songs.length === 0) {
    musicQueue.isPlaying = false;
    musicQueue.currentSong = null;
    return;
  }

  const nextSong = musicQueue.songs.shift();
  musicQueue.currentSong = nextSong;
  musicQueue.isPlaying = true;

  try {
    let resource;
    if (nextSong.sourceType === 'direct') {
      resource = createAudioResource(nextSong.url);
    } else {
      let stream = null;
      const urlsToTry = [nextSong.url, ...(nextSong.fallbackUrls || [])];
      for (const url of urlsToTry) {
        try {
          stream = await play.stream(url);
          if (stream) break;
        } catch (streamErr) {
          console.warn(`[Stream Attempt Failed ${guildId}]: ${url} - ${streamErr.message}`);
          if (streamErr.message.includes('404') || streamErr.message.includes('401')) {
            scClientId = null;
            await ensureSoundCloudClient();
          }
        }
      }

      if (!stream) {
        throw new Error('Nguồn bài hát bị giới hạn bản quyền hoặc không khả dụng (404 Not Found)');
      }
      resource = createAudioResource(stream.stream, { inputType: stream.type });
    }

    const connection = getVoiceConnection(guildId);
    if (connection) {
      if (session.isPlaying) {
        session.isMusicPausedForTTS = true;
        session.musicPlayer.play(resource);
        session.musicPlayer.pause();
      } else {
        connection.subscribe(session.musicPlayer);
        session.musicPlayer.play(resource);
      }
    }

    if (musicQueue.textChannel) {
      const npEmbed = createNowPlayingEmbed(nextSong);
      const row = createMusicControlRow();
      musicQueue.textChannel.send({ embeds: [npEmbed], components: [row] }).catch(() => {});
    }
  } catch (err) {
    console.error(`[Play Error ${guildId}]:`, err.message);
    let friendlyMessage = err.message;
    if (err.message.includes('404') || err.message.includes('Got 404')) {
      friendlyMessage = 'Bản nhạc này đã bị gỡ hoặc bị chặn bản quyền theo vùng (404 Not Found)';
    } else if (err.message.includes('403') || err.message.includes('429')) {
      friendlyMessage = 'Hệ thống bị giới hạn truy cập tạm thời (403/429)';
    }
    if (musicQueue.textChannel) {
      musicQueue.textChannel.send(`⚠️ Không thể phát bài **${nextSong.title}**: ${friendlyMessage}. Đang tự động chuyển sang bài tiếp theo...`).catch(() => {});
    }
    playNextSongInQueue(guildId);
  }
}

function playNextInQueue(guildId) {
  const session = guildVoiceSessions.get(guildId);
  if (!session || session.isPlaying || session.queue.length === 0) return;

  const audioBuffer = session.queue.shift();
  session.isPlaying = true;

  const connection = getVoiceConnection(guildId);
  if (connection) {
    // Nếu nhạc đang phát, tạm dừng để nhường mic cho Khun nói
    if (session.musicQueue.isPlaying && session.musicPlayer.state.status === AudioPlayerStatus.Playing) {
      session.isMusicPausedForTTS = true;
      session.musicPlayer.pause();
    }

    connection.subscribe(session.player);
    const resource = createAudioResource(Readable.from(audioBuffer));
    session.player.play(resource);
  } else {
    session.isPlaying = false;
  }
}

function queueAudio(guildId, audioBuffer) {
  const session = getOrCreateVoiceSession(guildId);
  session.queue.push(audioBuffer);
  if (!session.isPlaying) {
    playNextInQueue(guildId);
  }
}

// ==========================================
// 4.5. HỆ THỐNG ĐÀM THOẠI GIỌNG NÓI THEO YÊU CẦU (ON-DEMAND VOICE AI - TIẾT KIỆM TOKEN)
// ==========================================
function createWavHeader(dataLength, sampleRate = 48000, numChannels = 2, bitDepth = 16) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

const activeVoiceListeners = new Map(); // guildId -> { userId, timeoutId }

function createVoiceControlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_voice_talk')
      .setLabel('🎙️ Nhấn để nói (Hỏi Khun)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_voice_readchat')
      .setLabel('📖 Đọc Chat (Bật/Tắt)')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_voice_leave')
      .setLabel('👋 Rời phòng')
      .setStyle(ButtonStyle.Danger)
  );
}

async function handleVoiceSpeechInputOnDemand(guildId, userId, wavBuffer) {
  const currentMode = guildPersonalityModes.get(guildId) || 'khun';
  let personalityInstruction = '';
  if (currentMode === 'khun') {
    personalityInstruction = 'Trả lời bằng phong cách Khun Aguero Agnis (quý tộc mưu lược, sắc sảo, tự tin, ngắn gọn súc tích trong 1-2 câu).';
  } else {
    personalityInstruction = 'Trả lời như một trợ lý AI chuẩn mực, ngắn gọn, thẳng thắn, khách quan và lịch thiệp trong 1-2 câu.';
  }

  const prompt = `Bạn đang lắng nghe câu hỏi trực tiếp bằng giọng nói của thành viên trong phòng voice Discord.
QUY TẮC: Hãy nghe câu hỏi trong đoạn âm thanh và trả lời lại bằng tiếng Việt trong 1-2 câu ngắn gọn, thông minh, tự nhiên để đọc to qua mic. ${personalityInstruction}`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: 'audio/wav', data: wavBuffer.toString('base64') } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        })
      });

      if (!resp.ok) continue;
      const data = await resp.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!answer) continue;

      console.log(`🎙️ [Voice AI Trả Lời - Guild ${guildId}]: "${answer}"`);

      const audioBuffer = await generateAudioBuffer(answer);
      if (audioBuffer) {
        queueAudio(guildId, audioBuffer);
      }
      return;
    } catch (e) {
      console.warn(`⚠️ Lỗi model ${model} khi phân tích voice:`, e.message);
    }
  }
}

async function startOnDemandVoiceTalk(interaction, guildId, memberVoiceChannel) {
  const connection = getVoiceConnection(guildId);
  if (!connection || connection.state.status !== VoiceConnectionStatus.Ready) {
    return interaction.reply({
      content: '⚠️ Bot hiện không ở trong phòng thoại nào! Hãy dùng lệnh `/join` trước.',
      ephemeral: true,
    });
  }

  if (activeVoiceListeners.has(guildId)) {
    return interaction.reply({
      content: '⏳ Bot đang lắng nghe một thành viên khác, vui lòng chờ trong giây lát!',
      ephemeral: true,
    });
  }

  const userId = interaction.user.id;
  await interaction.reply({
    content: `🎙️ Đang mở mic lắng nghe riêng bạn trong 10 giây tới... *(Chỉ một mình bạn nhìn thấy tin nhắn này, không làm phiền kênh chat)*`,
    ephemeral: true,
  });

  // Phát tín hiệu âm thanh vào phòng voice
  const promptAudio = await generateAudioBuffer('Tôi đang nghe đây, mời bạn nói...');
  if (promptAudio) {
    queueAudio(guildId, promptAudio);
  }

  const receiver = connection.receiver;
  let hasReceivedAudio = false;

  const timeoutId = setTimeout(() => {
    if (!hasReceivedAudio) {
      activeVoiceListeners.delete(guildId);
      interaction.followUp({
        content: `⏳ Đã hết 10 giây chờ (chưa nhận thấy câu hỏi). Hãy bấm lại khi sẵn sàng nhé!`,
        ephemeral: true,
      }).catch(() => {});
    }
  }, 12000);

  activeVoiceListeners.set(guildId, { userId, timeoutId });

  // Lắng nghe stream từ người dùng này
  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1200,
    },
  });

  const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const pcmChunks = [];

  opusStream.pipe(decoder);

  decoder.on('data', (chunk) => {
    if (pcmChunks.reduce((acc, c) => acc + c.length, 0) < 48000 * 2 * 2 * 12) {
      pcmChunks.push(chunk);
    }
  });

  decoder.on('end', async () => {
    clearTimeout(timeoutId);
    activeVoiceListeners.delete(guildId);
    hasReceivedAudio = true;

    const pcmBuffer = Buffer.concat(pcmChunks);
    if (pcmBuffer.length < 100000) {
      return;
    }

    try {
      const wavHeader = createWavHeader(pcmBuffer.length, 48000, 2, 16);
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      await handleVoiceSpeechInputOnDemand(guildId, userId, wavBuffer);
    } catch (err) {
      console.error('Lỗi xử lý âm thanh on-demand:', err.message);
    }
  });

  decoder.on('error', () => {
    clearTimeout(timeoutId);
    activeVoiceListeners.delete(guildId);
  });
}

// ==========================================
// 5. HỆ THỐNG RPG: TÒA THÁP (TOWER OF GOD PROFILES)
// ==========================================
const towerProfiles = new Map();

function getProfile(userId) {
  if (!towerProfiles.has(userId)) {
    const positions = [
      'Light Bearer 🔦',
      'Wave Controller 🌊',
      'Fisherman 🎣',
      'Spear Bearer 🎯',
      'Scout 👁️',
    ];
    const defaultPos = positions[Math.floor(Math.random() * positions.length)];
    towerProfiles.set(userId, {
      shinsu: 20,
      floor: 2,
      position: defaultPos,
      title: 'Người Leo Tháp Tập Sự',
    });
  }
  return towerProfiles.get(userId);
}

function addShinsuExp(userId, amount = 10) {
  const profile = getProfile(userId);
  profile.shinsu += amount;
  const nextFloorExp = profile.floor * 100;
  if (profile.shinsu >= nextFloorExp) {
    profile.floor += 1;
    if (profile.floor === 20) profile.title = 'Regular Cấp C';
    else if (profile.floor === 50) profile.title = 'Regular Cấp B';
    else if (profile.floor === 80) profile.title = 'Regular Cấp A';
    else if (profile.floor >= 100) profile.title = 'High Ranker 👑';
  }
}

// Helper phân tích thời gian cho lệnh /remind
function parseDuration(timeStr) {
  const match = timeStr.toLowerCase().trim().match(/^(\d+)\s*(s|m|h)$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 's') return val * 1000;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 3600 * 1000;
  return null;
}

// ==========================================
// 6. QUẢN LÝ BỘ NHỚ HỘI THOẠI & COOLDOWN
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
// 7. KHỞI TẠO DISCORD CLIENT
// ==========================================
const client = new Client({
  rest: { timeout: 15000 },
  ws: {
    handshakeTimeout: 15000,
    helloTimeout: 15000,
    readyTimeout: 15000,
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

client.on('error', (err) => {
  loginError = `Client Error: ${err.message}`;
  console.error('⚠️ [Client Error]:', err);
});

client.on('shardError', (err) => {
  loginError = `Shard Error: ${err.message}`;
  console.error('⚠️ [Shard Error]:', err);
});

client.on('shardDisconnect', (event) => {
  loginStatus = `Mất kết nối Gateway (Code: ${event.code})`;
});

client.on('debug', (info) => {
  recentDebugLogs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${info}`);
  if (recentDebugLogs.length > 20) recentDebugLogs.shift();
});

client.once('ready', async () => {
  lastReadyTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  loginStatus = 'Đã sẵn sàng hoạt động';
  console.log(`=============================================`);
  console.log(`🤖 Bot đã online: ${client.user.tag}`);
  console.log(`ID Bot: ${client.user.id}`);
  console.log(`🧠 AI Engine: Google Gemini (Multi-Model Fallback)`);
  console.log(`🎙️ TTS Engine: Microsoft Edge (${VOICE_NAME}) - MIỄN PHÍ`);

  // Đăng ký toàn bộ Slash Commands
  const commands = [
    // 1. Hỏi đáp AI
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

    // 2. Vẽ tranh AI
    new SlashCommandBuilder()
      .setName('draw')
      .setDescription('Vẽ tranh bằng trí tuệ nhân tạo (AI Image Generator)')
      .addStringOption((opt) =>
        opt.setName('prompt').setDescription('Mô tả bức tranh bạn muốn vẽ (Tiếng Việt hoặc Anh)').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('style')
          .setDescription('Phong cách hội họa')
          .setRequired(false)
          .addChoices(
            { name: 'Anime / Manga', value: 'anime' },
            { name: 'Cyberpunk viễn tưởng', value: 'cyberpunk' },
            { name: 'Fantasy kỳ ảo', value: 'fantasy' },
            { name: '3D Render điện ảnh', value: '3d render' },
            { name: 'Chân thực (Photorealistic)', value: 'photorealistic' }
          )
      ),

    // 3. Khun Phán Xét (Roast)
    new SlashCommandBuilder()
      .setName('roast')
      .setDescription('Nhờ Khun dùng con mắt chiến thuật để phán xét/khịa một ai đó')
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Người bạn muốn Khun phán xét').setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName('topic').setDescription('Chủ đề phán xét (ví dụ: độ tạ trong game, gu ăn mặc...)').setRequired(false)
      ),

    // 4. Tử vi & Chiến thuật Leo Rank
    new SlashCommandBuilder()
      .setName('tactics')
      .setDescription('Xem bói tử vi và chiến thuật leo rank hôm nay từ Quân sư Khun')
      .addStringOption((opt) =>
        opt.setName('game').setDescription('Tên game bạn chuẩn bị chơi (Liên Quân, LMHT, Valorant...)').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('role').setDescription('Vị trí của bạn trong đội hình (Rừng, Mid, Duelist, ADC...)').setRequired(false)
      ),

    // 5. Báo thức & Nhắc lịch bằng Giọng Nói
    new SlashCommandBuilder()
      .setName('remind')
      .setDescription('Đặt hẹn giờ nhắc việc bằng giọng nói (ví dụ: 10m Ra cắm cơm)')
      .addStringOption((opt) =>
        opt.setName('time').setDescription('Thời gian đếm ngược (ví dụ: 30s, 10m, 1h)').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('task').setDescription('Nội dung công việc cần nhắc').setRequired(true)
      ),

    // 6. Hồ sơ Tòa Tháp (RPG Profile)
    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Xem thẻ căn cước Regular và cấp bậc leo Tháp của bạn')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('Thành viên muốn xem hồ sơ').setRequired(false)
      ),

    // 7. Chọn Vị trí trong Tòa Tháp
    new SlashCommandBuilder()
      .setName('setrole')
      .setDescription('Chọn vị trí chiến đấu của bạn trong Tòa Tháp')
      .addStringOption((opt) =>
        opt.setName('position')
          .setDescription('Vị trí chiến đấu')
          .setRequired(true)
          .addChoices(
            { name: 'Light Bearer 🔦 (Điều khiển Hải đăng - Quân sư)', value: 'Light Bearer 🔦' },
            { name: 'Wave Controller 🌊 (Điều khiển Shinsu - Pháp sư)', value: 'Wave Controller 🌊' },
            { name: 'Fisherman 🎣 (Ngư phủ tiên phong - Đấu sĩ)', value: 'Fisherman 🎣' },
            { name: 'Spear Bearer 🎯 (Tay ném thương - Xạ thủ)', value: 'Spear Bearer 🎯' },
            { name: 'Scout 👁️ (Trinh sát tiền tiêu)', value: 'Scout 👁️' }
          )
      ),

    // 8. Bật/Tắt Giọng đọc
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

    // 9. Bật/Tắt Đọc chat phòng voice
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

    // 10. Vào kênh voice
    new SlashCommandBuilder()
      .setName('join')
      .setDescription('Mời bot tham gia vào kênh thoại (Voice Channel) của bạn'),

    // 11. Rời kênh voice
    new SlashCommandBuilder()
      .setName('leave')
      .setDescription('Cho bot rời khỏi kênh thoại (Voice Channel)'),

    // 12. Reset ngữ cảnh
    new SlashCommandBuilder()
      .setName('reset')
      .setDescription('Xóa lịch sử hội thoại để bắt đầu cuộc trò chuyện mới'),

    // 13. Chọn Phong cách AI (Khun / Tiêu chuẩn)
    new SlashCommandBuilder()
      .setName('mode')
      .setDescription('Bật/Tắt phong cách nhập vai Khun Aguero Agnis hoặc chuyển về AI tiêu chuẩn')
      .addStringOption((opt) =>
        opt
          .setName('style')
          .setDescription('Phong cách phản hồi của Bot (Toàn server)')
          .setRequired(true)
          .addChoices(
            { name: '👑 Khun Aguero Agnis (Quý tộc mưu lược, sắc sảo)', value: 'khun' },
            { name: '🤖 AI Tiêu Chuẩn (Trung lập, thẳng thắn, như ChatGPT)', value: 'normal' }
          )
      ),

    // 14. Bảng hướng dẫn sử dụng toàn diện
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Hiển thị bảng hướng dẫn và danh sách tất cả các lệnh của Bot'),

    // 15. Nói chuyện trực tiếp với Khun qua mic
    new SlashCommandBuilder()
      .setName('talk')
      .setDescription('Bật mic để nói chuyện trực tiếp với Bot bằng giọng nói trong phòng voice (tiết kiệm token)'),

    // 16. Phát nhạc (YouTube / Spotify / SoundCloud)
    new SlashCommandBuilder()
      .setName('play')
      .setDescription('Phát bài hát từ YouTube, Spotify, SoundCloud hoặc tìm kiếm theo tên bài')
      .addStringOption((opt) =>
        opt.setName('query').setDescription('Tên bài hát hoặc đường link (YouTube / Spotify)').setRequired(true)
      ),

    // 17. Tạm dừng nhạc
    new SlashCommandBuilder()
      .setName('pause')
      .setDescription('Tạm dừng bài hát đang phát'),

    // 18. Tiếp tục phát nhạc
    new SlashCommandBuilder()
      .setName('resume')
      .setDescription('Tiếp tục phát bài hát đang tạm dừng'),

    // 19. Bỏ qua bài hát
    new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Bỏ qua bài hát hiện tại để phát bài kế tiếp trong hàng đợi'),

    // 20. Dừng phát nhạc
    new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Dừng hẳn phát nhạc và làm trống danh sách hàng đợi'),

    // 21. Xem hàng đợi nhạc
    new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Xem danh sách các bài hát đang chờ trong hàng đợi'),

    // 22. Thông tin bài hát đang phát
    new SlashCommandBuilder()
      .setName('nowplaying')
      .setDescription('Xem thông tin chi tiết bài hát đang phát và bảng điều khiển'),
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
// 8. XỬ LÝ TOÀN BỘ SLASH COMMANDS
// ==========================================
client.on('interactionCreate', async (interaction) => {
  // Xử lý các nút bấm tương tác (Voice Control Panel)
  if (interaction.isButton()) {
    const guildId = interaction.guildId;
    const memberVoiceChannel = interaction.member?.voice?.channel;

    if (interaction.customId === 'btn_voice_talk') {
      if (!memberVoiceChannel) {
        return interaction.reply({
          content: '⚠️ Bạn phải ở trong kênh thoại để nói chuyện với bot!',
          ephemeral: true,
        });
      }
      await startOnDemandVoiceTalk(interaction, guildId, memberVoiceChannel);
      return;
    }

    if (interaction.customId === 'btn_voice_readchat') {
      isReadChatEnabled = !isReadChatEnabled;
      return interaction.reply({
        content: isReadChatEnabled
          ? '📖 **Đã BẬT** chức năng tự đọc tin nhắn chat vào phòng thoại!'
          : '🔇 **Đã TẮT** chức năng tự đọc tin nhắn chat!',
        ephemeral: true,
      });
    }

    if (interaction.customId === 'btn_voice_leave') {
      const conn = guildId ? getVoiceConnection(guildId) : null;
      if (conn) {
        const session = guildVoiceSessions.get(guildId);
        if (session) {
          session.musicPlayer.stop(true);
          session.musicQueue.songs = [];
          session.musicQueue.currentSong = null;
          session.musicQueue.isPlaying = false;
        }
        conn.destroy();
        guildVoiceSessions.delete(guildId);
        activeVoiceListeners.delete(guildId);
        return interaction.reply('👋 Đã rời khỏi kênh thoại theo yêu cầu!');
      } else {
        return interaction.reply({ content: '⚠️ Bot không còn ở trong phòng thoại nào!', ephemeral: true });
      }
    }

    // Nút điều khiển âm nhạc: Tạm dừng / Tiếp tục
    if (interaction.customId === 'btn_music_toggle') {
      const session = guildVoiceSessions.get(guildId);
      if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
        return interaction.reply({ content: '⚠️ Hiện tại không có bài hát nào đang phát!', ephemeral: true });
      }
      if (session.musicPlayer.state.status === AudioPlayerStatus.Playing) {
        session.musicPlayer.pause();
        return interaction.reply('⏸️ **Đã tạm dừng bài hát!**');
      } else if (session.musicPlayer.state.status === AudioPlayerStatus.Paused) {
        const conn = getVoiceConnection(guildId);
        if (conn) conn.subscribe(session.musicPlayer);
        session.musicPlayer.unpause();
        return interaction.reply('▶️ **Đã tiếp tục phát nhạc!**');
      } else {
        return interaction.reply({ content: '⚠️ Máy phát nhạc đang chuẩn bị, vui lòng thử lại sau vài giây!', ephemeral: true });
      }
    }

    // Nút điều khiển âm nhạc: Bỏ qua bài hát
    if (interaction.customId === 'btn_music_skip') {
      const session = guildVoiceSessions.get(guildId);
      if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
        return interaction.reply({ content: '⚠️ Không có bài hát nào đang phát để bỏ qua!', ephemeral: true });
      }
      const skippedSong = session.musicQueue.currentSong?.title || 'Hiện tại';
      session.musicPlayer.stop();
      return interaction.reply(`⏭️ Đã bỏ qua bài hát: **${skippedSong}**!`);
    }

    // Nút điều khiển âm nhạc: Dừng phát
    if (interaction.customId === 'btn_music_stop') {
      const session = guildVoiceSessions.get(guildId);
      if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
        return interaction.reply({ content: '⚠️ Không có bài hát nào đang phát!', ephemeral: true });
      }
      session.musicQueue.songs = [];
      session.musicQueue.currentSong = null;
      session.musicQueue.isPlaying = false;
      session.musicPlayer.stop();
      return interaction.reply('⏹️ **Đã dừng phát nhạc và làm trống danh sách hàng đợi!**');
    }

    // Nút điều khiển âm nhạc: Xem hàng đợi
    if (interaction.customId === 'btn_music_queue') {
      const session = guildVoiceSessions.get(guildId);
      if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
        return interaction.reply({ content: '📜 Hàng đợi hiện đang trống! Dùng `/play` để thêm bài hát.', ephemeral: true });
      }
      const current = session.musicQueue.currentSong;
      let desc = `**🎶 Đang phát:** [${current.title}](${current.originalUrl}) (\`${current.duration}\`) - <@${current.requestedBy.id}>\n\n**Danh sách chờ:**\n`;
      if (session.musicQueue.songs.length === 0) {
        desc += '*Không có bài hát nào tiếp theo trong hàng đợi.*';
      } else {
        const list = session.musicQueue.songs
          .slice(0, 10)
          .map((s, idx) => `**#${idx + 1}.** [${s.title}](${s.originalUrl}) (\`${s.duration}\`) - <@${s.requestedBy.id}>`);
        desc += list.join('\n');
        if (session.musicQueue.songs.length > 10) {
          desc += `\n*...và còn ${session.musicQueue.songs.length - 10} bài hát khác.*`;
        }
      }
      const embed = new EmbedBuilder()
        .setTitle('📜 HÀNG ĐỢI ÂM NHẠC')
        .setDescription(desc)
        .setColor(0x1DB954)
        .setFooter({ text: `Tổng cộng ${session.musicQueue.songs.length + 1} bài hát` });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const convoId = `user-${interaction.user.id}`;
  const guildId = interaction.guildId;
  const connection = guildId ? getVoiceConnection(guildId) : null;
  const isInVoiceRoom = connection && connection.state.status === VoiceConnectionStatus.Ready;

  // Lệnh /reset
  if (interaction.commandName === 'reset') {
    clearHistory(convoId);
    await interaction.reply({
      content: '🧹 Đã xóa sạch lịch sử hội thoại! Bạn có thể bắt đầu chủ đề mới.',
      ephemeral: true,
    });
    return;
  }

  // Lệnh /mode (Chọn phong cách phản hồi)
  if (interaction.commandName === 'mode') {
    const style = interaction.options.getString('style');
    guildPersonalityModes.set(guildId, style);

    if (style === 'khun') {
      const embed = new EmbedBuilder()
        .setTitle('👑 Phong Cách: Khun Aguero Agnis')
        .setDescription('**Đã kích hoạt chế độ Khun cho toàn bộ Server!**\nTừ giờ tôi sẽ trả lời với tư cách là quý tộc Gia tộc Khun — sắc sảo, tự tin, mưu lược và đầy tính toán.')
        .setColor(0x3498db);
      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('🤖 Phong Cách: AI Tiêu Chuẩn (Standard AI)')
        .setDescription('**Đã tắt chế độ nhập vai cho toàn bộ Server!**\nTừ giờ tôi sẽ hoạt động như một trợ lý AI thuần túy (tương tự ChatGPT/Gemini) — trả lời thẳng thắn, khách quan, chính xác và chuyên nghiệp.')
        .setColor(0x2ecc71);
      await interaction.reply({ embeds: [embed] });
    }
    return;
  }

  // Lệnh /help (Bảng hướng dẫn toàn diện)
  if (interaction.commandName === 'help') {
    const currentMode = guildPersonalityModes.get(guildId) || 'khun';
    const modeName = currentMode === 'khun' ? '👑 Khun Aguero Agnis (Nhập vai)' : '🤖 AI Tiêu Chuẩn (Thuần túy)';

    const embed = new EmbedBuilder()
      .setTitle('📚 BẢNG HƯỚNG DẪN SỬ DỤNG - KHUN AGUERO ARGNIS')
      .setDescription(`Chào mừng bạn! Dưới đây là danh sách đầy đủ tất cả các tính năng thông minh của Bot.\n*Chế độ hiện tại của Server:* **${modeName}**\n*(Dùng lệnh \`/mode\` để chuyển đổi)*`)
      .setColor(0x3498db)
      .addFields(
        {
          name: '🧠 1. HỎI ĐÁP & TRÍ TUỆ NHÂN TẠO',
          value:
            '• `/ask [câu_hỏi] [ảnh]` : Hỏi đáp với AI hoặc phân tích hình ảnh đính kèm.\n' +
            '• `/mode [khun | normal]` : Đổi phong cách trả lời (Nhập vai Khun hoặc AI tiêu chuẩn).\n' +
            '• `/reset` : Xóa lịch sử nhớ ngữ cảnh để bắt đầu cuộc trò chuyện mới.\n' +
            '• **Chat tự nhiên:** Tag `@Khun` hoặc gọi thân mật *"Bot ơi"*, *"Khun ơi"*, *"Trợ lý ơi"*, *"Alo bot"*, bot sẽ phản hồi ngay!',
        },
        {
          name: '🎨 2. VẼ TRANH NGHỆ THUẬT AI',
          value:
            '• `/draw [mô_tả] [phong_cách]` : Vẽ tranh AI đỉnh cao (Anime, 3D, Cyberpunk, Photorealistic).\n' +
            '• **Vẽ qua Chat:** Gõ trực tiếp *"vẽ cho tôi [bức tranh]..."* trong chat, bot tự tạo ảnh HD đính kèm!',
        },
        {
          name: '🎙️ 3. ĐÀM THOẠI GIỌNG NÓI (VOICE AI) & ĐỌC CHAT',
          value:
            '• **Đàm thoại trực tiếp 2 chiều:** Khi bot ở trong phòng voice, bạn chỉ cần nói vào mic *"Khun ơi..."* hoặc *"Bot ơi..."*, bot sẽ lắng nghe và cất giọng trả lời lại ngay!\n' +
            '• `/join` : Mời bot vào kênh thoại bạn đang đứng (tự động bật nghe mic).\n' +
            '• `/leave` : Cho bot rời khỏi kênh thoại.\n' +
            '• `/readchat [on | off]` : Bật/Tắt tự động đọc tin nhắn chat vào phòng thoại.\n' +
            '• `/voice [on | off]` : Bật/Tắt giọng đọc lồng tiếng Nam Minh (tốc độ +12%, trầm -2Hz).',
        },
        {
          name: '🎵 4. ÂM NHẠC ĐỈNH CAO (YOUTUBE & SPOTIFY)',
          value:
            '• `/play [tên_bài_hoặc_link]` : Phát nhạc từ YouTube, Spotify, SoundCloud hoặc tìm kiếm.\n' +
            '• `/pause` & `/resume` : Tạm dừng hoặc tiếp tục bài hát.\n' +
            '• `/skip` : Bỏ qua bài hát hiện tại để phát bài kế tiếp.\n' +
            '• `/stop` : Dừng phát nhạc và xóa sạch toàn bộ hàng đợi.\n' +
            '• `/queue` : Xem danh sách các bài hát đang chờ trong hàng đợi.\n' +
            '• `/nowplaying` : Xem thông tin bài hát đang phát kèm các nút bấm điều khiển tiện lợi!',
        },
        {
          name: '🏰 5. TÒA THÁP (TOWER OF GOD & TIỆN ÍCH)',
          value:
            '• `/profile [user]` : Xem thẻ căn cước Regular, cấp bậc tầng, Shinsu và Vị trí RPG.\n' +
            '• `/setrole [vị_trí]` : Đổi vị trí chiến đấu (Light Bearer, Fisherman, Wave Controller...).\n' +
            '• `/roast [user] [chủ_đề]` : Nhờ Khun phán xét/khịa một ai đó bằng sự sắc sảo.\n' +
            '• `/tactics [game] [role]` : Xem bói tử vi và chiến thuật leo rank đỉnh cao từ quân sư.\n' +
            '• `/remind [thời_gian] [công_việc]` : Hẹn giờ nhắc việc (ví dụ: `10m Nấu cơm`).',
        }
      )
      .setFooter({ text: 'Khun Aguero Agnis • Tower of God AI Assistant' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  // Lệnh /voice
  if (interaction.commandName === 'voice') {
    const state = interaction.options.getString('state');
    isVoiceEnabled = state === 'on';
    await interaction.reply({
      content: isVoiceEnabled
        ? '🎙️ **Đã BẬT** giọng đọc lồng tiếng (Nam Minh Neural - Tốc độ +12%, Pitch -2Hz)!'
        : '🔇 **Đã TẮT** giọng đọc lồng tiếng!',
      ephemeral: true,
    });
    return;
  }

  // Lệnh /readchat
  if (interaction.commandName === 'readchat') {
    const state = interaction.options.getString('state');
    isReadChatEnabled = state === 'on';
    await interaction.reply({
      content: isReadChatEnabled
        ? '📖 **Đã BẬT** chức năng tự đọc tin nhắn chat vào phòng thoại!'
        : '🔇 **Đã TẮT** chức năng tự đọc tin nhắn chat!',
      ephemeral: true,
    });
    return;
  }

  // Lệnh /join
  if (interaction.commandName === 'join') {
    const memberVoiceChannel = interaction.member?.voice?.channel;
    if (!memberVoiceChannel) {
      await interaction.reply({
        content: '⚠️ Bạn phải ở trong một kênh thoại (Voice Channel) trước!',
        ephemeral: true,
      });
      return;
    }

    try {
      const conn = joinVoiceChannel({
        channelId: memberVoiceChannel.id,
        guildId: memberVoiceChannel.guild.id,
        adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
      });

      const session = getOrCreateVoiceSession(memberVoiceChannel.guild.id);
      conn.subscribe(session.player);

      session.boundChannels.add(memberVoiceChannel.id);
      session.boundChannels.add(interaction.channelId);

      const controlEmbed = new EmbedBuilder()
        .setTitle(`🔊 Đã kết nối kênh thoại: ${memberVoiceChannel.name}`)
        .setDescription(
          `**🎙️ Đàm Thoại Trực Tiếp (Tiết kiệm Token):**\n` +
          `• Bấm nút **[🎙️ Nhấn để nói (Hỏi Khun)]** bên dưới hoặc gõ **/talk** để nói chuyện trực tiếp qua mic.\n` +
          `• Bot sẽ lắng nghe 1 câu hỏi của bạn và cất giọng trả lời ngay!\n\n` +
          `**📖 Đọc Chat:** Bot tự động đọc các tin nhắn văn bản gửi trong server vào phòng thoại.`
        )
        .setColor(0x3498db)
        .setFooter({ text: 'Khun Aguero Agnis • Voice Engine' });

      await interaction.reply({
        embeds: [controlEmbed],
        components: [createVoiceControlRow()],
      });
    } catch (err) {
      console.error('Lỗi /join:', err);
      await interaction.reply({ content: `⚠️ Lỗi vào phòng: ${err.message}`, ephemeral: true });
    }
    return;
  }

  // Lệnh /leave
  if (interaction.commandName === 'leave') {
    if (connection) {
      const session = guildVoiceSessions.get(guildId);
      if (session) {
        session.musicPlayer.stop(true);
        session.musicQueue.songs = [];
        session.musicQueue.currentSong = null;
        session.musicQueue.isPlaying = false;
      }
      connection.destroy();
      guildVoiceSessions.delete(guildId);
      activeVoiceListeners.delete(guildId);
      await interaction.reply('👋 Đã rời khỏi kênh thoại!');
    } else {
      await interaction.reply({ content: '⚠️ Bot hiện không ở trong kênh thoại nào!', ephemeral: true });
    }
    return;
  }

  // Lệnh /play (Phát nhạc YouTube / Spotify / SoundCloud)
  if (interaction.commandName === 'play') {
    const memberVoiceChannel = interaction.member?.voice?.channel;
    if (!memberVoiceChannel) {
      return interaction.reply({
        content: '⚠️ Bạn phải ở trong một kênh thoại (Voice Channel) để dùng lệnh phát nhạc!',
        ephemeral: true,
      });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    let conn = getVoiceConnection(guildId);
    const session = getOrCreateVoiceSession(guildId);

    // Tự động kết nối vào kênh voice nếu bot chưa vào
    if (!conn) {
      try {
        conn = joinVoiceChannel({
          channelId: memberVoiceChannel.id,
          guildId: memberVoiceChannel.guild.id,
          adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
        });
        session.boundChannels.add(memberVoiceChannel.id);
        session.boundChannels.add(interaction.channelId);
      } catch (connErr) {
        console.error('Lỗi tự động kết nối voice khi /play:', connErr);
        return interaction.editReply(`⚠️ Không thể kết nối vào phòng thoại: ${connErr.message}`);
      }
    }

    session.musicQueue.textChannel = interaction.channel;

    try {
      const track = await resolveTrackInfo(query, interaction.user);
      if (!track) {
        return interaction.editReply(
          `⚠️ Không tìm thấy bài hát nào cho: **${query.slice(0, 80)}**!\n` +
          `💡 **Gợi ý:** Nếu đây là video clip lạ / cắt ghép trên YouTube (chưa có bản nhạc chính thức), bạn hãy thử tìm bằng cách gõ trực tiếp tên bài hát kèm tên ca sĩ (ví dụ: \`/play tên bài hát\`) nhé!`
        );
      }

      const isCurrentlyPlaying =
        session.musicQueue.isPlaying ||
        session.musicPlayer.state.status === AudioPlayerStatus.Playing ||
        session.musicPlayer.state.status === AudioPlayerStatus.Paused;

      if (isCurrentlyPlaying) {
        session.musicQueue.songs.push(track);
        const queueEmbed = new EmbedBuilder()
          .setTitle('➕ Đã Thêm Vào Hàng Đợi')
          .setDescription(
            `**[${track.title}](${track.originalUrl})**\n` +
            `**Nghệ sĩ:** ${track.artist}\n` +
            `**Thời lượng:** \`${track.duration}\`\n` +
            `**Vị trí chờ:** #${session.musicQueue.songs.length}\n` +
            `**Người yêu cầu:** <@${interaction.user.id}>`
          )
          .setColor(0x1DB954)
          .setThumbnail(track.thumbnail || null);
        return interaction.editReply({ embeds: [queueEmbed] });
      } else {
        session.musicQueue.songs.push(track);
        playNextSongInQueue(guildId);
        return interaction.editReply(`🔎 Đã tìm thấy: **[${track.title}](${track.originalUrl})**! Bắt đầu phát vào phòng thoại...`);
      }
    } catch (err) {
      console.error('Lỗi /play:', err);
      return interaction.editReply(`⚠️ Đã có lỗi xảy ra khi nạp bài hát: ${err.message}`);
    }
  }

  // Lệnh /pause (Tạm dừng nhạc)
  if (interaction.commandName === 'pause') {
    const session = guildVoiceSessions.get(guildId);
    if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
      return interaction.reply({ content: '⚠️ Hiện tại không có bài hát nào đang phát!', ephemeral: true });
    }
    if (session.musicPlayer.state.status === AudioPlayerStatus.Paused) {
      return interaction.reply({ content: '⏸️ Bài hát đã đang tạm dừng rồi!', ephemeral: true });
    }
    session.musicPlayer.pause();
    return interaction.reply('⏸️ **Đã tạm dừng bài hát!** (Dùng `/resume` để tiếp tục)');
  }

  // Lệnh /resume (Tiếp tục phát nhạc)
  if (interaction.commandName === 'resume') {
    const session = guildVoiceSessions.get(guildId);
    if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
      return interaction.reply({ content: '⚠️ Hiện tại không có bài hát nào đang phát!', ephemeral: true });
    }
    if (session.musicPlayer.state.status === AudioPlayerStatus.Playing) {
      return interaction.reply({ content: '▶️ Bài hát đang phát bình thường!', ephemeral: true });
    }
    const conn = getVoiceConnection(guildId);
    if (conn) {
      conn.subscribe(session.musicPlayer);
    }
    session.musicPlayer.unpause();
    return interaction.reply('▶️ **Đã tiếp tục phát nhạc!**');
  }

  // Lệnh /skip (Bỏ qua bài hát)
  if (interaction.commandName === 'skip') {
    const session = guildVoiceSessions.get(guildId);
    if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
      return interaction.reply({ content: '⚠️ Không có bài hát nào đang phát để bỏ qua!', ephemeral: true });
    }
    const skippedTitle = session.musicQueue.currentSong?.title || 'Hiện tại';
    session.musicPlayer.stop();
    return interaction.reply(`⏭️ Đã bỏ qua bài hát: **${skippedTitle}**!`);
  }

  // Lệnh /stop (Dừng phát & làm trống hàng đợi)
  if (interaction.commandName === 'stop') {
    const session = guildVoiceSessions.get(guildId);
    if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
      return interaction.reply({ content: '⚠️ Không có bài hát nào đang phát!', ephemeral: true });
    }
    session.musicQueue.songs = [];
    session.musicQueue.currentSong = null;
    session.musicQueue.isPlaying = false;
    session.musicPlayer.stop();
    return interaction.reply('⏹️ **Đã dừng phát nhạc và làm trống toàn bộ hàng đợi!**');
  }

  // Lệnh /queue (Xem hàng đợi)
  if (interaction.commandName === 'queue') {
    const session = guildVoiceSessions.get(guildId);
    if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
      return interaction.reply({ content: '📜 Hàng đợi hiện đang trống! Hãy dùng `/play` để thêm bài hát.', ephemeral: true });
    }
    const current = session.musicQueue.currentSong;
    let desc = `**🎶 Đang phát:** [${current.title}](${current.originalUrl}) (\`${current.duration}\`) - <@${current.requestedBy.id}>\n\n**Danh sách chờ:**\n`;
    if (session.musicQueue.songs.length === 0) {
      desc += '*Không có bài hát nào tiếp theo trong hàng đợi.*';
    } else {
      const list = session.musicQueue.songs
        .slice(0, 10)
        .map((s, idx) => `**#${idx + 1}.** [${s.title}](${s.originalUrl}) (\`${s.duration}\`) - <@${s.requestedBy.id}>`);
      desc += list.join('\n');
      if (session.musicQueue.songs.length > 10) {
        desc += `\n*...và còn ${session.musicQueue.songs.length - 10} bài hát khác.*`;
      }
    }
    const embed = new EmbedBuilder()
      .setTitle('📜 HÀNG ĐỢI ÂM NHẠC')
      .setDescription(desc)
      .setColor(0x1DB954)
      .setFooter({ text: `Tổng cộng ${session.musicQueue.songs.length + 1} bài hát` });
    return interaction.reply({ embeds: [embed] });
  }

  // Lệnh /nowplaying (Xem thông tin bài hát đang phát)
  if (interaction.commandName === 'nowplaying') {
    const session = guildVoiceSessions.get(guildId);
    if (!session || (!session.musicQueue.isPlaying && !session.musicQueue.currentSong)) {
      return interaction.reply({ content: '⚠️ Hiện tại không có bài hát nào đang phát!', ephemeral: true });
    }
    const current = session.musicQueue.currentSong;
    const embed = createNowPlayingEmbed(current);
    const row = createMusicControlRow();
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // Lệnh /talk (Nói chuyện trực tiếp qua mic - Tiết kiệm Token)
  if (interaction.commandName === 'talk') {
    const memberVoiceChannel = interaction.member?.voice?.channel;
    if (!memberVoiceChannel) {
      await interaction.reply({
        content: '⚠️ Bạn phải ở trong cùng kênh thoại với bot để nói chuyện!',
        ephemeral: true,
      });
      return;
    }
    await startOnDemandVoiceTalk(interaction, guildId, memberVoiceChannel);
    return;
  }

  // Lệnh /draw (Vẽ tranh AI)
  if (interaction.commandName === 'draw') {
    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style') || '';

    await interaction.deferReply();

    try {
      const buffer = await generateAIImageBuffer(prompt, style);
      if (!buffer || buffer.length === 0) {
        throw new Error('Dữ liệu ảnh nhận về bị rỗng.');
      }

      const attachment = new AttachmentBuilder(buffer, { name: 'art.jpg' });
      const embed = new EmbedBuilder()
        .setTitle(`🎨 Tác Phẩm AI: ${prompt.slice(0, 50)}`)
        .setDescription(`**Người yêu cầu:** <@${interaction.user.id}>\n**Phong cách:** ${style || 'Tự do'}`)
        .setImage('attachment://art.jpg')
        .setColor(0x3498db)
        .setFooter({ text: 'Khun Aguero Agnis • AI Image Engine' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error('Lỗi /draw:', err);
      await interaction.editReply(`⚠️ Không thể tạo ảnh: ${err.message || 'Vui lòng thử lại sau!'}`);
    }
    return;
  }

  // Lệnh /roast (Khun Phán Xét)
  if (interaction.commandName === 'roast') {
    const target = interaction.options.getUser('target') || interaction.user;
    const topic = interaction.options.getString('topic') || 'độ ngơ ngác và phong cách sinh tồn trong Tòa Tháp';

    await interaction.deferReply();

    try {
      const roastPrompt = `Bạn là Khun Aguero Agnis (quý tộc mưu lược, sắc sảo và độc miệng).
Hãy đưa ra một lời phán xét/khịa (roast) cực kỳ thâm thúy, thông minh, mỉa mai sâu cay nhưng phong thái lịch thiệp dành cho người có tên là "${target.username}" về chủ đề: "${topic}".
Dài khoảng 2 đến 3 câu bằng tiếng Việt.`;

      const roastText = await callGemini([{ role: 'user', parts: [{ text: roastPrompt }] }]);

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(roastText);
      }

      if (isInVoiceRoom && audioBuffer) {
        queueAudio(guildId, audioBuffer);
        await interaction.editReply(`⚖️ **Khun Phán Xét** <@${target.id}>:\n> ${roastText}`);
      } else if (audioBuffer && !isInVoiceRoom) {
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'khun_roast.mp3' });
        await interaction.editReply({
          content: `⚖️ **Khun Phán Xét** <@${target.id}>:\n> ${roastText}`,
          files: [voiceAttachment],
        });
      } else {
        await interaction.editReply(`⚖️ **Khun Phán Xét** <@${target.id}>:\n> ${roastText}`);
      }
    } catch (err) {
      console.error('Lỗi /roast:', err);
      await interaction.editReply(`⚠️ Lỗi phán xét: ${err.message}`);
    }
    return;
  }

  // Lệnh /tactics (Chiến thuật & Tử vi Game)
  if (interaction.commandName === 'tactics') {
    const game = interaction.options.getString('game');
    const role = interaction.options.getString('role') || 'người gánh đội';

    await interaction.deferReply();

    try {
      const tacticsPrompt = `Bạn là Khun Aguero Agnis, Light Bearer kiêm quân sư tối cao.
Người chơi chuẩn bị bước vào trận game "${game}" ở vị trí "${role}".
Hãy bói toán vận mệnh tử vi hôm nay và đưa ra lời khuyên chiến thuật xảo quyệt, hài hước, mưu mô để giành chiến thắng.
Dài khoảng 3 câu bằng tiếng Việt.`;

      const tacticsText = await callGemini([{ role: 'user', parts: [{ text: tacticsPrompt }] }]);

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(tacticsText);
      }

      if (isInVoiceRoom && audioBuffer) {
        queueAudio(guildId, audioBuffer);
        await interaction.editReply(`🔮 **Hải Đăng Soi Kèo [${game}]**:\n> ${tacticsText}`);
      } else if (audioBuffer && !isInVoiceRoom) {
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'khun_tactics.mp3' });
        await interaction.editReply({
          content: `🔮 **Hải Đăng Soi Kèo [${game}]**:\n> ${tacticsText}`,
          files: [voiceAttachment],
        });
      } else {
        await interaction.editReply(`🔮 **Hải Đăng Soi Kèo [${game}]**:\n> ${tacticsText}`);
      }
    } catch (err) {
      console.error('Lỗi /tactics:', err);
      await interaction.editReply(`⚠️ Lỗi chiến thuật: ${err.message}`);
    }
    return;
  }

  // Lệnh /remind (Báo thức & Nhắc lịch)
  if (interaction.commandName === 'remind') {
    const timeStr = interaction.options.getString('time');
    const task = interaction.options.getString('task');
    const ms = parseDuration(timeStr);

    if (!ms) {
      await interaction.reply({
        content: '⚠️ Định dạng thời gian không đúng! Hãy dùng ví dụ: `30s` (giây), `10m` (phút), hoặc `1h` (tiếng).',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(`⏰ Đã đặt lịch! Tôi sẽ nhắc bạn **"${task}"** sau **${timeStr}**.`);

    const userToRemind = interaction.user;
    const channelToRemind = interaction.channel;
    const currentGuildId = interaction.guildId;

    setTimeout(async () => {
      try {
        const reminderText = `Này <@${userToRemind.id}>, đã hết ${timeStr} rồi đấy! Việc cần làm: **${task}**!`;
        if (channelToRemind) {
          await channelToRemind.send(`⏰ ${reminderText}`).catch(() => {});
        }

        // Nếu bot đang trong phòng thoại, nói to nhắc nhở!
        const voiceConn = currentGuildId ? getVoiceConnection(currentGuildId) : null;
        if (voiceConn && isVoiceEnabled) {
          const spokenReminder = `Này ${userToRemind.displayName || userToRemind.username}, đã hết giờ rồi đấy. Mau đi ${task} đi!`;
          const audioBuf = await generateAudioBuffer(spokenReminder);
          if (audioBuf) {
            queueAudio(currentGuildId, audioBuf);
          }
        }
      } catch (remindErr) {
        console.error('Lỗi gửi nhắc nhở:', remindErr);
      }
    }, ms);
    return;
  }

  // Lệnh /profile (Hồ sơ Người Leo Tháp)
  if (interaction.commandName === 'profile') {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const profile = getProfile(targetUser.id);

    const embed = new EmbedBuilder()
      .setTitle(`📜 THẺ CĂN CƯỚC REGULAR: ${targetUser.username.toUpperCase()}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0x2ecc71)
      .addFields(
        { name: '🏰 Tầng Hiện Tại', value: `Tầng ${profile.floor}`, inline: true },
        { name: '⚔️ Vị Trí Chiến Đấu', value: `${profile.position}`, inline: true },
        { name: '✨ Điểm Shinsu (EXP)', value: `${profile.shinsu} EXP`, inline: true },
        { name: '🏅 Danh Hiệu', value: `${profile.title}`, inline: false }
      )
      .setFooter({ text: 'Gia tộc Khun • Tòa Tháp Sinh Tử' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  // Lệnh /setrole (Chọn Vị Trí)
  if (interaction.commandName === 'setrole') {
    const newPos = interaction.options.getString('position');
    const profile = getProfile(interaction.user.id);
    profile.position = newPos;

    await interaction.reply({
      content: `✅ Bạn đã đổi vị trí chiến đấu thành công: **${newPos}**! Hãy luyện tập Shinsu để leo tầng tiếp theo.`,
      ephemeral: true,
    });
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
      const replyText = await callGemini(getHistory(convoId), null, guildId);
      addToHistory(convoId, 'model', [{ text: replyText }]);

      const chunks = splitMessage(replyText);

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(replyText);
      }

      if (isInVoiceRoom && audioBuffer) {
        queueAudio(guildId, audioBuffer);
        await interaction.editReply({ content: chunks[0] });
      } else if (audioBuffer && !isInVoiceRoom) {
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
// 9. XỬ LÝ CHAT TRỰC TIẾP, ĐỌC TIN NHẮN VOICE & CỘNG ĐIỂM RPG
// ==========================================
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    // Cộng điểm Shinsu EXP khi chat
    addShinsuExp(message.author.id, 5);

    const guildId = message.guildId;
    const connection = guildId ? getVoiceConnection(guildId) : null;
    const isInVoiceRoom = connection && connection.state.status === VoiceConnectionStatus.Ready;
    const isBotMentioned = message.mentions.has(client.user.id);
    const isDirectMessage = !message.guild;

    // ĐỌC TIN NHẮN VÀO PHÒNG THOẠI (TTS CHAT READER)
    const wakeWordRegex = /^(bot ơi|khun ơi|khung ơi|khôn ơi|khum ơi|trợ lý ơi|ê bot|alo bot)[\s,:]*/i;
    const isWakeWord = wakeWordRegex.test(message.content);

    if (isInVoiceRoom && isReadChatEnabled && !isBotMentioned && !isWakeWord && !isDirectMessage) {
      const session = guildVoiceSessions.get(guildId);
      const isMusicPlaying = session && session.musicQueue && (session.musicQueue.isPlaying || session.musicPlayer.state.status === AudioPlayerStatus.Playing);
      const isTargetChannel = session && (session.boundChannels.has(message.channelId) || session.boundChannels.size === 0);

      if (isTargetChannel && !isMusicPlaying) {
        const senderName = message.member?.displayName || message.author.displayName || message.author.username;
        const cleanText = cleanTextForTTS(message.content);

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

        let finalSpokenText = '';
        if (fileAnnouncement && cleanText) {
          finalSpokenText = `${cleanText}. ${fileAnnouncement}.`;
        } else if (fileAnnouncement) {
          finalSpokenText = `${fileAnnouncement}.`;
        } else if (cleanText && cleanText.length >= 1) {
          finalSpokenText = cleanText;
        }

        if (finalSpokenText) {
          const audioBuffer = await generateAudioBuffer(finalSpokenText);
          if (audioBuffer) {
            queueAudio(guildId, audioBuffer);
          }
          return;
        }
      }
    }

    // HỎI ĐÁP VỚI AI KHI ĐƯỢC TAG, TRONG DM HOẶC GỌI TÊN TỰ NHIÊN
    if (!isDirectMessage && !isBotMentioned && !isWakeWord) return;

    const cleanText = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .replace(wakeWordRegex, '')
      .trim();
    const convoId = `user-${message.author.id}`;

    if (cleanText.toLowerCase() === 'reset' || cleanText.toLowerCase() === '!reset') {
      clearHistory(convoId);
      await message.reply('🧹 Đã xóa lịch sử hội thoại của bạn! Hãy bắt đầu chủ đề mới nhé.');
      return;
    }

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

    // TỰ ĐỘNG PHÁT HIỆN YÊU CẦU VẼ TRANH TRONG CHAT THƯỜNG (Không cần gõ /draw)
    const lowerClean = cleanText.toLowerCase();
    const isDrawRequest = 
      lowerClean.startsWith('vẽ ') || 
      lowerClean.startsWith('ve ') || 
      lowerClean.startsWith('draw ') || 
      lowerClean.includes('vẽ cho tôi') || 
      lowerClean.includes('vẽ giúp') || 
      lowerClean.includes('vẽ một') || 
      lowerClean.includes('vẽ bức tranh');

    if (isDrawRequest && imageAttachments.size === 0) {
      const promptToDraw = cleanText
        .replace(/^(hãy |xin |làm ơn |nhờ bạn )?(vẽ cho tôi|vẽ giúp tôi|vẽ hộ tôi|vẽ giúp|vẽ một bức tranh|vẽ bức tranh|vẽ một|vẽ tranh|vẽ|ve|draw)\s*/i, '')
        .trim();

      if (promptToDraw.length > 1) {
        await message.channel.sendTyping();
        try {
          const buffer = await generateAIImageBuffer(promptToDraw, '');
          if (buffer && buffer.length > 0) {
            const attachment = new AttachmentBuilder(buffer, { name: 'art.jpg' });
            const embed = new EmbedBuilder()
              .setTitle(`🎨 Tác Phẩm AI: ${promptToDraw.slice(0, 50)}`)
              .setDescription(`**Người yêu cầu:** <@${message.author.id}>`)
              .setImage('attachment://art.jpg')
              .setColor(0x3498db)
              .setFooter({ text: 'Khun Aguero Agnis • AI Image Engine' })
              .setTimestamp();

            await message.reply({ embeds: [embed], files: [attachment] });
            return;
          }
        } catch (err) {
          console.error('Lỗi vẽ ảnh qua chat:', err);
          await message.reply(`⚠️ Không thể tạo ảnh: ${err.message || 'Đã có lỗi xảy ra.'}`);
          return;
        }
      }
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
    const replyText = await callGemini(getHistory(convoId), null, guildId);
    clearInterval(typingInterval);

    addToHistory(convoId, 'model', [{ text: replyText }]);

    const chunks = splitMessage(replyText);

    let audioBuffer = null;
    if (isVoiceEnabled) {
      audioBuffer = await generateAudioBuffer(replyText);
    }

    if (isInVoiceRoom && audioBuffer) {
      queueAudio(guildId, audioBuffer);
      await message.reply(chunks[0]);
    } else if (audioBuffer && !isInVoiceRoom) {
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
// 10. ĐĂNG NHẬP BOT
// ==========================================
const token = (process.env.DISCORD_TOKEN || '').replace(/^["']|["']$/g, '').trim();
console.log(`🔄 Bắt đầu kết nối tới Discord Gateway (IPv4, Token độ dài: ${token.length})...`);
loginStatus = 'Đang gọi client.login()...';

client.login(token)
  .then(() => {
    loginStatus = 'Xác thực thành công, đang đợi Gateway Ready...';
    console.log('✅ client.login() hoàn tất xác thực với Discord!');
  })
  .catch((err) => {
    loginStatus = 'Đăng nhập thất bại';
    loginError = err.message || String(err);
    console.error('❌ Lỗi đăng nhập Discord:', err.message);
  });
