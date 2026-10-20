const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  entersState,
} = require('@discordjs/voice');

// ==========================================
// 1. DANH SÁCH CÁC TRẠM RADIO LOFI 24/7 (DIRECT MP3 STREAM)
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

// ==========================================
// 2. QUẢN LÝ LƯU TRỮ CẤU HÌNH 24/7 (PERSISTENCE)
// ==========================================
const CONFIG_FILE = path.join(__dirname, 'data', 'lofi_config.json');

function ensureDataDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadAllLofiConfigs() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error('[LofiManager] Lỗi đọc lofi_config.json:', err.message);
    return {};
  }
}

function saveAllLofiConfigs(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LofiManager] Lỗi ghi lofi_config.json:', err.message);
  }
}

function getGuildLofiConfig(guildId) {
  const all = loadAllLofiConfigs();
  return all[guildId] || null;
}

function setGuildLofiConfig(guildId, config) {
  const all = loadAllLofiConfigs();
  all[guildId] = {
    ...all[guildId],
    ...config,
    updatedAt: Date.now(),
  };
  saveAllLofiConfigs(all);
}

function removeGuildLofiConfig(guildId) {
  const all = loadAllLofiConfigs();
  delete all[guildId];
  saveAllLofiConfigs(all);
}

// Bộ nhớ phiên Lofi đang hoạt động trên RAM
const activeLofiSessions = new Map();

function getStation(stationId) {
  return LOFI_STATIONS[stationId] || LOFI_STATIONS.chill;
}

// ==========================================
// 3. TẠO GIAO DIỆN EMBED VÀ NÚT BẤM (UI BUILDERS)
// ==========================================
function createLofiEmbed({ station, isPlaying, is247, voiceChannel }) {
  const embed = new EmbedBuilder()
    .setTitle(`📻 ĐÀI PHÁT THANH LOFI 24/7 • J.A.R.V.I.S. AUDIO`)
    .setDescription(
      `✨ **ĐANG PHÁT TRỰC TIẾP:** ${station.emoji} **${station.name}**\n` +
      `> *"${station.description}"*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📡 **Trạng thái:** ${isPlaying ? '🟢 Đang phát trực tiếp (Live Stream 24/7)' : '⏸️ Đang tạm dừng'}\n` +
      `🔒 **Chế độ 24/7:** ${is247 ? '🟢 **BẬT** (Tự reconnect, không bao giờ rời phòng)' : '⚪ **TẮT** (Sẽ rời khi dừng phát)'}\n` +
      `🔊 **Kênh thoại:** <#${voiceChannel.id}>\n` +
      `⚡ **Chất lượng:** \`192 kbps HD / Low Latency / Không quảng cáo\`\n\n` +
      `💡 *Mẹo: Chọn kênh đài ở menu bên dưới để đổi nhạc ngay lập tức! Bấm nút 🔒 để bật/tắt 24/7.*`
    )
    .setColor(station.color)
    .setThumbnail(station.thumbnail)
    .setFooter({
      text: 'J.A.R.V.I.S. Lofi Engine • Thư giãn, học tập & chơi game không ngắt quãng',
      iconURL: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
    })
    .setTimestamp();

  return embed;
}

function createLofiComponents({ currentStationId, isPlaying, is247 }) {
  // Menu chọn đài Lofi
  const menuOptions = Object.values(LOFI_STATIONS).map((st) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(st.name)
      .setDescription(st.description.slice(0, 50))
      .setValue(st.id)
      .setEmoji(st.emoji)
      .setDefault(st.id === currentStationId)
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('lofi_select_station')
    .setPlaceholder('📻 Chọn đài phát thanh Lofi khác...')
    .addOptions(menuOptions);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  // Hàng nút điều khiển
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lofi_toggle_play')
      .setLabel(isPlaying ? '⏸️ Tạm Dừng' : '▶️ Tiếp Tục')
      .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('lofi_toggle_247')
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
// 4. BỘ ĐIỀU PHỐI ÂM THANH & RECONNECT 24/7
// ==========================================
async function startLofiStream({
  guild,
  voiceChannel,
  textChannel = null,
  stationId = 'chill',
  is247 = true,
  getOrCreateVoiceSession,
}) {
  const guildId = guild.id;
  const station = getStation(stationId);
  const session = getOrCreateVoiceSession(guildId);

  // Tạm dừng / làm trống hàng đợi bài hát YouTube/SoundCloud cũ
  session.musicQueue.songs = [];
  session.musicQueue.currentSong = {
    title: `[Lofi Radio 24/7] ${station.name}`,
    artist: 'Lofi 24/7 Live Stream',
    url: station.url,
    originalUrl: station.url,
    thumbnail: station.thumbnail,
    duration: '24/7 Live Stream',
    sourceType: 'direct',
  };
  session.musicQueue.isPlaying = true;
  if (textChannel) session.musicQueue.textChannel = textChannel;

  // Đánh dấu trạng thái Lofi cho session
  session.lofiState = {
    isLofi: true,
    stationId: station.id,
    is247: is247,
    voiceChannelId: voiceChannel.id,
    textChannelId: textChannel?.id || null,
  };

  // 1. Kết nối vào Voice Channel (Hủy kết nối cũ bị kẹt nếu có)
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
    session.boundChannels.add(voiceChannel.id);
    if (textChannel) session.boundChannels.add(textChannel.id);
  }

  // Chờ Voice Connection đạt trạng thái Ready trước khi phát
  try {
    await entersState(conn, VoiceConnectionStatus.Ready, 15_000);
  } catch (readyErr) {
    console.warn('[Lofi 24/7] Chờ kết nối voice Ready:', readyErr.message);
  }

  // 2. Tạo Audio Resource từ URL trực tiếp
  const resource = createAudioResource(station.url, { inlineVolume: true });
  if (resource.playStream) {
    resource.playStream.on('error', (streamErr) => {
      console.warn('[Lofi Stream Resource Error]:', streamErr.message);
    });
  }
  conn.subscribe(session.musicPlayer);
  session.musicPlayer.play(resource);
  session.musicPlayer.unpause();

  // 3. Cập nhật cache phiên Lofi
  activeLofiSessions.set(guildId, {
    guildId,
    voiceChannelId: voiceChannel.id,
    textChannelId: textChannel?.id || null,
    stationId: station.id,
    is247,
    isPlaying: true,
  });

  // 4. Lưu vào file cấu hình nếu bật 24/7
  if (is247) {
    setGuildLofiConfig(guildId, {
      guildId,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel?.id || null,
      stationId: station.id,
      is247: true,
    });
  }

  // 5. Gắn listener tự động Reconnect khi mất mạng / đổi IP Voice Server
  if (!conn.__lofiReconnectAttached) {
    conn.__lofiReconnectAttached = true;

    conn.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5000),
        ]);
        // Tự phục hồi thành công
      } catch (err) {
        // Thực sự rớt kết nối
        const currentConf = getGuildLofiConfig(guildId);
        if (currentConf && currentConf.is247) {
          console.log(`[Lofi 24/7]: Phát hiện rớt kết nối voice tại ${guild.name}, tự động reconnect sau 3 giây...`);
          setTimeout(async () => {
            try {
              const freshVC = guild.channels.cache.get(currentConf.voiceChannelId) || (await guild.channels.fetch(currentConf.voiceChannelId).catch(() => null));
              if (freshVC) {
                await startLofiStream({
                  guild,
                  voiceChannel: freshVC,
                  textChannel,
                  stationId: currentConf.stationId,
                  is247: true,
                  getOrCreateVoiceSession,
                });
              }
            } catch (reconnErr) {
              console.error(`[Lofi 24/7 Reconnect Error]:`, reconnErr.message);
            }
          }, 3000);
        }
      }
    });
  }

  // 6. Gắn listener tự động lặp đài nếu stream bị gián đoạn (Auto-Loop Stream)
  if (!session.musicPlayer.__lofiLoopAttached) {
    session.musicPlayer.__lofiLoopAttached = true;

    session.musicPlayer.on(AudioPlayerStatus.Idle, () => {
      const active = activeLofiSessions.get(guildId);
      if (active && active.isPlaying && session.lofiState?.isLofi) {
        console.log(`[Lofi 24/7]: Luồng đài hoàn tất hoặc gián đoạn, tự động nạp lại stream cho guild ${guildId}...`);
        setTimeout(() => {
          try {
            const currentStation = getStation(active.stationId);
            const newRes = createAudioResource(currentStation.url, { inlineVolume: true });
            const liveConn = getVoiceConnection(guildId);
            if (liveConn) liveConn.subscribe(session.musicPlayer);
            session.musicPlayer.play(newRes);
            session.musicPlayer.unpause();
          } catch (loopErr) {
            console.error('[Lofi 24/7 Loop Error]:', loopErr.message);
          }
        }, 1500);
      }
    });
  }

  const embed = createLofiEmbed({ station, isPlaying: true, is247, voiceChannel });
  const components = createLofiComponents({ currentStationId: station.id, isPlaying: true, is247 });

  return { embed, components, station };
}

// Dừng phát và rời phòng
async function stopLofiStream(guildId, disconnect = true) {
  const active = activeLofiSessions.get(guildId);
  if (active) {
    active.isPlaying = false;
  }
  removeGuildLofiConfig(guildId);
  activeLofiSessions.delete(guildId);

  const conn = getVoiceConnection(guildId);
  if (conn && disconnect) {
    try {
      conn.destroy();
    } catch (_) {}
  }
}

// ==========================================
// 5. TỰ ĐỘNG PHỤC HỒI KHI BOT REBOOT (AUTO-RESUME ON READY)
// ==========================================
async function initLofiAutoResume(client, getOrCreateVoiceSession) {
  console.log('[Lofi 24/7]: Đang kiểm tra danh sách các server cần tự động phát nhạc 24/7...');
  const allConfigs = loadAllLofiConfigs();
  const guildIds = Object.keys(allConfigs);

  let resumedCount = 0;
  for (const gId of guildIds) {
    const conf = allConfigs[gId];
    if (conf && conf.is247 && conf.voiceChannelId) {
      try {
        const guild = client.guilds.cache.get(gId) || (await client.guilds.fetch(gId).catch(() => null));
        if (!guild) continue;

        const voiceChannel = guild.channels.cache.get(conf.voiceChannelId) || (await guild.channels.fetch(conf.voiceChannelId).catch(() => null));
        if (!voiceChannel) continue;

        let textChannel = null;
        if (conf.textChannelId) {
          textChannel = guild.channels.cache.get(conf.textChannelId) || (await guild.channels.fetch(conf.textChannelId).catch(() => null));
        }

        await startLofiStream({
          guild,
          voiceChannel,
          textChannel,
          stationId: conf.stationId || 'chill',
          is247: true,
          getOrCreateVoiceSession,
        });

        resumedCount++;
        console.log(`[Lofi 24/7]: ✅ Tự động kết nối lại kênh "${voiceChannel.name}" tại server "${guild.name}"!`);
      } catch (resumeErr) {
        console.error(`[Lofi 24/7]: Lỗi tự động phục hồi cho guild ${gId}:`, resumeErr.message);
      }
    }
  }

  if (resumedCount > 0) {
    console.log(`[Lofi 24/7]: Đã phục hồi thành công ${resumedCount} đài Lofi 24/7 trực tuyến!`);
  } else {
    console.log('[Lofi 24/7]: Chưa có server nào bật chế độ ghim kênh 24/7.');
  }
}

// ==========================================
// 6. XỬ LÝ LỆNH SLASH & BUTTON ROUTER
// ==========================================
async function handleLofiSlashCommand(interaction, getOrCreateVoiceSession) {
  const memberVoiceChannel = interaction.member?.voice?.channel;
  if (!memberVoiceChannel) {
    return interaction.reply({
      content: '⚠️ Đạo hữu cần tham gia vào một **Kênh thoại (Voice Channel)** trước khi bật đài Lofi!',
      ephemeral: true,
    });
  }

  await interaction.deferReply().catch(() => {});

  const stationId = interaction.options.getString('station') || 'chill';
  const mode247Option = interaction.options.getString('mode247');
  const is247 = mode247Option ? mode247Option === 'on' : true;

  try {
    const { embed, components } = await startLofiStream({
      guild: interaction.guild,
      voiceChannel: memberVoiceChannel,
      textChannel: interaction.channel,
      stationId,
      is247,
      getOrCreateVoiceSession,
    });

    return interaction.editReply({ embeds: [embed], components });
  } catch (err) {
    console.error('[handleLofiSlashCommand Error]:', err);
    return interaction.editReply({
      content: `❌ Không thể mở đài Lofi: ${err.message}`,
    });
  }
}

async function handleLofiButtonInteraction(interaction, getOrCreateVoiceSession) {
  const customId = interaction.customId;
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const session = getOrCreateVoiceSession(guildId);
  let active = activeLofiSessions.get(guildId);

  // Nếu bot bị restart trên RAM nhưng cấu hình còn
  if (!active) {
    const saved = getGuildLofiConfig(guildId);
    if (saved) {
      active = { ...saved, isPlaying: true };
      activeLofiSessions.set(guildId, active);
    }
  }

  if (customId === 'lofi_toggle_play') {
    if (!active) {
      return interaction.reply({ content: '⚠️ Đài Lofi chưa được khởi động!', ephemeral: true });
    }

    if (active.isPlaying) {
      session.musicPlayer.pause();
      active.isPlaying = false;
    } else {
      const conn = getVoiceConnection(guildId);
      if (conn) conn.subscribe(session.musicPlayer);
      if (session.musicPlayer.state.status === AudioPlayerStatus.Idle) {
        const station = getStation(active.stationId);
        const res = createAudioResource(station.url, { inlineVolume: true });
        session.musicPlayer.play(res);
      } else {
        session.musicPlayer.unpause();
      }
      active.isPlaying = true;
    }

    const station = getStation(active.stationId);
    const vc = guild.channels.cache.get(active.voiceChannelId) || { id: active.voiceChannelId };
    const embed = createLofiEmbed({ station, isPlaying: active.isPlaying, is247: active.is247, voiceChannel: vc });
    const components = createLofiComponents({ currentStationId: station.id, isPlaying: active.isPlaying, is247: active.is247 });

    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'lofi_toggle_247') {
    if (!active) {
      return interaction.reply({ content: '⚠️ Đài Lofi chưa được khởi động!', ephemeral: true });
    }

    active.is247 = !active.is247;
    setGuildLofiConfig(guildId, { is247: active.is247 });

    const station = getStation(active.stationId);
    const vc = guild.channels.cache.get(active.voiceChannelId) || { id: active.voiceChannelId };
    const embed = createLofiEmbed({ station, isPlaying: active.isPlaying, is247: active.is247, voiceChannel: vc });
    const components = createLofiComponents({ currentStationId: station.id, isPlaying: active.isPlaying, is247: active.is247 });

    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({
      content: active.is247
        ? '🔒 **Đã BẬT chế độ 24/7!** Bot sẽ ở lì trong phòng thoại, tự reconnect khi rớt mạng và tự phát lại khi bot khởi động lại!'
        : '🔓 **Đã TẮT chế độ 24/7!** Bot sẽ không tự động reconnect khi rời phòng.',
      ephemeral: true,
    }).catch(() => {});
  }

  if (customId === 'lofi_random') {
    const stationKeys = Object.keys(LOFI_STATIONS);
    const currentIdx = stationKeys.indexOf(active?.stationId || 'chill');
    const nextKey = stationKeys[(currentIdx + 1) % stationKeys.length];

    const memberVoiceChannel = interaction.member?.voice?.channel || (guild.channels.cache.get(active?.voiceChannelId));
    if (!memberVoiceChannel) {
      return interaction.reply({ content: '⚠️ Không tìm thấy kênh thoại để phát đài mới!', ephemeral: true });
    }

    await interaction.deferUpdate().catch(() => {});
    const { embed, components } = await startLofiStream({
      guild,
      voiceChannel: memberVoiceChannel,
      textChannel: interaction.channel,
      stationId: nextKey,
      is247: active?.is247 ?? true,
      getOrCreateVoiceSession,
    });

    return interaction.editReply({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'lofi_stop') {
    await stopLofiStream(guildId, true);
    return interaction.update({
      content: '👋 **Đã dừng phát đài Lofi và rời khỏi kênh thoại!** Hẹn gặp lại các bạn.',
      embeds: [],
      components: [],
    }).catch(() => {});
  }
}

async function handleLofiSelectMenu(interaction, getOrCreateVoiceSession) {
  const chosenStationId = interaction.values[0];
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const active = activeLofiSessions.get(guildId) || getGuildLofiConfig(guildId);

  const memberVoiceChannel = interaction.member?.voice?.channel || (guild.channels.cache.get(active?.voiceChannelId));
  if (!memberVoiceChannel) {
    return interaction.reply({ content: '⚠️ Bạn phải ở trong kênh thoại để đổi đài phát!', ephemeral: true });
  }

  await interaction.deferUpdate().catch(() => {});

  const { embed, components } = await startLofiStream({
    guild,
    voiceChannel: memberVoiceChannel,
    textChannel: interaction.channel,
    stationId: chosenStationId,
    is247: active?.is247 ?? true,
    getOrCreateVoiceSession,
  });

  return interaction.editReply({ embeds: [embed], components }).catch(() => {});
}

async function handleLofiMessageCommand(message, getOrCreateVoiceSession) {
  const memberVoiceChannel = message.member?.voice?.channel;
  if (!memberVoiceChannel) {
    return message.reply('⚠️ Đạo hữu cần tham gia vào một **Kênh thoại (Voice Channel)** trước khi bật đài Lofi!');
  }

  const content = message.content.trim().toLowerCase();
  const parts = content.split(/\s+/);
  let stationId = 'chill';
  let is247 = true;

  if (parts.includes('stop') || parts.includes('tat') || parts.includes('dừng') || parts.includes('ngung')) {
    await stopLofiStream(message.guild.id, true);
    return message.reply('🛑 **Đã dừng phát đài Lofi và rời khỏi kênh thoại!**');
  }

  if (parts.includes('off') || parts.includes('tat247')) {
    is247 = false;
  }

  for (const key of Object.keys(LOFI_STATIONS)) {
    if (parts.includes(key)) {
      stationId = key;
      break;
    }
  }

  try {
    const { embed, components } = await startLofiStream({
      guild: message.guild,
      voiceChannel: memberVoiceChannel,
      textChannel: message.channel,
      stationId,
      is247,
      getOrCreateVoiceSession,
    });
    return message.reply({ embeds: [embed], components });
  } catch (err) {
    return message.reply(`❌ Không thể mở đài Lofi: ${err.message}`);
  }
}

module.exports = {
  LOFI_STATIONS,
  getStation,
  startLofiStream,
  stopLofiStream,
  createLofiEmbed,
  createLofiComponents,
  initLofiAutoResume,
  handleLofiSlashCommand,
  handleLofiButtonInteraction,
  handleLofiSelectMenu,
  handleLofiMessageCommand,
  getGuildLofiConfig,
};
