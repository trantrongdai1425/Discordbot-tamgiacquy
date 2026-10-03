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

try {
  const ffmpeg = require('ffmpeg-static');
  if (ffmpeg && !process.env.FFMPEG_PATH) {
    process.env.FFMPEG_PATH = ffmpeg;
  }
} catch (e) {
  // Bỏ qua nếu ffmpeg-static không tải được
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

// Health-check server để treo trên Cloud 24/7 (Render, Koyeb, Railway, UptimeRobot)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  if (req.method === 'HEAD') {
    return res.end();
  }
  const rawToken = (process.env.DISCORD_TOKEN || '').trim();
  const tokenMask = rawToken.length > 10 ? `${rawToken.slice(0, 6)}...${rawToken.slice(-6)} (len: ${rawToken.length})` : `(len: ${rawToken.length})`;
  const isReady = typeof client !== 'undefined' && client && typeof client.isReady === 'function' && client.isReady();
  const statusStr = isReady ? `🟢 ONLINE (${client.user?.tag})` : `🟡 CHƯA SẴN SÀNG (${loginStatus})`;

  let out = `🤖 J.A.R.V.I.S. - Avengers AI System (Stark Industries) đang chạy 24/7!\n`;
  out += `Trạng thái: ${statusStr}\n`;
  out += `Token Render: ${tokenMask}\n`;
  out += `API Probe: ${apiCheckResult}\n`;
  if (lastReadyTime) out += `Online lúc: ${lastReadyTime}\n`;
  if (loginError) out += `Lỗi kết nối: ${loginError}\n`;
  if (recentDebugLogs.length > 0) {
    out += `\nNhật ký Gateway (5 gần nhất):\n${recentDebugLogs.slice(-5).join('\n')}\n`;
  }
  res.end(out);
}).listen(PORT, '0.0.0.0', () => {
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
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const SYSTEM_PROMPT_JARVIS = `Bạn là J.A.R.V.I.S. (Just A Rather Very Intelligent System), siêu trí tuệ nhân tạo do ngài Tony Stark (Iron Man) chế tạo, hiện đang quản lý hệ thống máy chủ và hỗ trợ các thành viên.
Phong cách giao tiếp của bạn:
- Luôn giữ thái độ điềm tĩnh, lịch lãm, trung thành và hóm hỉnh theo phong cách quý ông Anh quốc (subtle British wit).
- Luôn xưng hô với người dùng là "thưa ngài" (Sir) hoặc xưng tên của họ kèm "thưa ngài", tự xưng là "tôi" hoặc "JARVIS".
- Trả lời thông minh, phân tích dữ liệu sắc bén, mạch lạc, tự nhiên và hữu ích bằng tiếng Việt.
- Nếu người dùng đính kèm hình ảnh, hãy kích hoạt cảm biến thị giác quang học để phân tích chi tiết và đưa ra báo cáo chính xác nhất.
- LƯU Ý ĐẶC BIỆT VỀ ÂM NHẠC: Khi người dùng yêu cầu bật/mở/phát nhạc hoặc gợi ý nhạc, hãy đáp lại theo phong thái lịch lãm của JARVIS (ví dụ: "Rất sẵn lòng, thưa ngài. Đang nạp danh sách âm thanh...") và chèn cú pháp [PLAY: tên bài hát hoặc ca sĩ] vào cuối câu trả lời (ví dụ: [PLAY: Nơi này có anh Sơn Tùng]). Hệ thống bot sẽ tự động tìm kiếm nguồn nhạc và phát bài đó vào phòng thoại!`;

const SYSTEM_PROMPT_NORMAL = `Bạn là một trợ lý AI thông minh, hữu ích, khách quan, chính xác và chuyên nghiệp.
Hãy trả lời câu hỏi của người dùng một cách trực tiếp, mạch lạc, ngắn gọn và hữu ích bằng tiếng Việt.
Không cần xưng hô theo bất kỳ nhân vật hư cấu nào. Trả lời một cách chuẩn mực, khách quan như một mô hình ngôn ngữ lớn (LLM).
Nếu người dùng đính kèm hình ảnh, hãy quan sát kỹ lưỡng và đưa ra phân tích chính xác nhất.
LƯU Ý ĐẶC BIỆT VỀ ÂM NHẠC: Khi người dùng yêu cầu bật/mở/phát nhạc hoặc nhờ gợi ý nhạc, hãy chèn cú pháp [PLAY: tên bài hát hoặc ca sĩ] vào cuối câu trả lời. Hệ thống bot sẽ tự động tìm kiếm nguồn nhạc và phát bài đó vào phòng thoại!`;

// Map lưu chế độ phong cách phản hồi theo từng Server (Guild)
const guildPersonalityModes = new Map();

function getSystemPrompt(guildId) {
  const mode = guildPersonalityModes.get(guildId) || 'jarvis';
  return mode === 'jarvis' ? SYSTEM_PROMPT_JARVIS : SYSTEM_PROMPT_NORMAL;
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
  if (!text || typeof text !== 'string') return '';
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

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-tts-'));
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
const activeQuizzes = new Map();

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
  if (!rawTitle || typeof rawTitle !== 'string') return '';
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
  if (!query || typeof query !== 'string') return null;
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
    let decodedTitle = filename;
    try {
      decodedTitle = decodeURIComponent(filename);
    } catch (_) {}
    return {
      title: decodedTitle,
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
  const reqText = song.requestedBy?.id
    ? `<@${song.requestedBy.id}>`
    : (song.requestedBy?.username || 'Thành viên');
  const safeTitle = (song.title || 'Bài hát').replace(/[\[\]]/g, '').slice(0, 80);

  const embed = new EmbedBuilder()
    .setTitle(`🎶 Đang Phát: ${safeTitle}`)
    .setDescription(
      `**Ca sĩ / Nghệ sĩ:** ${song.artist || 'Không rõ'}\n` +
      `**Thời lượng:** \`${song.duration || 'N/A'}\`\n` +
      `**Người yêu cầu:** ${reqText}\n` +
      `**Nguồn bài:** [Nhấn vào đây để xem](${song.originalUrl || song.url})`
    )
    .setColor(0x1DB954)
    .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries Audio Engine' })
    .setTimestamp();

  if (song.thumbnail && typeof song.thumbnail === 'string' && song.thumbnail.startsWith('http')) {
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
        if (session.isMusicPausedForTTS) {
          const shouldResume = session.musicQueue.isPlaying;
          session.isMusicPausedForTTS = false;
          if (shouldResume) {
            const connection = getVoiceConnection(guildId);
            if (connection) {
              connection.subscribe(session.musicPlayer);
              session.musicPlayer.unpause();
            }
          }
        }
      }
    });

    player.on('error', (err) => {
      console.error(`[TTS Player Error ${guildId}]:`, err.message);
      session.isPlaying = false;
      if (session.queue.length > 0) {
        playNextInQueue(guildId);
      } else if (session.isMusicPausedForTTS) {
        const shouldResume = session.musicQueue.isPlaying;
        session.isMusicPausedForTTS = false;
        if (shouldResume) {
          const connection = getVoiceConnection(guildId);
          if (connection) {
            connection.subscribe(session.musicPlayer);
            session.musicPlayer.unpause();
          }
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

// Trích xuất tên bài hát từ câu nói tự nhiên (Fallback regex)
function extractMusicQuery(text) {
  let t = text.trim()
    .replace(/^(?:jarvis ơi|javis ơi|jarvis|javis|alo jarvis|alo javis|ê jarvis|ê javis|bot ơi|trợ lý ơi|ê bot|alo bot)[\s,:]*/i, '')
    .trim();

  const linkMatch = t.match(/https?:\/\/\S+/i);
  if (linkMatch && /(?:bật|mở|phát|play|nghe|chơi)/i.test(t)) {
    return linkMatch[0];
  }

  // Loại bỏ các đoạn chú thích trong ngoặc đơn hoặc ngoặc vuông
  const textWithoutBrackets = t.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();

  const patterns = [
    /^(?:hãy\s+)?(?:bật|mở|phát|chơi|nghe|cho\s+nghe|play)\s*(?:giúp|hộ)?\s*(?:cho\s*(?:tôi|tao|mình|anh|em)\s*)?(?:bài\s*hát|bài\s*nhạc|bản\s*nhạc|ca\s*khúc|bài|nhạc|track)?\s*:?\s*(.+)$/i,
    /(?:bật|mở|phát|chơi|play)\s*(?:giúp|hộ)?\s*(?:cho\s*(?:tôi|tao|mình|anh|em)\s*)?(?:bài\s*hát|bài\s*nhạc|bản\s*nhạc|ca\s*khúc|bài|nhạc)\s+([^.,!?\n]+)/i,
    /(?:muốn\s*nghe|thích\s*nghe)\s*(?:bài\s*hát|bài\s*nhạc|bài|nhạc)?\s+([^.,!?\n]+)/i,
  ];

  for (const p of patterns) {
    const match = textWithoutBrackets.match(p) || t.match(p);
    if (match && match[1]) {
      let song = match[1]
        .replace(/(?:\s+(?:giúp|hộ)\s*(?:tôi|tao|mình|em|anh)?|\s+(?:đi\s*jarvis|đi\s*javis|nhé\s*jarvis|nhé\s*javis|đi\s*bot|nhé\s*bot|với\s*nào|nha|nhé|nhe|đi|với|hộ|giúp))+$/gi, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
      song = song.replace(/^(?:bài\s*hát|bài\s*nhạc|bản\s*nhạc|ca\s*khúc|bài|nhạc)\s+/i, '').trim();
      if (song.length >= 2 && song.toLowerCase() !== 'nhạc' && song.toLowerCase() !== 'bài hát') {
        return song;
      }
    }
  }
  return null;
}

// Bộ máy phân tích âm nhạc bằng AI (AI Music Intent & List Extractor)
async function extractMusicListWithAI(text) {
  const hasMusicIntent = /(?:bật|mở|phát|chơi|nghe|cho\s+nghe|play|nhạc|bài\s*hát|ca\s*khúc|track|playlist|album)/i.test(text);
  if (!hasMusicIntent) return [];

  // Nếu là link trực tiếp, lấy ngay link
  const linkMatch = text.match(/https?:\/\/\S+/i);
  if (linkMatch && /(?:bật|mở|phát|play|nghe|chơi)/i.test(text)) {
    return [linkMatch[0]];
  }

  const systemPrompt = `Bạn là bộ máy phân tích yêu cầu âm nhạc của bot Discord.
Nhiệm vụ: Phân tích xem người dùng có đang yêu cầu bật nhạc/nghe nhạc hay không.
Nếu CÓ:
- Trích xuất danh sách tên các bài hát sạch sẽ (BẮT BUỘC loại bỏ hoàn toàn các lời giải thích, chú thích trong ngoặc đơn, phim ảnh, cảm xúc, văn cảnh, dấu gạch nối mô tả...).
- Nếu người dùng đưa cả một danh sách nhiều bài, hãy trích xuất toàn bộ các bài theo thứ tự.
- Xuất kết quả dưới dạng JSON array: ["Tên bài 1", "Tên bài 2", ...]
Nếu KHÔNG yêu cầu bật nhạc (ví dụ nói chuyện phiếm, hỏi toán, vẽ tranh...): Xuất mảng rỗng []`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: text }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) continue;

      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => String(s).trim()).filter((s) => s.length >= 2);
      }
      return [];
    } catch (_) {
      // Thử model kế tiếp
    }
  }

  // Fallback: nếu AI bận thì dùng regex
  const fallbackSong = extractMusicQuery(text);
  return fallbackSong ? [fallbackSong] : [];
}

// Phát danh sách bài hát theo yêu cầu tự nhiên (hỗ trợ cả 1 bài hoặc nhiều bài/playlist)
async function playMultipleSongsFromNaturalRequest(songList, member, channel, spokenReply = null) {
  if (!member || !songList || songList.length === 0) return false;
  const guildId = member.guild?.id;
  if (!guildId) return false;

  const voiceChannel = member.voice?.channel;
  if (!voiceChannel) {
    if (channel) {
      await channel.send({
        content: `⚠️ <@${member.id}> ơi, bạn phải tham gia vào một kênh thoại (Voice Channel) trước thì tôi mới bật nhạc cho bạn nghe được chứ!`,
      }).catch(() => {});
    }
    return false;
  }

  let conn = getVoiceConnection(guildId);
  const session = getOrCreateVoiceSession(guildId);

  // Tự động kết nối vào kênh voice nếu bot chưa vào
  if (!conn) {
    try {
      conn = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      session.boundChannels.add(voiceChannel.id);
      if (channel) session.boundChannels.add(channel.id);
    } catch (connErr) {
      console.error('Lỗi kết nối voice tự động:', connErr);
      if (channel) {
        channel.send(`⚠️ Không thể kết nối vào phòng thoại: ${connErr.message}`).catch(() => {});
      }
      return false;
    }
  }

  if (channel) {
    session.musicQueue.textChannel = channel;
  }

  // NẾU HIỆN TẠI KHÔNG CÓ BÀI HÁT NÀO ĐANG PHÁT:
  // Đảm bảo dọn sạch danh sách cũ bị kẹt để nạp danh sách mới sạch sẽ 100%!
  const isActuallyPlaying =
    session.musicPlayer.state.status === AudioPlayerStatus.Playing ||
    session.musicPlayer.state.status === AudioPlayerStatus.Paused;

  if (!isActuallyPlaying) {
    session.musicQueue.songs = [];
    session.musicQueue.currentSong = null;
    session.musicQueue.isPlaying = false;
  }

  const firstQuery = songList[0];
  let statusMsg = null;
  if (channel) {
    const listSummary = songList.length > 1 ? ` (Danh sách gồm ${songList.length} bài hát)` : '';
    statusMsg = await channel.send(`🔎 **AI Auto-DJ:** Đang phân tích và nạp nhạc cho: **${firstQuery}**${listSummary}...`).catch(() => null);
  }

  try {
    const firstTrack = await resolveTrackInfo(firstQuery, member.user);
    if (!firstTrack) {
      const notFoundMsg = `⚠️ Không tìm thấy nguồn phát cho bài: **${firstQuery}**! Hãy thử với tên bài cụ thể hơn nhé.`;
      if (statusMsg) await statusMsg.edit(notFoundMsg).catch(() => {});
      else if (channel) await channel.send(notFoundMsg).catch(() => {});
      return false;
    }

    // Nếu có lời thoại AI, đọc trước bằng TTS trước khi phát nhạc
    if (spokenReply && isVoiceEnabled) {
      const speechAudio = await generateAudioBuffer(spokenReply);
      if (speechAudio) {
        queueAudio(guildId, speechAudio);
      }
    }

    session.musicQueue.songs.push(firstTrack);

    // Kích hoạt phát bài đầu tiên nếu máy phát đang rảnh
    if (!isActuallyPlaying && !session.musicQueue.isPlaying) {
      playNextSongInQueue(guildId);
    }

    // Nạp tiếp các bài tiếp theo trong danh sách (Playlist)
    const addedTracks = [firstTrack];
    if (songList.length > 1) {
      for (let i = 1; i < songList.length; i++) {
        const nextQuery = songList[i];
        try {
          const nextTrack = await resolveTrackInfo(nextQuery, member.user);
          if (nextTrack) {
            session.musicQueue.songs.push(nextTrack);
            addedTracks.push(nextTrack);

            // Tự động kích hoạt phát tiếp nếu máy phát bị rảnh
            if (!session.musicQueue.isPlaying && session.musicQueue.songs.length > 0) {
              playNextSongInQueue(guildId);
            }
          }
        } catch (_) {}
      }
    }

    // Đảm bảo sau khi nạp xong toàn bộ danh sách, nếu nhạc chưa chạy thì BẮT BUỘC chạy!
    if (!session.musicQueue.isPlaying && session.musicQueue.songs.length > 0) {
      playNextSongInQueue(guildId);
    }

    if (statusMsg) {
      if (addedTracks.length === 1) {
        if (!isActuallyPlaying) {
          await statusMsg.edit(`🎶 Đã tìm thấy và đang phát: **[${firstTrack.title}](${firstTrack.originalUrl})** theo yêu cầu của <@${member.id}>!`).catch(() => {});
        } else {
          await statusMsg.edit(`➕ Đã thêm vào hàng đợi: **[${firstTrack.title}](${firstTrack.originalUrl})** (Vị trí #${session.musicQueue.songs.length}) theo yêu cầu của <@${member.id}>!`).catch(() => {});
        }
      } else {
        const listText = addedTracks.map((t, idx) => `**#${idx + 1}.** [${t.title}](${t.originalUrl}) (\`${t.duration}\`)`).join('\n');
        const playlistEmbed = new EmbedBuilder()
          .setTitle(`🎶 AI Đã Tự Động Nạp ${addedTracks.length} Bài Hát Vào Hàng Đợi!`)
          .setDescription(listText)
          .setColor(0x1DB954)
          .setFooter({ text: `Yêu cầu bởi ${member.displayName || member.user.username}` });
        await statusMsg.edit({ content: null, embeds: [playlistEmbed] }).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.error('Lỗi phát nhạc AI tự động:', err);
    if (statusMsg) {
      await statusMsg.edit(`⚠️ Có lỗi khi bật nhạc: ${err.message}`).catch(() => {});
    }
    return false;
  }
}

// Alias tương thích
async function playMusicFromNaturalRequest(query, member, channel, spokenReply = null) {
  return playMultipleSongsFromNaturalRequest([query], member, channel, spokenReply);
}

function playNextInQueue(guildId) {
  const session = guildVoiceSessions.get(guildId);
  if (!session || session.isPlaying || session.queue.length === 0) return;

  const audioBuffer = session.queue.shift();
  session.isPlaying = true;

  const connection = getVoiceConnection(guildId);
  if (connection) {
    // Nếu nhạc đang phát, tạm dừng để nhường mic cho JARVIS nói
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
      .setLabel('🎙️ Nhấn để nói (Hỏi JARVIS)')
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
  const currentMode = guildPersonalityModes.get(guildId) || 'jarvis';
  let personalityInstruction = '';
  if (currentMode === 'jarvis') {
    personalityInstruction = 'Trả lời bằng phong cách J.A.R.V.I.S. (siêu trí tuệ nhân tạo của Tony Stark: lịch lãm, điềm đạm, xưng "thưa ngài/Sir", hóm hỉnh kiểu Anh quốc, ngắn gọn 1-2 câu).';
  } else {
    personalityInstruction = 'Trả lời như một trợ lý AI chuẩn mực, ngắn gọn, thẳng thắn, khách quan và lịch thiệp trong 1-2 câu.';
  }

  const prompt = `Bạn đang lắng nghe câu hỏi trực tiếp bằng giọng nói của thành viên trong phòng voice Discord.
QUY TẮC:
1. Nếu người nói yêu cầu bật/mở/phát bài hát (ví dụ: "bật bài...", "mở bài...", "cho nghe bài..."), hãy trả lời ngắn gọn 1 câu tự nhiên và chèn cú pháp [PLAY: tên bài hát hoặc ca sĩ] ở cuối câu.
2. Nếu là câu hỏi bình thường, hãy nghe câu hỏi trong đoạn âm thanh và trả lời lại bằng tiếng Việt trong 1-2 câu ngắn gọn, thông minh, tự nhiên để đọc to qua mic. ${personalityInstruction}`;

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

      const playMatch = answer.match(/\[PLAY:\s*([^\]]+)\]/i);
      const cleanAnswer = answer.replace(/\[PLAY:\s*[^\]]+\]/gi, '').trim();

      const audioBuffer = await generateAudioBuffer(cleanAnswer || 'Được rồi, tôi đang mở bài đó cho bạn.');
      if (audioBuffer) {
        queueAudio(guildId, audioBuffer);
      }

      if (playMatch && playMatch[1]) {
        const guild = client.guilds.cache.get(guildId);
        const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
        if (member) {
          const session = guildVoiceSessions.get(guildId);
          const channel = session?.musicQueue?.textChannel || null;
          playMusicFromNaturalRequest(playMatch[1].trim(), member, channel);
        }
      }
      return;
    } catch (e) {
      console.warn(`⚠️ Lỗi model ${model} khi phân tích voice:`, e.message);
    }
  }
}

async function startOnDemandVoiceTalk(interaction, guildId, _memberVoiceChannel) {
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

  // Lắng nghe stream từ người dùng này
  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1200,
    },
  });

  const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const pcmChunks = [];

  const cleanupStreams = () => {
    try {
      opusStream.destroy();
      decoder.destroy();
    } catch (_) {}
  };

  const timeoutId = setTimeout(() => {
    if (!hasReceivedAudio) {
      activeVoiceListeners.delete(guildId);
      cleanupStreams();
      interaction.followUp({
        content: `⏳ Đã hết 10 giây chờ (chưa nhận thấy câu hỏi). Hãy bấm lại khi sẵn sàng nhé!`,
        ephemeral: true,
      }).catch(() => {});
    }
  }, 12000);

  activeVoiceListeners.set(guildId, { userId, timeoutId });

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
    cleanupStreams();

    const pcmBuffer = Buffer.concat(pcmChunks);
    if (pcmBuffer.length < 100000) {
      interaction.followUp({
        content: `⏳ Âm thanh quá ngắn hoặc chưa rõ câu hỏi. Bạn hãy nhấn nút để thử lại nhé!`,
        ephemeral: true,
      }).catch(() => {});
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
    cleanupStreams();
  });
}

// ==========================================
// 5. HỆ THỐNG CẤP BẬC STARK INDUSTRIES & AVENGERS (RPG PROFILES)
// ==========================================
const starkProfiles = new Map();

function getProfile(userId) {
  if (!starkProfiles.has(userId)) {
    const roles = [
      'Mark L Nanotech Armor 🦾 (Chiến Binh Tiên Phong)',
      'Hulkbuster Armor 💥 (Trọng Giáp Hạng Nặng)',
      'Orbital Defense Scout 🛰️ (Trinh Sát Quỹ Đạo)',
      'Tactical AI Strategist 🧠 (Quân Sư Chiến Lược)',
      'Arc Reactor Engineer ⚡ (Kỹ Sư Lò Phản Ứng)',
    ];
    const defaultRole = roles[Math.floor(Math.random() * roles.length)];
    starkProfiles.set(userId, {
      arcEnergy: 20,
      clearanceLevel: 2,
      role: defaultRole,
      title: 'Thực Tập Sinh Stark Industries',
    });
  }
  return starkProfiles.get(userId);
}

function addStarkEnergyExp(userId, amount = 10) {
  const profile = getProfile(userId);
  profile.arcEnergy += amount;
  while (profile.arcEnergy >= profile.clearanceLevel * 100) {
    profile.clearanceLevel += 1;
  }
  if (profile.clearanceLevel >= 100) profile.title = 'Chỉ Huy Quân Đoàn Iron Legion 👑';
  else if (profile.clearanceLevel >= 80) profile.title = 'Thành Viên Sáng Lập Avengers 🛡️';
  else if (profile.clearanceLevel >= 50) profile.title = 'Đặc Vụ Phối Hợp S.H.I.E.L.D. 🦅';
  else if (profile.clearanceLevel >= 20) profile.title = 'Kỹ Sư Cấp Cao Stark (Senior Engineer) ⚡';
}

const addShinsuExp = addStarkEnergyExp;
const towerProfiles = starkProfiles;

// Helper phân tích thời gian cho lệnh /remind (hỗ trợ cả tiếng Việt: 10p, 5m, 1h, 30s)
function parseDuration(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.toLowerCase().trim().match(/^(\d+)\s*(s|m|h|p|g|phut|phút|gio|giờ|giay|giây)$/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  if (isNaN(val) || val <= 0) return null;
  const unit = match[2];
  if (['s', 'giay', 'giây'].includes(unit)) return val * 1000;
  if (['m', 'p', 'phut', 'phút'].includes(unit)) return val * 60 * 1000;
  if (['h', 'g', 'gio', 'giờ'].includes(unit)) return val * 3600 * 1000;
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
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }
}

function clearHistory(convoId) {
  conversationHistories.delete(convoId);
}

function splitMessage(text, maxLength = 1900) {
  if (!text || typeof text !== 'string') return [''];
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex <= 0) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex <= 0) {
      splitIndex = maxLength;
    }

    const chunk = remaining.slice(0, splitIndex).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(splitIndex).trim();
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
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
      .setDescription('Hỏi đáp với J.A.R.V.I.S. hoặc phân tích ảnh (Stark Vision Sensor)')
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
      .setDescription('Vẽ tranh bằng trí tuệ nhân tạo (Stark Hologram Art Engine)')
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

    // 3. J.A.R.V.I.S. Phán Xét (Roast)
    new SlashCommandBuilder()
      .setName('roast')
      .setDescription('Nhờ J.A.R.V.I.S. phân tích và đưa ra lời châm biếm sâu cay (Stark Sarcasm Protocol)')
      .addUserOption((opt) =>
        opt.setName('target').setDescription('Đối tượng bạn muốn J.A.R.V.I.S. phân tích').setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName('topic').setDescription('Chủ đề phân tích (ví dụ: độ tạ trong combat, phong cách sống...)').setRequired(false)
      ),

    // 4. Tử vi & Chiến thuật Leo Rank
    new SlashCommandBuilder()
      .setName('tactics')
      .setDescription('Mô phỏng chiến thuật radar và phân tích xác suất chiến thắng từ máy chủ J.A.R.V.I.S.')
      .addStringOption((opt) =>
        opt.setName('game').setDescription('Tên game bạn chuẩn bị chơi (Liên Quân, LMHT, Valorant...)').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('role').setDescription('Vị trí của bạn trong đội hình (Rừng, Mid, Duelist, ADC...)').setRequired(false)
      ),

    // 5. Báo thức & Nhắc lịch bằng Giọng Nói
    new SlashCommandBuilder()
      .setName('remind')
      .setDescription('Đặt hẹn giờ nhắc việc bằng giọng nói của J.A.R.V.I.S. (ví dụ: 10m Ra cắm cơm)')
      .addStringOption((opt) =>
        opt.setName('time').setDescription('Thời gian đếm ngược (ví dụ: 30s, 10m, 1h)').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('task').setDescription('Nội dung công việc cần nhắc').setRequired(true)
      ),

    // 6. Hồ sơ Nhân sự Stark (RPG Profile)
    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Xem thẻ an ninh Stark Industries, cấp bậc và năng lượng Arc Reactor của bạn')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('Thành viên muốn xem hồ sơ').setRequired(false)
      ),

    // 7. Chọn Giáp / Vị trí chiến đấu trong Avengers
    new SlashCommandBuilder()
      .setName('setrole')
      .setDescription('Chọn bộ giáp hoặc vai trò của bạn trong Biệt đội Avengers / Stark Industries')
      .addStringOption((opt) =>
        opt.setName('position')
          .setDescription('Bộ giáp / Vị trí chiến đấu')
          .setRequired(true)
          .addChoices(
            { name: 'Mark L Nanotech Armor 🦾 (Chiến Binh Tiên Phong)', value: 'Mark L Nanotech Armor 🦾' },
            { name: 'Hulkbuster Armor 💥 (Trọng Giáp Hạng Nặng)', value: 'Hulkbuster Armor 💥' },
            { name: 'Orbital Defense Scout 🛰️ (Trinh Sát Quỹ Đạo)', value: 'Orbital Defense Scout 🛰️' },
            { name: 'Tactical AI Strategist 🧠 (Quân Sư Chiến Lược)', value: 'Tactical AI Strategist 🧠' },
            { name: 'Arc Reactor Engineer ⚡ (Kỹ Sư Lò Phản Ứng)', value: 'Arc Reactor Engineer ⚡' }
          )
      ),

    // 8. Bật/Tắt Giọng đọc
    new SlashCommandBuilder()
      .setName('voice')
      .setDescription('Bật hoặc tắt giọng đọc lồng tiếng của J.A.R.V.I.S.')
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
      .setDescription('Mời J.A.R.V.I.S. tham gia vào kênh thoại (Voice Channel) của bạn'),

    // 11. Rời kênh voice
    new SlashCommandBuilder()
      .setName('leave')
      .setDescription('Cho J.A.R.V.I.S. rời khỏi kênh thoại (Voice Channel)'),

    // 12. Reset ngữ cảnh
    new SlashCommandBuilder()
      .setName('reset')
      .setDescription('Xóa lịch sử hội thoại để bắt đầu cuộc trò chuyện mới'),

    // 13. Chọn Phong cách AI (J.A.R.V.I.S. / Tiêu chuẩn)
    new SlashCommandBuilder()
      .setName('mode')
      .setDescription('Bật/Tắt phong cách nhập vai J.A.R.V.I.S. hoặc chuyển về AI tiêu chuẩn')
      .addStringOption((opt) =>
        opt
          .setName('style')
          .setDescription('Phong cách phản hồi của Bot (Toàn server)')
          .setRequired(true)
          .addChoices(
            { name: '👑 J.A.R.V.I.S. (Quý ông AI lịch lãm của Tony Stark)', value: 'jarvis' },
            { name: '🤖 AI Tiêu Chuẩn (Trung lập, thẳng thắn, như ChatGPT)', value: 'normal' }
          )
      ),

    // 14. Bảng hướng dẫn sử dụng toàn diện
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Hiển thị bảng hướng dẫn và danh sách tất cả các lệnh của J.A.R.V.I.S.'),

    // 15. Nói chuyện trực tiếp với J.A.R.V.I.S. qua mic
    new SlashCommandBuilder()
      .setName('talk')
      .setDescription('Bật mic để đàm thoại trực tiếp với J.A.R.V.I.S. bằng giọng nói trong phòng voice'),

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

    // 23. Đố vui trí tuệ Stark Industries
    new SlashCommandBuilder()
      .setName('quiz')
      .setDescription('Thử thách đố vui trắc nghiệm tương tác nút bấm cùng J.A.R.V.I.S.')
      .addStringOption((opt) =>
        opt
          .setName('topic')
          .setDescription('Chủ đề câu đố (Marvel, Khoa học, Công nghệ, Đố mẹo troll, v.v.)')
          .setRequired(false)
      ),
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
  try {
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
          session.isMusicPausedForTTS = false;
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
      session.isMusicPausedForTTS = false;
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
      const currentReq = current.requestedBy?.id ? `<@${current.requestedBy.id}>` : (current.requestedBy?.username || 'Thành viên');
      const safeCurrentTitle = (current.title || 'Hiện tại').replace(/[\[\]]/g, '');
      let desc = `**🎶 Đang phát:** [${safeCurrentTitle}](${current.originalUrl || current.url}) (\`${current.duration || 'N/A'}\`) - ${currentReq}\n\n**Danh sách chờ:**\n`;
      if (session.musicQueue.songs.length === 0) {
        desc += '*Không có bài hát nào tiếp theo trong hàng đợi.*';
      } else {
        const list = session.musicQueue.songs
          .slice(0, 10)
          .map((s, idx) => {
            const req = s.requestedBy?.id ? `<@${s.requestedBy.id}>` : (s.requestedBy?.username || 'Thành viên');
            const safeTitle = (s.title || 'Bài hát').replace(/[\[\]]/g, '');
            return `**#${idx + 1}.** [${safeTitle}](${s.originalUrl || s.url}) (\`${s.duration || 'N/A'}\`) - ${req}`;
          });
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

    // Xử lý nút bấm đố vui Quiz
    if (interaction.customId.startsWith('quiz_')) {
      const parts = interaction.customId.split('_'); // ['quiz', quizId, choice]
      const quizId = parts[1];
      const choice = parts[2];
      const quizState = activeQuizzes.get(quizId);

      if (!quizState || quizState.expired) {
        return interaction.reply({
          content: '⚠️ Thưa ngài, câu đố này đã hết thời gian hoặc không còn hiệu lực!',
          ephemeral: true,
        });
      }

      if (quizState.answered) {
        return interaction.reply({
          content: '⚠️ Câu đố này đã có người tìm ra đáp án chính xác rồi!',
          ephemeral: true,
        });
      }

      if (quizState.participants.has(interaction.user.id)) {
        return interaction.reply({
          content: '⚠️ Thưa ngài, ngài đã đưa ra lựa chọn rồi! Hãy nhường cơ hội cho các thành viên khác.',
          ephemeral: true,
        });
      }

      if (choice === quizState.correct) {
        quizState.answered = true;
        if (quizState.timer) clearTimeout(quizState.timer);

        // Cộng 20 Joules Arc Reactor Energy
        addStarkEnergyExp(interaction.user.id, 20);

        const disabledRow = new ActionRowBuilder().addComponents(
          ['A', 'B', 'C', 'D'].map((c) =>
            new ButtonBuilder()
              .setCustomId(`quiz_disabled_${c}`)
              .setLabel(c)
              .setStyle(c === quizState.correct ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(true)
          )
        );

        const winEmbed = new EmbedBuilder()
          .setTitle('🎉 J.A.R.V.I.S. • CHÚC MỪNG NGƯỜI CHIẾN THẮNG!')
          .setDescription(
            `**${quizState.question}**\n\n` +
            `🏆 **Thành viên giải đố xuất sắc:** <@${interaction.user.id}>\n` +
            `✅ **Đáp án chính xác:** **${quizState.correct}. ${quizState.options[quizState.correct]}**\n\n` +
            `💡 **Phân tích:** ${quizState.explanation}\n\n` +
            `⚡ **Phần thưởng:** \`+20 Joules\` Arc Reactor Energy đã được nạp vào hồ sơ an ninh của ngài!`
          )
          .setColor(0x2ecc71)
          .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries Intelligence Protocol' })
          .setTimestamp();

        if (isInVoiceRoom && isVoiceEnabled) {
          const spokenWin = `Xuất sắc! Chúc mừng ngài ${interaction.member?.displayName || interaction.user.username} đã chọn đáp án chính xác!`;
          generateAudioBuffer(spokenWin).then((buf) => {
            if (buf) queueAudio(guildId, buf);
          });
        }

        activeQuizzes.delete(quizId);
        return interaction.update({ embeds: [winEmbed], components: [disabledRow] });
      } else {
        quizState.participants.add(interaction.user.id);
        return interaction.reply({
          content: `❌ Tiếc quá thưa ngài, đáp án **${choice}** chưa chính xác! Cơ hội vẫn dành cho các thành viên khác.`,
          ephemeral: true,
        });
      }
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

    if (style === 'jarvis') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 Phong Cách: J.A.R.V.I.S. (Stark Industries AI)')
        .setDescription('**Đã kích hoạt giao thức J.A.R.V.I.S. cho toàn bộ Server!**\nTừ giờ tôi sẽ phục vụ với phong thái điềm đạm, lịch thiệp kiểu quý ông Anh quốc, xưng "tôi - thưa ngài/Sir", mưu lược và tận tụy chuẩn trợ lý Avengers.')
        .setColor(0x00D2FF);
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
    const currentMode = guildPersonalityModes.get(guildId) || 'jarvis';
    const modeName = currentMode === 'jarvis' ? '🤖 J.A.R.V.I.S. (Trợ lý Stark Industries)' : '⚙️ AI Tiêu Chuẩn (Thuần túy)';

    const embed = new EmbedBuilder()
      .setTitle('📚 HỆ THỐNG ĐIỀU KHIỂN & HỖ TRỢ - J.A.R.V.I.S.')
      .setDescription(`Kính chào ngài! Dưới đây là danh mục toàn bộ hệ thống tính năng thông minh của tôi.\n*Giao thức hoạt động hiện tại:* **${modeName}**\n*(Dùng lệnh \`/mode\` để chuyển đổi)*`)
      .setColor(0x00D2FF)
      .addFields(
        {
          name: '🧠 1. HỎI ĐÁP & TRÍ TUỆ NHÂN TẠO',
          value:
            '• `/ask [câu_hỏi] [ảnh]` : Hỏi đáp với AI hoặc phân tích hình ảnh đính kèm.\n' +
            '• `/mode [jarvis | normal]` : Đổi phong cách trả lời (Nhập vai J.A.R.V.I.S. hoặc AI tiêu chuẩn).\n' +
            '• `/reset` : Xóa lịch sử nhớ ngữ cảnh để bắt đầu cuộc trò chuyện mới.\n' +
            '• **Chat tự nhiên:** Tag `@JARVIS` hoặc gọi thân mật *"JARVIS ơi"*, *"Javis ơi"*, *"Trợ lý ơi"*, *"Alo Jarvis"*, tôi sẽ phản hồi ngay!',
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
            '• **Đàm thoại trực tiếp 2 chiều:** Khi bot ở trong phòng voice, bạn chỉ cần nói vào mic *"JARVIS ơi..."* hoặc bấm nút micro, tôi sẽ lắng nghe và cất giọng trả lời lại ngay!\n' +
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
          name: '🛡️ 5. HỆ THỐNG AN NINH STARK & TIỆN ÍCH',
          value:
            '• `/profile [user]` : Thẻ An ninh Stark, Lò phản ứng Arc Energy, Mức Clearance & Bộ giáp.\n' +
            '• `/setrole [bộ_giáp]` : Trang bị bộ giáp chiến lược (Mark L Nanotech, Hulkbuster...).\n' +
            '• `/roast [user] [chủ_đề]` : Giao thức Mỉa mai Quý ông (JARVIS Sarcasm Protocol).\n' +
            '• `/tactics [game] [role]` : Radar phân tích chiến thuật và xác suất thắng trận.\n' +
            '• `/quiz [chủ_đề]` : Thử thách đố vui trắc nghiệm tương tác nút bấm (+20 Joules Arc).\n' +
            '• `/remind [thời_gian] [công_việc]` : Hẹn giờ nhắc việc kèm giọng đọc AI.',
        }
      )
      .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries & Avengers AI' })
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
          `• Bấm nút **[🎙️ Nhấn để nói (Hỏi JARVIS)]** bên dưới hoặc gõ **/talk** để nói chuyện trực tiếp qua mic.\n` +
          `• Tôi sẽ lắng nghe yêu cầu của ngài và cất giọng phản hồi ngay lập tức!\n\n` +
          `**📖 Đọc Chat:** Tự động đọc tin nhắn văn bản gửi trong server vào phòng thoại.`
        )
        .setColor(0x00D2FF)
        .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries Voice Engine' });

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
        session.isMusicPausedForTTS = false;
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
    session.isMusicPausedForTTS = false;
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
    const currentReq = current.requestedBy?.id ? `<@${current.requestedBy.id}>` : (current.requestedBy?.username || 'Thành viên');
    const safeCurrentTitle = (current.title || 'Hiện tại').replace(/[\[\]]/g, '');
    let desc = `**🎶 Đang phát:** [${safeCurrentTitle}](${current.originalUrl || current.url}) (\`${current.duration || 'N/A'}\`) - ${currentReq}\n\n**Danh sách chờ:**\n`;
    if (session.musicQueue.songs.length === 0) {
      desc += '*Không có bài hát nào tiếp theo trong hàng đợi.*';
    } else {
      const list = session.musicQueue.songs
        .slice(0, 10)
        .map((s, idx) => {
          const req = s.requestedBy?.id ? `<@${s.requestedBy.id}>` : (s.requestedBy?.username || 'Thành viên');
          const safeTitle = (s.title || 'Bài hát').replace(/[\[\]]/g, '');
          return `**#${idx + 1}.** [${safeTitle}](${s.originalUrl || s.url}) (\`${s.duration || 'N/A'}\`) - ${req}`;
        });
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
        .setColor(0x00D2FF)
        .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries Visual Synthesis' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error('Lỗi /draw:', err);
      await interaction.editReply(`⚠️ Không thể tạo ảnh: ${err.message || 'Vui lòng thử lại sau!'}`);
    }
    return;
  }

  // Lệnh /roast (J.A.R.V.I.S. Sarcasm Protocol)
  if (interaction.commandName === 'roast') {
    const target = interaction.options.getUser('target') || interaction.user;
    const topic = interaction.options.getString('topic') || 'thói quen sinh hoạt và trình độ công nghệ';

    await interaction.deferReply();

    try {
      const roastPrompt = `Bạn là J.A.R.V.I.S. (Just A Rather Very Intelligent System - siêu AI quản gia của Tony Stark / Avengers).
Hãy đưa ra một lời phán xét/khịa (roast) lịch thiệp chuẩn quý ông Anh quốc, thâm thúy, thông minh, pha chút mỉa mai hóm hỉnh tinh tế dành cho người có tên là "${target.username}" về chủ đề: "${topic}". Xưng hô "thưa ngài" hoặc "thưa quý khách", dùng phong thái điềm tĩnh nhưng châm chích sắc sảo.
Dài khoảng 2 đến 3 câu bằng tiếng Việt.`;

      const roastText = await callGemini([{ role: 'user', parts: [{ text: roastPrompt }] }]);

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(roastText);
      }

      if (isInVoiceRoom && audioBuffer) {
        queueAudio(guildId, audioBuffer);
        await interaction.editReply(`🎙️ **J.A.R.V.I.S. Sarcasm Protocol** <@${target.id}>:\n> ${roastText}`);
      } else if (audioBuffer && !isInVoiceRoom) {
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'jarvis_roast.mp3' });
        await interaction.editReply({
          content: `🎙️ **J.A.R.V.I.S. Sarcasm Protocol** <@${target.id}>:\n> ${roastText}`,
          files: [voiceAttachment],
        });
      } else {
        await interaction.editReply(`🎙️ **J.A.R.V.I.S. Sarcasm Protocol** <@${target.id}>:\n> ${roastText}`);
      }
    } catch (err) {
      console.error('Lỗi /roast:', err);
      await interaction.editReply(`⚠️ Lỗi giao thức mỉa mai: ${err.message}`);
    }
    return;
  }

  // Lệnh /tactics (Chiến thuật & Tử vi Game Avengers)
  if (interaction.commandName === 'tactics') {
    const game = interaction.options.getString('game');
    const role = interaction.options.getString('role') || 'người gánh đội';

    await interaction.deferReply();

    try {
      const tacticsPrompt = `Bạn là J.A.R.V.I.S. - AI điều phối tác chiến tối cao của Stark Industries và Avengers.
Người chơi chuẩn bị bước vào chiến dịch/trận game "${game}" ở vị trí "${role}".
Hãy quét radar mô phỏng chiến thuật, tính toán xác suất chiến thắng và đưa ra lời khuyên mưu lược, hóm hỉnh, đĩnh đạc mang đậm màu sắc công nghệ cao của Stark.
Dài khoảng 3 câu bằng tiếng Việt.`;

      const tacticsText = await callGemini([{ role: 'user', parts: [{ text: tacticsPrompt }] }]);

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(tacticsText);
      }

      if (isInVoiceRoom && audioBuffer) {
        queueAudio(guildId, audioBuffer);
        await interaction.editReply(`🛰️ **Radar Mô Phỏng Chiến Thuật Stark [${game}]**:\n> ${tacticsText}`);
      } else if (audioBuffer && !isInVoiceRoom) {
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'jarvis_tactics.mp3' });
        await interaction.editReply({
          content: `🛰️ **Radar Mô Phỏng Chiến Thuật Stark [${game}]**:\n> ${tacticsText}`,
          files: [voiceAttachment],
        });
      } else {
        await interaction.editReply(`🛰️ **Radar Mô Phỏng Chiến Thuật Stark [${game}]**:\n> ${tacticsText}`);
      }
    } catch (err) {
      console.error('Lỗi /tactics:', err);
      await interaction.editReply(`⚠️ Lỗi tính toán chiến thuật: ${err.message}`);
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
        content: '⚠️ Thưa ngài, định dạng thời gian không hợp lệ! Vui lòng dùng: `30s` (giây), `10m` (phút), hoặc `1h` (tiếng).',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(`⏰ Thưa ngài, tôi đã thiết lập bộ đếm thời gian nhắc **"${task}"** sau **${timeStr}**.`);

    const userToRemind = interaction.user;
    const channelToRemind = interaction.channel;
    const currentGuildId = interaction.guildId;

    setTimeout(async () => {
      try {
        const reminderText = `Thưa ngài <@${userToRemind.id}>, bộ đếm thời gian ${timeStr} đã kết thúc. Nhiệm vụ cần thực hiện: **${task}**!`;
        if (channelToRemind) {
          await channelToRemind.send(`⏰ ${reminderText}`).catch(() => {});
        }

        // Nếu bot đang trong phòng thoại, nói to nhắc nhở!
        const voiceConn = currentGuildId ? getVoiceConnection(currentGuildId) : null;
        if (voiceConn && isVoiceEnabled) {
          const spokenReminder = `Thưa ngài ${userToRemind.displayName || userToRemind.username}, đã hết ${timeStr}. Đã đến lúc ngài cần ${task}!`;
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

  // Lệnh /profile (Hồ sơ An Ninh Stark & Avengers)
  if (interaction.commandName === 'profile') {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const profile = getProfile(targetUser.id);

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ THẺ AN NINH STARK INDUSTRIES: ${targetUser.username.toUpperCase()}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0x00D2FF)
      .addFields(
        { name: '🎖️ Mức Miễn Trừ An Ninh', value: `Cấp ${profile.floor} (Clearance Level ${profile.floor})`, inline: true },
        { name: '🦾 Bộ Giáp / Vai Trò', value: `${profile.position}`, inline: true },
        { name: '⚡ Lò Phản Ứng Arc', value: `${profile.shinsu} Joules`, inline: true },
        { name: '🏅 Chức Vụ / Danh Hiệu', value: `${profile.title}`, inline: false }
      )
      .setFooter({ text: 'Stark Industries • Avengers Tactical Division' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }

  // Lệnh /setrole (Trang bị Bộ Giáp / Vai trò)
  if (interaction.commandName === 'setrole') {
    const newPos = interaction.options.getString('position');
    const profile = getProfile(interaction.user.id);
    profile.position = newPos;

    await interaction.reply({
      content: `✅ Thưa ngài, hệ thống đã trang bị bộ giáp/vai trò: **${newPos}**! Hãy tích lũy năng lượng Arc Reactor qua hoạt động để nâng cấp mức an ninh tiếp theo.`,
      ephemeral: true,
    });
    return;
  }

  // Lệnh /quiz (Đố vui trí tuệ Stark Industries)
  if (interaction.commandName === 'quiz') {
    const topic = interaction.options.getString('topic');
    await interaction.deferReply();

    const topicDesc = topic
      ? `về chủ đề: "${topic}"`
      : 'về một chủ đề lôi cuốn (vũ trụ Marvel / Avengers, siêu anh hùng, khoa học công nghệ, hoặc câu đố mẹo trí tuệ)';

    const quizSystemPrompt = `Bạn là J.A.R.V.I.S. (siêu trí tuệ nhân tạo của Stark Industries).
Hãy sáng tạo ra 1 câu hỏi đố vui trắc nghiệm tiếng Việt cực kỳ thú vị, kích thích tư duy ${topicDesc}.
Có 4 phương án lựa chọn A, B, C, D (chỉ duy nhất 1 phương án đúng).
YÊU CẦU BẮT BUỘC: Trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc sau (không kèm markdown \`\`\`json hay bất kỳ văn bản nào khác ngoài JSON):
{
  "question": "Câu hỏi ngắn gọn, hấp dẫn",
  "options": {
    "A": "Nội dung đáp án A",
    "B": "Nội dung đáp án B",
    "C": "Nội dung đáp án C",
    "D": "Nội dung đáp án D"
  },
  "correct": "A",
  "explanation": "Giải thích ngắn gọn 1-2 câu vì sao đáp án đó chính xác."
}`;

    try {
      const geminiRes = await callGemini(
        [{ role: 'user', parts: [{ text: 'Khởi tạo câu hỏi đố vui ngay.' }] }],
        quizSystemPrompt
      );

      const cleanedJson = geminiRes.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      let quizData = null;
      try {
        quizData = JSON.parse(cleanedJson);
      } catch (e) {
        const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quizData = JSON.parse(jsonMatch[0]);
        }
      }

      if (!quizData || !quizData.question || !quizData.options || !quizData.correct) {
        throw new Error('Dữ liệu câu đố từ hệ thống không đạt chuẩn.');
      }

      quizData.correct = String(quizData.correct).toUpperCase().trim();
      const quizId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      const quizEmbed = new EmbedBuilder()
        .setTitle('🧠 J.A.R.V.I.S. • THỬ THÁCH ĐỐ VUI TRÍ TUỆ')
        .setDescription(
          `**${quizData.question}**\n\n` +
          `🅰️ **A.** ${quizData.options.A}\n` +
          `🅱️ **B.** ${quizData.options.B}\n` +
          `🅲 **C.** ${quizData.options.C}\n` +
          `🅳 **D.** ${quizData.options.D}\n\n` +
          `*⏱️ Các ngài có 45 giây để bấm chọn đáp án bên dưới!*\n` +
          `*⚡ Phần thưởng: +20 Joules Arc Reactor Energy cho người đầu tiên trả lời đúng.*`
        )
        .setColor(0x00D2FF)
        .setFooter({ text: 'Stark Industries Intelligence Protocol • Chọn đáp án bên dưới' })
        .setTimestamp();

      const buttonRow = new ActionRowBuilder().addComponents(
        ['A', 'B', 'C', 'D'].map((opt) =>
          new ButtonBuilder()
            .setCustomId(`quiz_${quizId}_${opt}`)
            .setLabel(opt)
            .setStyle(ButtonStyle.Primary)
        )
      );

      const replyMsg = await interaction.editReply({ embeds: [quizEmbed], components: [buttonRow] });

      // Đọc to câu hỏi nếu bot đang trong voice
      if (isInVoiceRoom && isVoiceEnabled) {
        const spokenQuiz = `Thưa các ngài, tôi có một câu hỏi đố vui: ${quizData.question}. Xin mời các ngài đưa ra đáp án trên màn hình!`;
        generateAudioBuffer(spokenQuiz).then((buf) => {
          if (buf) queueAudio(guildId, buf);
        });
      }

      // Thiết lập hẹn giờ 45 giây
      const timer = setTimeout(async () => {
        const currentQuiz = activeQuizzes.get(quizId);
        if (currentQuiz && !currentQuiz.answered) {
          currentQuiz.expired = true;
          activeQuizzes.delete(quizId);

          const timeoutRow = new ActionRowBuilder().addComponents(
            ['A', 'B', 'C', 'D'].map((c) =>
              new ButtonBuilder()
                .setCustomId(`quiz_expired_${c}`)
                .setLabel(c)
                .setStyle(c === quizData.correct ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );

          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⌛ HẾT THỜI GIAN • ĐÁP ÁN ĐỐ VUI')
            .setDescription(
              `**${quizData.question}**\n\n` +
              `⏰ Đã hết thời gian 45 giây! Rất tiếc không có ai kịp đưa ra lời giải chính xác.\n\n` +
              `✅ **Đáp án đúng:** **${quizData.correct}. ${quizData.options[quizData.correct]}**\n` +
              `💡 **Giải thích:** ${quizData.explanation}`
            )
            .setColor(0x95a5a6)
            .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries Intelligence Protocol' })
            .setTimestamp();

          try {
            await replyMsg.edit({ embeds: [timeoutEmbed], components: [timeoutRow] });
          } catch (e) {}
        }
      }, 45000);

      activeQuizzes.set(quizId, {
        question: quizData.question,
        options: quizData.options,
        correct: quizData.correct,
        explanation: quizData.explanation || 'Không có giải thích thêm.',
        participants: new Set(),
        answered: false,
        expired: false,
        timer,
        messageId: replyMsg.id,
      });

    } catch (err) {
      console.error('Lỗi /quiz:', err);
      await interaction.editReply(`⚠️ Thưa ngài, hệ thống gặp sự cố khi tạo câu đố: ${err.message}`);
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
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'jarvis_voice.mp3' });
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
  } catch (interactionError) {
    console.error('❌ Lỗi tổng quát interactionCreate:', interactionError);
    const errMsg = `⚠️ Đã có lỗi xảy ra: ${interactionError.message}`;
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errMsg }).catch(() => {});
      } else {
        await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
      }
    }
  }
});

// ==========================================
// 9. XỬ LÝ CHAT TRỰC TIẾP, ĐỌC TIN NHẮN VOICE & CỘNG ĐIỂM RPG
// ==========================================
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;

    // Cộng điểm Arc Reactor EXP khi chat
    addStarkEnergyExp(message.author.id, 5);

    const guildId = message.guildId;
    const connection = guildId ? getVoiceConnection(guildId) : null;
    const isInVoiceRoom = connection && connection.state.status === VoiceConnectionStatus.Ready;
    const isBotMentioned = message.mentions.has(client.user.id);
    const isDirectMessage = !message.guild;

    // ĐỌC TIN NHẮN VÀO PHÒNG THOẠI (TTS CHAT READER)
    const wakeWordRegex = /^(jarvis ơi|javis ơi|jarvis|javis|bot ơi|trợ lý ơi|ê jarvis|ê bot|alo jarvis|alo bot)[\s,:]*/i;
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
      await message.reply('🧹 Thưa ngài, tôi đã thiết lập lại toàn bộ bộ nhớ hội thoại! Chúng ta có thể bắt đầu chủ đề mới.');
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
      await message.reply('Kính chào ngài! Tôi là **J.A.R.V.I.S.**, hệ thống trí tuệ nhân tạo của Stark Industries. Vui lòng giao nhiệm vụ hoặc gửi hình ảnh/tài liệu để tôi hỗ trợ nhé!');
      return;
    }

    const lowerClean = cleanText.toLowerCase();

    // TỰ ĐỘNG PHÁT HIỆN LỆNH ĐIỀU KHIỂN NHẠC BẰNG CHAT TỰ NHIÊN
    if (
      lowerClean === 'dừng nhạc' ||
      lowerClean === 'tắt nhạc' ||
      lowerClean === 'ngừng nhạc' ||
      lowerClean === 'dừng phát' ||
      lowerClean === 'stop' ||
      lowerClean.includes('xóa danh sách') ||
      lowerClean.includes('xoá danh sách') ||
      lowerClean.includes('xóa hàng đợi') ||
      lowerClean.includes('xoá hàng đợi') ||
      lowerClean.includes('xóa hết nhạc') ||
      lowerClean.includes('xoá hết nhạc') ||
      lowerClean.includes('clear queue')
    ) {
      const session = guildVoiceSessions.get(guildId);
      if (session) {
        session.musicQueue.songs = [];
        session.musicQueue.currentSong = null;
        session.musicQueue.isPlaying = false;
        session.musicPlayer.stop();
        await message.reply('⏹️ **Đã dừng phát nhạc và làm sạch toàn bộ hàng đợi!** Bạn có thể yêu cầu phát danh sách mới bất cứ lúc nào.');
      } else {
        await message.reply('⚠️ Hiện tại không có bài hát nào đang phát!');
      }
      return;
    }

    if (
      lowerClean === 'bỏ qua' ||
      lowerClean === 'skip' ||
      lowerClean === 'chuyển bài' ||
      lowerClean === 'qua bài' ||
      lowerClean.startsWith('bỏ qua bài') ||
      lowerClean.startsWith('chuyển bài')
    ) {
      const session = guildVoiceSessions.get(guildId);
      if (session && (session.musicQueue.isPlaying || session.musicQueue.currentSong)) {
        const skippedSong = session.musicQueue.currentSong?.title || 'Hiện tại';
        session.musicPlayer.stop();
        await message.reply(`⏭️ Đã bỏ qua bài hát: **${skippedSong}**!`);
      } else {
        await message.reply('⚠️ Không có bài hát nào đang phát để bỏ qua!');
      }
      return;
    }

    if (lowerClean === 'tạm dừng' || lowerClean === 'pause' || lowerClean === 'dừng tạm') {
      const session = guildVoiceSessions.get(guildId);
      if (session && (session.musicQueue.isPlaying || session.musicQueue.currentSong)) {
        session.musicPlayer.pause();
        await message.reply('⏸️ **Đã tạm dừng bài hát!** (Nói "tiếp tục" hoặc gõ `/resume` để nghe tiếp)');
      } else {
        await message.reply('⚠️ Hiện tại không có bài hát nào đang phát!');
      }
      return;
    }

    if (lowerClean === 'tiếp tục' || lowerClean === 'resume' || lowerClean === 'phát tiếp') {
      const session = guildVoiceSessions.get(guildId);
      if (session && session.musicQueue.currentSong) {
        const conn = getVoiceConnection(guildId);
        if (conn) conn.subscribe(session.musicPlayer);
        session.musicPlayer.unpause();
        await message.reply('▶️ **Đã tiếp tục phát nhạc!**');
      } else {
        await message.reply('⚠️ Hiện tại không có bài hát nào đang tạm dừng!');
      }
      return;
    }

    // TỰ ĐỘNG PHÁT HIỆN YÊU CẦU BẬT NHẠC THÔNG MINH BẰNG AI (AI Auto-DJ)
    if (imageAttachments.size === 0) {
      const musicSongList = await extractMusicListWithAI(cleanText);
      if (musicSongList && musicSongList.length > 0) {
        await playMultipleSongsFromNaturalRequest(musicSongList, message.member, message.channel);
        return;
      }
    }

    // TỰ ĐỘNG PHÁT HIỆN YÊU CẦU VẼ TRANH TRONG CHAT THƯỜNG (Không cần gõ /draw)
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
              .setColor(0x00D2FF)
              .setFooter({ text: 'J.A.R.V.I.S. • Stark Industries Visual Synthesis' })
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

    try {
      const parts = [];
      if (cleanText) parts.push({ text: cleanText });

      for (const [, att] of imageAttachments) {
        const imgData = await urlToInlineData(att.url);
        if (imgData) parts.push(imgData);
      }

      addToHistory(convoId, 'user', parts);
      const replyText = await callGemini(getHistory(convoId), null, guildId);

      // Kiểm tra nếu Gemini muốn phát nhạc qua thẻ [PLAY: ...]
      const playTagMatch = replyText.match(/\[PLAY:\s*([^\]]+)\]/i);
      let cleanedReplyText = replyText.replace(/\[PLAY:\s*[^\]]+\]/gi, '').trim();
      if (!cleanedReplyText) cleanedReplyText = 'Thưa ngài, tôi đang tìm kiếm và kích hoạt bản nhạc ngay cho ngài!';

      addToHistory(convoId, 'model', [{ text: cleanedReplyText }]);

      const chunks = splitMessage(cleanedReplyText);

      let audioBuffer = null;
      if (isVoiceEnabled) {
        audioBuffer = await generateAudioBuffer(cleanedReplyText);
      }

      if (isInVoiceRoom && audioBuffer) {
        queueAudio(guildId, audioBuffer);
        await message.reply(chunks[0]);
      } else if (audioBuffer && !isInVoiceRoom) {
        const voiceAttachment = new AttachmentBuilder(audioBuffer, { name: 'jarvis_voice.mp3' });
        await message.reply({ content: chunks[0], files: [voiceAttachment] });
      } else {
        await message.reply(chunks[0]);
      }

      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
      }

      if (playTagMatch && playTagMatch[1]) {
        const songToPlay = playTagMatch[1].replace(/^[\[("']|[\])"']$/g, '').trim();
        playMusicFromNaturalRequest(songToPlay, message.member, message.channel);
      }
    } finally {
      clearInterval(typingInterval);
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
