/**
 * ============================================================================
 *               LOFI RADIO 24/7 - DISCORD MUSIC BOT
 *   Động cơ phát thanh Lofi trực tiếp 24/7 chất lượng cao, tự động kết nối lại,
 *   giao diện nút bấm trực quan và ghi nhớ phòng thoại khi khởi động lại.
 * ============================================================================
 */

try {
  const ffmpeg = require('ffmpeg-static');
  if (ffmpeg && !process.env.FFMPEG_PATH) {
    process.env.FFMPEG_PATH = ffmpeg;
  }
} catch (_) {}

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');

// ==========================================
// 1. DANH SÁCH CÁC ĐÀI LOFI RADIO HD 24/7
// ==========================================
const LOFI_STATIONS = {
  chill: {
    id: 'chill',
    name: 'Lofi Chill & Study (Hunter FM)',
    description: 'Giai điệu lofi hip-hop êm dịu, hoàn hảo cho học tập & làm việc',
    emoji: '☕',
    url: 'https://live.hunter.fm/lofi_high',
    color: 0xE67E22,
    thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=256',
  },
  chillhop: {
    id: 'chillhop',
    name: 'Chillhop Beats 24/7 (Streamafrica)',
    description: 'Nhịp điệu phong cách Lofi Girl đường phố thư thái, giảm stress',
    emoji: '🎧',
    url: 'https://boxradio-edge-00.streamafrica.net/lofi',
    color: 0x3498DB,
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=256',
  },
  sleep: {
    id: 'sleep',
    name: 'Lofi Sleep & Relax (Laut FM)',
    description: 'Âm thanh du dương, thư giãn tâm hồn, dễ ngủ & xua tan âu lo',
    emoji: '🌙',
    url: 'https://lofi.stream.laut.fm/lofi',
    color: 0x9B59B6,
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=256',
  },
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave / Retro Chill (Laut FM)',
    description: 'Âm hưởng Cyberpunk điện tử hoài niệm thập niên 80 huyền ảo',
    emoji: '🌌',
    url: 'https://synthwave.stream.laut.fm/synthwave',
    color: 0xE91E63,
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=256',
  },
  cafe: {
    id: 'cafe',
    name: 'Coffee Shop Lofi (I Love Music)',
    description: 'Không gian quán cà phê ấm cúng, tiếng mưa rơi & piano dịu êm',
    emoji: '🍰',
    url: 'https://ilm.stream27.radiohost.de/ilm_ilovechillhop_mp3-192?upd-meta&upd-scheme=https',
    color: 0x1ABC9C,
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=256',
  },
};

function getStation(stationId) {
  return LOFI_STATIONS[stationId] || LOFI_STATIONS.chill;
}

// ==========================================
// 2. LƯU TRỮ VÀ TỰ ĐỘNG PHỤC HỒI (PERSISTENCE)
// ==========================================
const CONFIG_FILE = path.join(__dirname, 'data', 'lofi_config.json');

function ensureDataDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadConfigs() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) || {};
  } catch (_) {
    return {};
  }
}

function saveConfigs(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi lưu lofi_config.json:', err.message);
  }
}

function getGuildConfig(guildId) {
  const all = loadConfigs();
  return all[guildId] || null;
}

function setGuildConfig(guildId, config) {
  const all = loadConfigs();
  all[guildId] = { ...all[guildId], ...config, updatedAt: Date.now() };
  saveConfigs(all);
}

function removeGuildConfig(guildId) {
  const all = loadConfigs();
  delete all[guildId];
  saveConfigs(all);
}

// ==========================================
// 3. QUẢN LÝ PHIÊN ÂM THANH (SESSIONS)
// ==========================================
const activeSessions = new Map();

function getOrCreateSession(guildId) {
  if (!activeSessions.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
        maxMissedFrames: 250,
      },
    });

    const session = {
      guildId,
      player,
      isPlaying: false,
      is247: true,
      stationId: 'chill',
      voiceChannelId: null,
      textChannelId: null,
    };

    activeSessions.set(guildId, session);
  }
  return activeSessions.get(guildId);
}

// ==========================================
// 4. GIAO DIỆN EMBED VÀ NÚT BẤM (UI)
// ==========================================
function buildLofiEmbed({ station, isPlaying, is247, voiceChannel }) {
  return new EmbedBuilder()
    .setTitle(`📻 ĐÀI PHÁT THANH LOFI 24/7 • LIVE HD RADIO`)
    .setDescription(
      `✨ **ĐANG PHÁT:** ${station.emoji} **${station.name}**\n` +
      `> *"${station.description}"*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📡 **Trạng thái:** ${isPlaying ? '🟢 Đang phát trực tiếp 24/7' : '⏸️ Đang tạm dừng'}\n` +
      `🔒 **Chế độ 24/7:** ${is247 ? '🟢 **BẬT** (Tự kết nối lại, không rời phòng)' : '⚪ **TẮT** (Sẽ rời khi dừng phát)'}\n` +
      `🔊 **Kênh thoại:** <#${voiceChannel.id}>\n` +
      `⚡ **Chất lượng:** \`192 kbps Direct Audio / Low Latency / Không quảng cáo\`\n\n` +
      `💡 *Mẹo: Bạn có thể chọn đổi đài phát thanh ở menu bên dưới hoặc dùng nút điều khiển.*`
    )
    .setColor(station.color)
    .setThumbnail(station.thumbnail)
    .setFooter({ text: 'Lofi Radio 24/7 • Thư giãn, học tập & giải tỏa căng thẳng' })
    .setTimestamp();
}

function buildLofiComponents({ currentStationId, isPlaying, is247 }) {
  const options = Object.values(LOFI_STATIONS).map((st) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(st.name)
      .setDescription(st.description.slice(0, 50))
      .setValue(st.id)
      .setEmoji(st.emoji)
      .setDefault(st.id === currentStationId)
  );

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('lofi_select')
      .setPlaceholder('📻 Chọn đài phát thanh Lofi khác...')
      .addOptions(options)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lofi_toggle')
      .setLabel(isPlaying ? '⏸️ Tạm Dừng' : '▶️ Tiếp Tục')
      .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('lofi_247')
      .setLabel(is247 ? '🔒 24/7: BẬT' : '🔓 24/7: TẮT')
      .setStyle(is247 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lofi_random')
      .setLabel('🔀 Đổi Đài')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lofi_stop')
      .setLabel('🛑 Dừng & Rời')
      .setStyle(ButtonStyle.Danger)
  );

  return [selectRow, buttonRow];
}

// ==========================================
// 5. ĐIỀU PHỐI ÂM THANH & PHÁT NHẠC
// ==========================================
async function playLofiStation({ guild, voiceChannel, textChannel = null, stationId = 'chill', is247 = true }) {
  const guildId = guild.id;
  const station = getStation(stationId);
  const session = getOrCreateSession(guildId);

  session.stationId = station.id;
  session.voiceChannelId = voiceChannel.id;
  if (textChannel) session.textChannelId = textChannel.id;
  session.is247 = is247;
  session.isPlaying = true;

  // 1. Quản lý Voice Connection (Xóa kết nối kẹt nếu có)
  let conn = getVoiceConnection(guildId);
  const isConnDead = !conn || conn.state.status === VoiceConnectionStatus.Disconnected || conn.state.status === VoiceConnectionStatus.Destroyed;
  if (isConnDead || conn.joinConfig.channelId !== voiceChannel.id) {
    if (conn) {
      try { conn.destroy(); } catch (_) {}
    }
    conn = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
  }

  // 2. Chờ kết nối đạt trạng thái Ready
  try {
    await entersState(conn, VoiceConnectionStatus.Ready, 15_000);
  } catch (readyErr) {
    console.warn(`[Lofi 24/7] Chờ kết nối voice Ready: ${readyErr.message}`);
  }

  // 3. Tạo luồng âm thanh và phát
  const resource = createAudioResource(station.url, { inlineVolume: true });
  if (resource.playStream) {
    resource.playStream.on('error', (err) => console.warn('[Resource Error]:', err.message));
  }
  conn.subscribe(session.player);
  session.player.play(resource);
  session.player.unpause();

  // 4. Lưu cấu hình 24/7
  if (is247) {
    setGuildConfig(guildId, {
      guildId,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel?.id || null,
      stationId: station.id,
      is247: true,
    });
  }

  // 5. Gắn listener tự phục hồi khi mạng bị gián đoạn (Auto-Loop / Auto-Reconnect)
  if (!session.player.__loopAttached) {
    session.player.__loopAttached = true;
    session.player.on(AudioPlayerStatus.Idle, () => {
      if (session.isPlaying) {
        console.log(`[Lofi 24/7]: Luồng đài hoàn tất hoặc gián đoạn, tự nạp lại stream cho ${guild.name}...`);
        setTimeout(() => {
          try {
            const currentStation = getStation(session.stationId);
            const newRes = createAudioResource(currentStation.url, { inlineVolume: true });
            const liveConn = getVoiceConnection(guildId);
            if (liveConn) liveConn.subscribe(session.player);
            session.player.play(newRes);
            session.player.unpause();
          } catch (_) {}
        }, 1500);
      }
    });

    session.player.on('error', (err) => {
      console.error(`[Lofi Player Error ${guildId}]:`, err.message);
    });
  }

  if (!conn.__reconnectAttached) {
    conn.__reconnectAttached = true;
    conn.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch (_) {
        const conf = getGuildConfig(guildId);
        if (conf && conf.is247) {
          console.log(`[Lofi 24/7]: Rớt mạng tại ${guild.name}, tự reconnect sau 3 giây...`);
          setTimeout(async () => {
            try {
              const freshVC = guild.channels.cache.get(conf.voiceChannelId) || (await guild.channels.fetch(conf.voiceChannelId).catch(() => null));
              if (freshVC) {
                await playLofiStation({
                  guild,
                  voiceChannel: freshVC,
                  textChannel,
                  stationId: conf.stationId,
                  is247: true,
                });
              }
            } catch (reconnErr) {
              console.error('[Lofi Reconnect Error]:', reconnErr.message);
            }
          }, 3000);
        }
      }
    });
  }

  return {
    embed: buildLofiEmbed({ station, isPlaying: true, is247, voiceChannel }),
    components: buildLofiComponents({ currentStationId: station.id, isPlaying: true, is247 }),
    station,
  };
}

function stopLofi(guildId) {
  const session = activeSessions.get(guildId);
  if (session) {
    session.isPlaying = false;
    session.player.stop(true);
  }
  removeGuildConfig(guildId);
  activeSessions.delete(guildId);

  const conn = getVoiceConnection(guildId);
  if (conn) {
    try { conn.destroy(); } catch (_) {}
  }
}

// ==========================================
// 6. KHỞI TẠO CLIENT DISCORD & SỰ KIỆN
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', async () => {
  console.log(`=============================================`);
  console.log(`📻 Bot Lofi 24/7 đã sẵn sàng: ${client.user.tag}`);
  console.log(`⚡ ID Bot: ${client.user.id}`);
  console.log(`=============================================`);

  client.user.setPresence({
    activities: [{ name: '☕ Lofi Chill Beats 24/7', type: ActivityType.Listening }],
    status: 'online',
  });

  // Đăng ký Slash Command /lofi
  const commands = [
    new SlashCommandBuilder()
      .setName('lofi')
      .setDescription('Bật đài phát thanh Lofi 24/7 chất lượng cao không quảng cáo')
      .addStringOption((opt) =>
        opt
          .setName('station')
          .setDescription('Chọn thể loại đài Lofi')
          .setRequired(false)
          .addChoices(
            { name: '☕ Lofi Chill & Study (Hunter FM)', value: 'chill' },
            { name: '🎧 Chillhop Beats 24/7 (Streamafrica)', value: 'chillhop' },
            { name: '🌙 Lofi Sleep & Relax (Laut FM)', value: 'sleep' },
            { name: '🌌 Synthwave / Retro Chill (Cyberpunk)', value: 'synthwave' },
            { name: '🍰 Coffee Shop Lofi (Quán Cà Phê)', value: 'cafe' }
          )
      )
      .addStringOption((opt) =>
        opt
          .setName('mode247')
          .setDescription('Bật hoặc tắt chế độ ghim phòng thoại 24/7')
          .setRequired(false)
          .addChoices(
            { name: '🔒 Bật chế độ 24/7 (Không bao giờ rời phòng)', value: 'on' },
            { name: '🔓 Tắt chế độ 24/7', value: 'off' }
          )
      ),
    new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Dừng đài Lofi và cho bot rời khỏi phòng voice'),
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), {
        body: commands.map((c) => c.toJSON()),
      });
      console.log(`⚡ Đã đăng ký Slash Command cho Guild ID: ${process.env.GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands.map((c) => c.toJSON()),
      });
      console.log(`⚡ Đã đăng ký Slash Command toàn cầu!`);
    }
  } catch (err) {
    console.error('Lỗi đăng ký Slash Command:', err.message);
  }

  // Tự động vào lại phòng và phát tiếp nhạc nếu server có bật 24/7 (Auto-Resume on Reboot)
  setTimeout(async () => {
    const allConfigs = loadConfigs();
    for (const [gId, conf] of Object.entries(allConfigs)) {
      if (conf && conf.is247 && conf.voiceChannelId) {
        try {
          const guild = client.guilds.cache.get(gId) || (await client.guilds.fetch(gId).catch(() => null));
          if (!guild) continue;
          const vc = guild.channels.cache.get(conf.voiceChannelId) || (await guild.channels.fetch(conf.voiceChannelId).catch(() => null));
          if (!vc) continue;

          console.log(`[Auto-Resume]: Đang tự động kết nối lại kênh "${vc.name}" tại server "${guild.name}"...`);
          await playLofiStation({
            guild,
            voiceChannel: vc,
            stationId: conf.stationId || 'chill',
            is247: true,
          });
          console.log(`[Auto-Resume]: ✅ Đã phát tiếp đài Lofi thành công!`);
        } catch (resumeErr) {
          console.error(`[Auto-Resume Error ${gId}]:`, resumeErr.message);
        }
      }
    }
  }, 3000);
});

// ==========================================
// 7. XỬ LÝ LỆNH TƯƠNG TÁC (INTERACTIONS)
// ==========================================
client.on('interactionCreate', async (interaction) => {
  try {
    // Menu chọn đài Lofi
    if (interaction.isStringSelectMenu() && interaction.customId === 'lofi_select') {
      const chosenStationId = interaction.values[0];
      const session = activeSessions.get(interaction.guildId);
      const vc = interaction.member?.voice?.channel || (session?.voiceChannelId && interaction.guild.channels.cache.get(session.voiceChannelId));
      if (!vc) {
        return interaction.reply({ content: '⚠️ Bạn phải ở trong phòng thoại để đổi đài!', ephemeral: true });
      }

      await interaction.deferUpdate().catch(() => {});
      const { embed, components } = await playLofiStation({
        guild: interaction.guild,
        voiceChannel: vc,
        textChannel: interaction.channel,
        stationId: chosenStationId,
        is247: session?.is247 ?? true,
      });
      return interaction.editReply({ embeds: [embed], components }).catch(() => {});
    }

    // Các nút bấm điều khiển
    if (interaction.isButton()) {
      const customId = interaction.customId;
      const guildId = interaction.guildId;
      const session = getOrCreateSession(guildId);

      if (customId === 'lofi_toggle') {
        if (session.isPlaying) {
          session.player.pause();
          session.isPlaying = false;
        } else {
          if (session.player.state.status === AudioPlayerStatus.Idle) {
            const station = getStation(session.stationId);
            const res = createAudioResource(station.url, { inlineVolume: true });
            session.player.play(res);
          } else {
            session.player.unpause();
          }
          session.isPlaying = true;
        }

        const station = getStation(session.stationId);
        const vc = interaction.guild.channels.cache.get(session.voiceChannelId) || { id: session.voiceChannelId };
        const embed = buildLofiEmbed({ station, isPlaying: session.isPlaying, is247: session.is247, voiceChannel: vc });
        const components = buildLofiComponents({ currentStationId: station.id, isPlaying: session.isPlaying, is247: session.is247 });
        return interaction.update({ embeds: [embed], components }).catch(() => {});
      }

      if (customId === 'lofi_247') {
        session.is247 = !session.is247;
        setGuildConfig(guildId, { is247: session.is247 });
        const station = getStation(session.stationId);
        const vc = interaction.guild.channels.cache.get(session.voiceChannelId) || { id: session.voiceChannelId };
        const embed = buildLofiEmbed({ station, isPlaying: session.isPlaying, is247: session.is247, voiceChannel: vc });
        const components = buildLofiComponents({ currentStationId: station.id, isPlaying: session.isPlaying, is247: session.is247 });
        await interaction.update({ embeds: [embed], components }).catch(() => {});
        return interaction.followUp({
          content: session.is247 ? '🔒 **Đã BẬT chế độ 24/7!** Bot sẽ ở lì trong phòng và tự reconnect khi rớt mạng.' : '🔓 **Đã TẮT chế độ 24/7!**',
          ephemeral: true,
        }).catch(() => {});
      }

      if (customId === 'lofi_random') {
        const stationKeys = Object.keys(LOFI_STATIONS);
        const currentIdx = stationKeys.indexOf(session.stationId);
        const nextKey = stationKeys[(currentIdx + 1) % stationKeys.length];
        const vc = interaction.member?.voice?.channel || interaction.guild.channels.cache.get(session.voiceChannelId);
        if (!vc) return interaction.reply({ content: '⚠️ Bạn phải ở trong phòng thoại!', ephemeral: true });

        await interaction.deferUpdate().catch(() => {});
        const { embed, components } = await playLofiStation({
          guild: interaction.guild,
          voiceChannel: vc,
          textChannel: interaction.channel,
          stationId: nextKey,
          is247: session.is247,
        });
        return interaction.editReply({ embeds: [embed], components }).catch(() => {});
      }

      if (customId === 'lofi_stop') {
        stopLofi(guildId);
        return interaction.update({
          content: '👋 **Đã dừng phát đài Lofi và rời khỏi phòng thoại!** Hẹn gặp lại bạn.',
          embeds: [],
          components: [],
        }).catch(() => {});
      }
    }

    // Slash command /lofi
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'lofi') {
        const vc = interaction.member?.voice?.channel;
        if (!vc) {
          return interaction.reply({
            content: '⚠️ Bạn cần tham gia vào một **Kênh thoại (Voice Channel)** trước khi gọi đài Lofi!',
            ephemeral: true,
          });
        }

        await interaction.deferReply().catch(() => {});
        const stationId = interaction.options.getString('station') || 'chill';
        const mode247 = interaction.options.getString('mode247');
        const is247 = mode247 ? mode247 === 'on' : true;

        const { embed, components } = await playLofiStation({
          guild: interaction.guild,
          voiceChannel: vc,
          textChannel: interaction.channel,
          stationId,
          is247,
        });

        return interaction.editReply({ embeds: [embed], components }).catch(() => {});
      }

      if (interaction.commandName === 'stop') {
        stopLofi(interaction.guildId);
        return interaction.reply('🛑 **Đã dừng phát đài Lofi và rời khỏi phòng thoại!**');
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// ==========================================
// 8. XỬ LÝ LỆNH CHAT NHANH (PREFIX)
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim().toLowerCase();
  if (
    content.startsWith('!lofi') ||
    content === 'lofi' ||
    content === 'nhạc lofi' ||
    content === 'bật lofi' ||
    content === 'mở lofi' ||
    content === 'nghe lofi'
  ) {
    const vc = message.member?.voice?.channel;
    if (!vc) {
      return message.reply('⚠️ Bạn hãy vào một **Kênh thoại (Voice Channel)** trước rồi gọi `!lofi` nhé!');
    }

    const parts = content.split(/\s+/);
    if (parts.includes('stop') || parts.includes('tat') || parts.includes('dừng') || parts.includes('dưng')) {
      stopLofi(message.guild.id);
      return message.reply('🛑 **Đã dừng đài Lofi và rời khỏi phòng thoại!**');
    }

    let stationId = 'chill';
    let is247 = true;
    if (parts.includes('off') || parts.includes('tat247')) is247 = false;

    for (const key of Object.keys(LOFI_STATIONS)) {
      if (parts.includes(key)) {
        stationId = key;
        break;
      }
    }

    try {
      const { embed, components } = await playLofiStation({
        guild: message.guild,
        voiceChannel: vc,
        textChannel: message.channel,
        stationId,
        is247,
      });
      return message.reply({ embeds: [embed], components });
    } catch (err) {
      return message.reply(`❌ Lỗi mở đài: ${err.message}`);
    }
  }
});

// Đăng nhập bot
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('❌ Không thể đăng nhập Discord Bot:', err.message);
});
