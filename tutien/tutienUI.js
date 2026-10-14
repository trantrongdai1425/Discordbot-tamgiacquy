const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

const {
  REALMS,
  RACES_CONFIG,
  SPIRITUAL_ROOTS,
  APTITUDES,
  PHYSIQUES,
  SKILLS_CONFIG,
  BLOODLINES_CONFIG,
  HUNTING_ZONES,
  getCalculatedStats
} = require('./gameEngine');

// Bảng màu cổ phong theo Chủng Tộc
const RACE_COLORS = {
  Tien: 0xFFD700, // Vàng Kim Hoàng Gia
  Ma:   0x8B0000, // Đỏ Huyết Nguyệt
  Yeu:  0x00FF7F, // Xanh Lục Yêu Khí
  Minh: 0x9932CC, // Tím U Hồn
  Nhan: 0x1E90FF  // Xanh Lam Thiên Đạo
};

// Hàm vẽ thanh tiến trình tu vi đẹp mắt
function renderProgressBar(current, max, size = 12) {
  if (max <= 0) return '`[████████████]` 100%';
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  const percent = (ratio * 100).toFixed(1);
  return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` **${percent}%**`;
}

// MENU THẢ XUỐNG ĐIỀU HƯỚNG TẤT CẢ TÍNH NĂNG (FEATURE SELECT MENU)
function createFeatureSelectMenu(activeFeature = 'profile') {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('tutien_feature_menu')
    .setPlaceholder('📜 Khám Phá Tam Thiên Đại Đạo (Chuyển tính năng)...')
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel('Bản Mệnh Tu Sĩ & Tu Luyện')
        .setDescription('Xem thẻ căn cước, tu vi, cảnh giới và thuộc tính')
        .setValue('feature_profile')
        .setEmoji('🥋')
        .setDefault(activeFeature === 'profile'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Bãi Săn Yêu Thú')
        .setDescription('Lịch luyện trảm yêu thú, đoạt yêu đan & linh thạch')
        .setValue('feature_hunt')
        .setEmoji('🗡️')
        .setDefault(activeFeature === 'hunt'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Boss Thế Giới: Trảm Lư Ma Tôn')
        .setDescription('Hợp lực toàn server phong ấn Ma Thần 5.000.000 HP')
        .setValue('feature_boss')
        .setEmoji('🐉')
        .setDefault(activeFeature === 'boss'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Luyện Đan Phòng')
        .setDescription('Chế tạo Thể Lực Đan, Hộ Mạch Đan, Tụ Khí Đan, Tẩy Tủy Đan')
        .setValue('feature_alchemy')
        .setEmoji('⚗️')
        .setDefault(activeFeature === 'alchemy'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Dược Điền Động Phủ')
        .setDescription('Múc nước Giếng Tiên, tưới nước, bón phân, thu hoạch linh thảo')
        .setValue('feature_farm')
        .setEmoji('🌿')
        .setDefault(activeFeature === 'farm'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Bế Quan Tẩy Độc & Đạo Cơ')
        .setDescription('Bài trừ cặn bã Đan Độc, củng cố độ vững chắc đan điền')
        .setValue('feature_cleanse')
        .setEmoji('🧪')
        .setDefault(activeFeature === 'cleanse'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Trích Xuất Tụ Linh Đỉnh')
        .setDescription('Chuyển tu vi dôi dư từ kiếp trước vào đan điền')
        .setValue('feature_reservoir')
        .setEmoji('🏔️')
        .setDefault(activeFeature === 'reservoir'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Tẩy Tủy Hoán Cốt (Đổi Thể Chất)')
        .setDescription('Gieo lại thể chất (Thần Thể, Thánh Thể, Vương Thể)')
        .setValue('feature_physique')
        .setEmoji('✨')
        .setDefault(activeFeature === 'physique'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Công Pháp & Thần Thú Huyết Mạch')
        .setDescription('Lĩnh ngộ bí kíp, tôi luyện huyết mạch tăng vĩnh viễn uy lực')
        .setValue('feature_skills')
        .setEmoji('📖')
        .setDefault(activeFeature === 'skills'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Càn Khôn Bảo Túi (Túi Đồ & Cắn Đan)')
        .setDescription('Quản lý đan dược, yêu đan, sử dụng vật phẩm tức thì')
        .setValue('feature_inventory')
        .setEmoji('🎒')
        .setDefault(activeFeature === 'inventory'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Hòm Thư Tiên Tín (Nhận Quà Khởi Đầu)')
        .setDescription('Kiểm tra tiên thư, nhận 1.000 Linh Thạch và quà hỗ trợ')
        .setValue('feature_mailbox')
        .setEmoji('📬')
        .setDefault(activeFeature === 'mailbox'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Thiên Kiêu Bảng (Bảng Xếp Hạng)')
        .setDescription('Vinh danh đệ nhất cao thủ cảnh giới toàn server')
        .setValue('feature_leaderboard')
        .setEmoji('🏆')
        .setDefault(activeFeature === 'leaderboard')
    ]);

  return new ActionRowBuilder().addComponents(menu);
}

// 1. EMBED THẺ CĂN CƯỚC BẢN MỆNH TU SĨ
function createCharacterEmbed(char, user) {
  const stats = getCalculatedStats(char);
  const race = RACES_CONFIG[char.race] || RACES_CONFIG.Nhan;
  const color = RACE_COLORS[char.race] || 0xFFD700;
  const root = SPIRITUAL_ROOTS[char.spiritualRoot] || { name: 'Phàm Linh Căn', element: char.element || 'Hỗn Tạp' };
  const aptitude = APTITUDES[char.aptitude] || { name: char.aptitude || 'Bình Thường' };

  const expBar = renderProgressBar(char.exp, stats.maxExp, 14);

  // Đánh giá tình trạng Đan Độc
  let toxinStatus = '🟢 Thanh Khiết';
  if (stats.pillToxins > 70) toxinStatus = '🔴 Độc Khí Ngập Tâm (Giảm 15% Uy Lực)';
  else if (stats.pillToxins > 40) toxinStatus = '🟡 Cặn Bã Đan Khí (Cần Thanh Lọc)';

  const canBreakthrough = char.exp >= stats.maxExp;
  const readyNotice = canBreakthrough
    ? '\n> ⚡ **KHÍ HẢI ĐÃ ĐẦY! ĐẠO HỮU ĐÃ CÓ THỂ TIẾN HÀNH NGHÊNH ĐÓN LÔI KIẾP!**'
    : '';

  const embed = new EmbedBuilder()
    .setTitle(`🌌 TU CHÂN GIỚI • BẢN MỆNH TIÊN TỰ`)
    .setDescription(
      `### 🪪 Đạo Hiệu: **${char.name}**\n` +
      `*${char.activeTitle || 'Tân Thủ Nhập Đạo'}* • Phụng sự dưới vòm trời <@${user.id}>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${readyNotice}`
    )
    .setColor(color)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      {
        name: '🏮 TIÊN THIÊN BẢN MỆNH',
        value:
          `• **Chủng Tộc:** ${race.symbol} **${race.name}**\n` +
          `• **Ngũ Hành:** 🌀 **Hệ ${char.element || 'Hỏa'}**\n` +
          `• **Linh Căn:** 🔮 **${root.name || char.spiritualRoot}**\n` +
          `• **Thể Chất:** ✨ **${char.physique || 'Phàm Thai Nhục Thân'}**\n` +
          `• **Tư Chất:** 📜 **${aptitude.name || char.aptitude}**`,
        inline: true
      },
      {
        name: '🥋 TU VI & CẢNH GIỚI',
        value:
          `• **Cảnh Giới:** 👑 **${stats.realmName}**\n` +
          `• **Tốc Độ:** ⚡ \`+${stats.expPerSec} Tu Vi / giây\`\n` +
          `• **Tiến Độ:**\n${expBar}\n` +
          `• **Tích Lũy:** \`${Math.floor(char.exp).toLocaleString('vi-VN')} / ${stats.maxExp.toLocaleString('vi-VN')} Exp\`\n` +
          `• **Tụ Linh Đỉnh:** 🏔️ \`${Math.floor(char.spiritReservoir?.storedExp || 0).toLocaleString('vi-VN')} Exp\``,
        inline: true
      },
      {
        name: '⚔️ THUỘC TÍNH CHIẾN ĐẤU',
        value:
          `• 🩸 **Khí Huyết:** \`${Math.floor(char.currentHp || stats.hp).toLocaleString()} / ${stats.hp.toLocaleString()} HP\`\n` +
          `• ⚔️ **Công Kích:** \`${stats.atk.toLocaleString()}\`\n` +
          `• 🛡️ **Phòng Ngự:** \`${stats.def.toLocaleString()}\`\n` +
          `• 💨 **Thân Pháp:** \`${stats.speed.toLocaleString()}\`\n` +
          `• 💪 **Thể Lực:** \`${char.stamina || 100} / ${char.maxStamina || 100}\``,
        inline: true
      },
      {
        name: '💎 TÀI BẢO & ĐẠO CƠ',
        value:
          `• 💰 **Linh Thạch:** \`${(char.spiritStones || 0).toLocaleString('vi-VN')}\` viên\n` +
          `• ☠️ **Đan Độc:** \`${stats.pillToxins || 0}%\` (${toxinStatus})\n` +
          `• 🏛️ **Đạo Cơ:** \`${char.foundation?.purity || 100}% Thuần Khiết\`\n` +
          `• 🎒 **Túi Trữ Vật:** \`${Object.keys(char.inventory || {}).length}\` chủng loại vật phẩm`,
        inline: true
      }
    )
    .setFooter({
      text: `Tu Chân Giới • Nhấn nút hoặc chọn menu bên dưới để khám phá tất cả tính năng!`,
      iconURL: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png'
    })
    .setTimestamp();

  return embed;
}

// 2. CÁC NÚT BẤM ĐIỀU KHIỂN CHÍNH (QUICK ACTION ROWS)
function createMainActionRows(char) {
  const stats = getCalculatedStats(char);
  const canBreakthrough = char.exp >= stats.maxExp;

  const selectRow = createFeatureSelectMenu('profile');

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_cultivate')
      .setLabel('🧘 Bế Quan Tu Luyện')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('tutien_breakthrough')
      .setLabel(canBreakthrough ? '⚡ NGHÊNH ĐÓN LÔI KIẾP (ĐỦ TU VI)' : '⚡ Độ Kiếp Đột Phá')
      .setStyle(canBreakthrough ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_hunt_menu')
      .setLabel('🗡️ Săn Yêu Thú')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('tutien_boss')
      .setLabel('🐉 Trảm Lư Ma Tôn')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_alchemy_view')
      .setLabel('⚗️ Luyện Đan')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_farm_view')
      .setLabel('🌿 Dược Điền')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_cleanse_view')
      .setLabel('🧪 Tẩy Đan Độc')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_inventory')
      .setLabel('🎒 Túi Trữ Vật')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_refresh')
      .setLabel('🔄 Làm Mới')
      .setStyle(ButtonStyle.Secondary)
  );

  return [selectRow, row1, row2];
}

// 3. EMBED BẾ QUAN THU HOẠCH
function createCultivateResultEmbed(char, gainedExp, offlineSeconds, aiMessage = null) {
  const stats = getCalculatedStats(char);
  const color = RACE_COLORS[char.race] || 0xFFD700;

  const desc = aiMessage
    ? `> *"${aiMessage}"*\n\n`
    : '';

  const embed = new EmbedBuilder()
    .setTitle(`🧘 THIỀN ĐỊNH BẾ QUAN • ĐỐN NGỘ ĐẠO HẠNH`)
    .setDescription(
      desc +
      `Đạo hữu **${char.name}** bế quan hấp thu thiên địa linh khí trong **${offlineSeconds} giây**!\n\n` +
      `✨ **Tu Vi Tăng Cường:** \`+${Math.floor(gainedExp).toLocaleString('vi-VN')} Exp\`\n` +
      `🔮 **Tu Vi Hiện Tại:** \`${Math.floor(char.exp).toLocaleString('vi-VN')} / ${stats.maxExp.toLocaleString('vi-VN')} Exp\`\n` +
      `⚡ **Tiến Độ Cảnh Giới:**\n${renderProgressBar(char.exp, stats.maxExp, 14)}`
    )
    .setColor(color)
    .setFooter({ text: 'Tu Chân Giới • Tu vi tự động sinh ra từng giây khi đạo hữu online/offline!' })
    .setTimestamp();

  return embed;
}

// 4. EMBED LÔI KIẾP ĐỘ KIẾP
function createTribulationEmbed(char, tribResult, aiStory = null) {
  const isWin = tribResult.success;
  const color = isWin ? 0xFFD700 : 0x8B0000;

  let strikeDetails = (tribResult.strikes || []).map(s => {
    return `⚡ **Đạo Lôi thứ ${s.strikeIndex}:** Gây \`${s.damage}\` sát thương (Khí huyết còn: \`${s.remainingHp}\`)`;
  }).join('\n');

  let storyText = aiStory
    ? `### 📜 THIÊN ĐẠO CHỨNG GIÁM (Thiên Cơ Kể Lại)\n> *"${aiStory}"*\n\n`
    : '';

  let resultHeader = isWin
    ? `🎉 **ĐỘ KIẾP THÀNH CÔNG! ĐẮC ĐẠO THĂNG HOA!**\nChúc mừng đạo hữu phá vỡ bình cảnh, chính thức bước vào cảnh giới: **${tribResult.nextRealmName}**!`
    : `💀 **ĐỘ KIẾP THẤT BẠI! CHÂN THÂN CHẤN THƯƠNG!**\nLôi kiếp quá đỗi cuồng bạo, đạo cơ của đạo hữu bị chấn thương, khí huyết suy kiệt! Hãy hồi phục và cắn đan hộ mạch trước khi thử lại!`;

  const embed = new EmbedBuilder()
    .setTitle(isWin ? `⚡ ĐỘ KIẾP ĐÀI • CỬU TRỌNG LÔI KIẾP THĂNG HOA` : `⚡ ĐỘ KIẾP ĐÀI • LÔI PHẠT TRỜI GIÁNG THẤT BẠI`)
    .setDescription(
      storyText +
      `**Đạo Hữu:** \`${char.name}\` (${RACES_CONFIG[char.race]?.name || 'Tu Sĩ'})\n` +
      `**Quy Mô Kiếp Nạn:** ${tribResult.isMajor ? '⚡⚡⚡ **ĐẠI THIÊN KIẾP (5 Đạo Lôi Đình)**' : '⚡ **TIỂU THIÊN KIẾP (3 Đạo Lôi Đình)**'}\n\n` +
      `**Chi Tiết Oanh Kích:**\n${strikeDetails}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      resultHeader
    )
    .setColor(color)
    .setFooter({ text: isWin ? 'Tiên lộ thênh thang, chúc đạo hữu sớm ngày phi thăng!' : 'Thất bại là mẹ thành công, hãy kiên trì tu dưỡng!' })
    .setTimestamp();

  return embed;
}

// 5. EMBED CHIẾN ĐẤU BÃI SĂN
function createCombatEmbed(char, monster, combatResult, loot = null) {
  const isWin = combatResult.isWin;
  const color = isWin ? 0x00FF7F : 0xFF4500;

  const sampleLogs = (combatResult.logs || []).slice(-6).join('\n');

  let lootText = '';
  if (isWin && loot) {
    let itemStrs = (loot.items || []).map(i => `• ${i.name} x${i.count || 1}`).join('\n');
    lootText =
      `\n🎁 **CHIẾN LỢI PHẨM THU ĐƯỢC:**\n` +
      `• 🔮 **Tu Vi:** \`+${loot.exp} Exp\`\n` +
      `• 💰 **Linh Thạch:** \`+${loot.stones} viên\`\n` +
      (itemStrs ? `${itemStrs}\n` : '');
  }

  const embed = new EmbedBuilder()
    .setTitle(isWin ? `🗡️ TRẢM YÊU ĐẮC THẮNG: [${monster.name}]` : `💀 HUNG THÚ TRUY SÁT: THẤT BẠI TRƯỚC [${monster.name}]`)
    .setDescription(
      `**Tu Sĩ:** \`${char.name}\` ⚔️ **Yêu Thú:** \`${monster.name}\` (Hệ ${monster.element})\n` +
      `**Tổng Số Hiệp Đấu:** \`${combatResult.rounds} hiệp\`\n` +
      `**Khí Huyết Còn Lại:** \`${combatResult.remainingPlayerHp} HP\`\n\n` +
      `📜 **DIỄN BIẾN CHIẾN TRƯỜNG:**\n${sampleLogs}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` +
      lootText
    )
    .setColor(color)
    .setFooter({ text: 'Bãi Săn Tu Chân Giới • Hãy giữ Khí Huyết và Thể Lực dồi dào khi săn thú!' })
    .setTimestamp();

  return embed;
}

// 6. EMBED WORLD BOSS TRẢM LƯ MA TÔN
function createWorldBossEmbed(boss, char, playerDmg = 0) {
  const hpBar = renderProgressBar(boss.currentHp, boss.maxHp, 16);
  const isAlive = boss.isAlive && boss.currentHp > 0;

  let topDps = Object.entries(boss.dpsTable || {})
    .sort((a, b) => b[1].damage - a[1].damage)
    .slice(0, 5)
    .map(([uid, data], idx) => `**#${idx + 1}.** ${data.name} (\`${data.realmName}\`): \`${Math.floor(data.damage).toLocaleString('vi-VN')} Sát Thương\``)
    .join('\n') || '*Chưa có đạo hữu nào ra tay!*';

  const embed = new EmbedBuilder()
    .setTitle(`🐉 BOSS THẾ GIỚI • ${boss.name}`)
    .setDescription(
      `*${boss.title || 'Thái Cổ Hung Thú Giáng Lâm'}*\n\n` +
      `**Trạng Thái:** ${isAlive ? '🔥 **ĐANG CUỒNG NỘ HOÀNH HÀNH!**' : '💤 **ĐÃ BỊ PHONG ẤN (Chờ hồi sinh)**'}\n` +
      `**Khí Huyết:** \`${Math.floor(boss.currentHp).toLocaleString('vi-VN')} / ${boss.maxHp.toLocaleString('vi-VN')} HP\`\n` +
      `${hpBar}\n\n` +
      `⚔️ **Sức Mạnh Ma Tôn:** Công Kích \`${boss.atk}\` | Phòng Ngự \`${boss.def}\`\n` +
      (playerDmg > 0 ? `💥 **Bạn vừa đánh trúng Ma Tôn gây:** \`${Math.floor(playerDmg).toLocaleString('vi-VN')} Sát Thương\`!\n\n` : '\n') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 **BẢNG VÀNG CÔNG THẦN (TOP DPS):**\n${topDps}`
    )
    .setColor(isAlive ? 0x8B0000 : 0x708090)
    .setFooter({ text: 'Toàn server cùng hợp lực trảm yêu trừ ma để nhận đại phúc duyên!' })
    .setTimestamp();

  return embed;
}

// 7. EMBED LUYỆN ĐAN PHÒNG (ALCHEMY)
function createAlchemyEmbed(char, user) {
  const inv = char.inventory || {};
  const linhChi = inv['thao_duoc_linh_chi'] || 0;
  const hoangTinh = inv['thao_duoc_hoang_tinh'] || 0;
  const nuocLinhKhi = inv['nuoc_linh_khi'] || 0;
  const yeuDan1 = inv['yeu_dan_1'] || 0;
  const yeuDan2 = inv['yeu_dan_2'] || 0;

  const embed = new EmbedBuilder()
    .setTitle(`⚗️ THÁI CỔ ĐAN ĐẠO • LUYỆN ĐAN PHÒNG`)
    .setDescription(
      `Chủ nhân: <@${user.id}> • Đạo Hiệu: **${char.name}**\n` +
      `*Luyện chế thiên địa kỳ đan, nghịch chuyển càn khôn thọ mệnh!*\n\n` +
      `🌿 **NGUYÊN LIỆU TRONG TÚI:**\n` +
      `• Thảo Dược Linh Chi: \`${linhChi}\` | Hoàng Tinh: \`${hoangTinh}\`\n` +
      `• Nước Linh Khí: \`${nuocLinhKhi}\` | Yêu Đan Giai 1: \`${yeuDan1}\` | Yêu Đan Giai 2: \`${yeuDan2}\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📜 **DANH MỤC ĐAN PHƯƠNG KHẢ DỤNG:**\n` +
      `1. 💊 **Thể Lực Đan:** (+50 Thể Lực) — Cần \`5x Linh Chi\`\n` +
      `2. 🛡️ **Hộ Mạch Đan:** (Chặn 40% sát thương Lôi Kiếp) — Cần \`8x Linh Chi + 5x Nước Linh Khí\`\n` +
      `3. 🔮 **Tụ Khí Đan:** (+500 Tu Vi lập tức) — Cần \`1x Yêu Đan 1 + 5x Linh Chi\`\n` +
      `4. 🌿 **Trúc Cơ Linh Đan:** (+3.000 Tu Vi lập tức) — Cần \`1x Yêu Đan 2 + 8x Hoàng Tinh\`\n` +
      `5. 🧪 **Tẩy Tủy Đan:** (Thanh trừ 25% Đan Độc) — Cần \`10x Linh Chi + 5x Nước Linh Khí\``
    )
    .setColor(0xE67E22)
    .setFooter({ text: 'Nhấn các nút bên dưới để bắt đầu luyện đan!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('alchemy');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_craft_the_luc')
      .setLabel('💊 Luyện Thể Lực Đan')
      .setStyle(ButtonStyle.Success)
      .setDisabled(linhChi < 5),
    new ButtonBuilder()
      .setCustomId('tutien_craft_ho_mach')
      .setLabel('🛡️ Luyện Hộ Mạch Đan')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(linhChi < 8 || nuocLinhKhi < 5),
    new ButtonBuilder()
      .setCustomId('tutien_craft_tu_khi')
      .setLabel('🔮 Luyện Tụ Khí Đan')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(yeuDan1 < 1 || linhChi < 5),
    new ButtonBuilder()
      .setCustomId('tutien_craft_truc_co')
      .setLabel('🌿 Luyện Trúc Cơ Đan')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(yeuDan2 < 1 || hoangTinh < 8),
    new ButtonBuilder()
      .setCustomId('tutien_craft_tay_tuy')
      .setLabel('🧪 Luyện Tẩy Tủy Đan')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(linhChi < 10 || nuocLinhKhi < 5)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 8. EMBED DƯỢC ĐIỀN ĐỘNG PHỦ (FARM)
function createFarmEmbed(char, user) {
  const inv = char.inventory || {};
  const nuocLinhKhi = inv['nuoc_linh_khi'] || 0;
  const now = Date.now();
  const cdSec = Math.max(0, Math.ceil(((char.wellCooldownUntil || 0) - now) / 1000));

  const gardens = char.gardens || {};
  const danPlots = gardens.DAN || [];
  const hoaPlots = gardens.HOA || [];

  const ripeDan = danPlots.filter(p => p.stage >= 4).length;
  const ripeHoa = hoaPlots.filter(p => p.stage >= 4).length;

  const embed = new EmbedBuilder()
    .setTitle(`🌿 ĐỘNG PHỦ TIÊN ĐIỀN • DƯỢC THẢO CHI VIÊN`)
    .setDescription(
      `Đạo Hiệu: **${char.name}**\n` +
      `*Dẫn linh tuyền tưới tiêu, gieo mầm ngàn năm linh thảo!*\n\n` +
      `🪣 **GIẾNG TIÊN LINH TUYỀN:**\n` +
      `• Nước Linh Khí trữ sẵn: \`${nuocLinhKhi}\` giọt\n` +
      `• Trạng Thái Giếng: ${cdSec > 0 ? `⏳ Đang ngưng tụ (${cdSec}s)` : '✨ **Linh Tuyền Tràn Trề (Sẵn sàng múc +10)**'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌱 **TÌNH TRẠNG CÁC PHÂN KHU DƯỢC ĐIỀN:**\n` +
      `• 🟢 **Vườn Linh Chi:** ${danPlots.length} ô đất (Chín muồi: \`${ripeDan}/${danPlots.length}\` ô)\n` +
      `• 🟡 **Vườn Hoàng Tinh:** ${hoaPlots.length} ô đất (Chín muồi: \`${ripeHoa}/${hoaPlots.length}\` ô)\n\n` +
      `💡 *Mẹo: Hãy Múc Nước $\\rightarrow$ Tưới Nước $\\rightarrow$ Bón Phân $\\rightarrow$ Bắt Sâu $\\rightarrow$ Thu Hoạch khi cây chín!*`
    )
    .setColor(0x27AE60)
    .setFooter({ text: 'Dược Điền tự phát triển khi được chăm sóc đầy đủ độ ẩm!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('farm');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_farm_well')
      .setLabel(cdSec > 0 ? `⏳ Giếng Hồi (${cdSec}s)` : '🪣 Múc Nước Giếng (+10)')
      .setStyle(cdSec > 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(cdSec > 0),
    new ButtonBuilder()
      .setCustomId('tutien_farm_water')
      .setLabel('💧 Tưới Nước Toàn Vườn')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('tutien_farm_fert')
      .setLabel('🌾 Bón Phân Toàn Vườn')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('tutien_farm_bug')
      .setLabel('🐛 Bắt Sâu Bệnh')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_farm_harvest')
      .setLabel('🧺 Thu Hoạch Toàn Bộ')
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 9. EMBED BẾ QUAN TẨY ĐỘC & ĐẠO CƠ (CLEANSE)
function createCleanseEmbed(char, user) {
  const stats = getCalculatedStats(char);
  const foundation = char.foundation || { purity: 100, stability: 100, pillToxins: 0 };
  const toxins = foundation.pillToxins || 0;
  const stability = foundation.stability || 100;
  const stamina = char.stamina || 100;

  const embed = new EmbedBuilder()
    .setTitle(`🧪 ĐAN ĐIỀN TẨY UẾ • CỦNG CỐ ĐẠO CƠ`)
    .setDescription(
      `Đạo Hiệu: **${char.name}**\n` +
      `*Thanh lọc cặn bã đan dược, hàn gắn vết rạn đạo cơ!*\n\n` +
      `☠️ **NỒNG ĐỘ ĐAN ĐỘC HIỆN TẠI:** \`${toxins}%\`\n` +
      `${renderProgressBar(toxins, 100, 14)}\n` +
      `• *Hậu quả khi đan độc cao:* Giảm 15% uy lực đòn đánh, tăng 20% sát thương Lôi Kiếp. Nếu đan độc $\\ge 80\\%$ sẽ bế tắc kinh mạch không thể cắn đan!\n\n` +
      `🏛️ **ĐỘ VỮNG CĂN CƠ:** \`${stability}%\`\n` +
      `${renderProgressBar(stability, 100, 14)}\n` +
      `• Phẩm cấp đạo cơ: **${foundation.grade || 'Phàm Phẩm Trúc Cơ'}**\n\n` +
      `💪 **Thể Lực Hiện Tại:** \`${stamina} / ${char.maxStamina || 100}\` (Tẩy uế tốn 5 Thể Lực)`
    )
    .setColor(toxins > 50 ? 0xC0392B : 0x1ABC9C)
    .setFooter({ text: 'Bế quan tẩy uế giúp bài trừ 15% đan độc và củng cố độ vững căn cơ!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('cleanse');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_cleanse_action')
      .setLabel('🧪 Vận Công Tẩy Độc (-15% Độc, +5% Vững)')
      .setStyle(ButtonStyle.Success)
      .setDisabled(stamina < 5),
    new ButtonBuilder()
      .setCustomId('tutien_craft_tay_tuy')
      .setLabel('💊 Luyện Tẩy Tủy Đan')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_refresh')
      .setLabel('🔄 Làm Mới')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 10. EMBED TỤ LINH ĐỈNH (RESERVOIR)
function createReservoirEmbed(char, user) {
  const stats = getCalculatedStats(char);
  const reservoir = char.spiritReservoir || { storedExp: 0, maxCapacity: 50000 };
  const stored = Math.floor(reservoir.storedExp || 0);
  const maxCap = reservoir.maxCapacity || 50000;
  const needed = Math.max(0, stats.maxExp - char.exp);

  const embed = new EmbedBuilder()
    .setTitle(`🏔️ TỤ LINH ĐỈNH • KHÍ HẢI TÍCH LUỸ`)
    .setDescription(
      `Đạo Hiệu: **${char.name}**\n` +
      `*Khi tu vi đạt cực hạn 100%, 40% linh khí dôi dư sẽ tự động nạp vào Tụ Linh Đỉnh!*\n\n` +
      `🔮 **TU VI TÍCH TRỮ TRONG ĐỈNH:**\n` +
      `\`${stored.toLocaleString('vi-VN')} / ${maxCap.toLocaleString('vi-VN')} Exp\`\n` +
      `${renderProgressBar(stored, maxCap, 14)}\n\n` +
      `🥋 **CẢNH GIỚI HIỆN TẠI:** \`${stats.realmName}\`\n` +
      `• Đang có: \`${Math.floor(char.exp).toLocaleString('vi-VN')} / ${stats.maxExp.toLocaleString('vi-VN')} Exp\`\n` +
      `• Còn thiếu để đầy: \`${needed.toLocaleString('vi-VN')} Exp\`\n\n` +
      (needed === 0
        ? '⚡ **Cảnh giới hiện tại đã đầy 100%! Vui lòng Độ Kiếp trước khi trích xuất thêm.**'
        : stored > 0
        ? `✨ Có thể trích xuất ngay: \`${Math.min(needed, stored).toLocaleString('vi-VN')} Exp\` vào đan điền!`
        : '💤 Tụ Linh Đỉnh hiện đang trống.')
    )
    .setColor(0x3498DB)
    .setFooter({ text: 'Trích xuất giúp bạn vượt ải tu vi cực nhanh sau mỗi lần độ kiếp!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('reservoir');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_reservoir_claim')
      .setLabel(`🏔️ Trích Xuất Tu Vi (+${Math.min(needed, stored).toLocaleString('vi-VN')} Exp)`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(stored <= 0 || needed <= 0),
    new ButtonBuilder()
      .setCustomId('tutien_refresh')
      .setLabel('🔄 Làm Mới')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 11. EMBED TẨY TỦY THỂ CHẤT (PHYSIQUE)
function createPhysiqueEmbed(char, user) {
  const currentPhysique = PHYSIQUES.find(p => p.name === char.physique) || PHYSIQUES[0];
  const pendingPhysique = char.physiquePending ? PHYSIQUES.find(p => p.name === char.physiquePending) : null;
  const stones = char.spiritStones || 0;

  let pendingText = '';
  if (pendingPhysique) {
    pendingText =
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✨ **ĐÃ XUẤT HIỆN THỂ CHẤT MỚI ĐANG CHỜ XÁC NHẬN:**\n` +
      `• Tên: **${pendingPhysique.name}** [Cấp: **${pendingPhysique.rank} Thể**]\n` +
      `• Gia trì: +${Math.round(pendingPhysique.atkBonus * 100)}% ATK | +${Math.round(pendingPhysique.defBonus * 100)}% DEF | +${Math.round(pendingPhysique.hpBonus * 100)}% HP\n` +
      `👉 *Bạn muốn tiếp nhận thể chất mới hay giữ lại thể chất cũ?*`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`✨ TẨY TỦY HOÁN CỐT • THÁI CỔ THỂ CHẤT`)
    .setDescription(
      `Đạo Hiệu: **${char.name}**\n` +
      `*Nghịch thiên cải mệnh, thối cốt đúc nên vô thượng thần khu!*\n\n` +
      `🌟 **THỂ CHẤT HIỆN TẠI:**\n` +
      `• Tên: **${currentPhysique.name}** [Bậc: **${currentPhysique.rank} Thể**]\n` +
      `• Uy Lực: +${Math.round(currentPhysique.atkBonus * 100)}% Công Kích | +${Math.round(currentPhysique.defBonus * 100)}% Phòng Ngự | +${Math.round(currentPhysique.hpBonus * 100)}% Máu\n\n` +
      `💰 **Linh Thạch Hiện Có:** \`${stones.toLocaleString('vi-VN')}\` viên (Chi phí tẩy tủy: 1.000 viên)${pendingText}`
    )
    .setColor(0xF39C12)
    .setFooter({ text: 'Tỷ lệ xuất hiện: Thần Thể (1%), Thánh Thể (5%), Vương Thể (14%), Linh Thể (30%), Phàm Thể (50%)' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('physique');

  const rowButtons = new ActionRowBuilder();
  if (pendingPhysique) {
    rowButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('tutien_physique_accept')
        .setLabel(`✅ Tiếp Nhận [${pendingPhysique.name}]`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('tutien_physique_reject')
        .setLabel(`❌ Giữ Lại [${currentPhysique.name}]`)
        .setStyle(ButtonStyle.Danger)
    );
  } else {
    rowButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('tutien_physique_wash')
        .setLabel('✨ Tẩy Tủy Hoán Cốt (1.000 Linh Thạch)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(stones < 1000),
      new ButtonBuilder()
        .setCustomId('tutien_refresh')
        .setLabel('🔄 Làm Mới')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return { embed, components: [selectRow, rowButtons] };
}

// 12. EMBED CÔNG PHÁP & HUYẾT THÚ (SKILLS & BLOODLINES)
function createSkillsEmbed(char, user) {
  const learned = char.learnedSkills || [];
  const bloodlines = char.absorbedBloodlines || [];
  const inv = char.inventory || {};

  let learnedText = learned.length > 0
    ? learned.map(sid => {
        const sk = SKILLS_CONFIG[sid] || { name: sid, desc: 'Bí tịch cổ xưa' };
        return `• ${sk.icon || '📖'} **${sk.name}:** ${sk.desc}`;
      }).join('\n')
    : '*Chưa lĩnh ngộ công pháp nào. Hãy săn quái bãi săn để nhặt bí tịch!*';

  let bloodText = bloodlines.length > 0
    ? bloodlines.map(bid => {
        const bl = BLOODLINES_CONFIG[bid] || { name: bid, desc: 'Huyết mạch hung thú' };
        return `• ${bl.icon || '🩸'} **${bl.name}:** ${bl.desc}`;
      }).join('\n')
    : '*Chưa luyện hóa huyết thú nào.*';

  // Kiểm tra bí tịch có thể học trong túi đồ
  const canLearnSkills = Object.keys(inv).filter(k => SKILLS_CONFIG[k] && inv[k] > 0 && !learned.includes(k));
  const canRefineBloods = Object.keys(inv).filter(k => BLOODLINES_CONFIG[k] && inv[k] > 0 && !bloodlines.includes(k));

  let availableText = '';
  if (canLearnSkills.length > 0 || canRefineBloods.length > 0) {
    const listS = canLearnSkills.map(k => `📖 ${SKILLS_CONFIG[k].name}`).concat(canRefineBloods.map(k => `🩸 ${BLOODLINES_CONFIG[k].name}`)).join(', ');
    availableText = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✨ **VẬT PHẨM KHẢ DỤNG TRONG TÚI ĐỒ ĐỂ HỌC:**\n${listS}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📖 THÁI CỔ KINH ĐIỂN • CÔNG PHÁP & HUYẾT MẠCH`)
    .setDescription(
      `Đạo Hiệu: **${char.name}**\n\n` +
      `📜 **CÔNG PHÁP ĐÃ LĨNH NGỘ:**\n${learnedText}\n\n` +
      `🩸 **HUYẾT THÚ ĐÃ LUYỆN HÓA:**\n${bloodText}${availableText}`
    )
    .setColor(0x8E44AD)
    .setFooter({ text: 'Công pháp và huyết thú gia tăng vĩnh viễn thuộc tính và kháng Lôi Kiếp!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('skills');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_learn_all')
      .setLabel('📖 Lĩnh Ngộ Toàn Bộ Bí Tịch Trong Túi')
      .setStyle(ButtonStyle.Success)
      .setDisabled(canLearnSkills.length === 0 && canRefineBloods.length === 0),
    new ButtonBuilder()
      .setCustomId('tutien_hunt_menu')
      .setLabel('🗡️ Đi Săn Quái Nhặt Bí Tịch')
      .setStyle(ButtonStyle.Danger)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 13. EMBED HÒM THƯ TIÊN TÍN (MAILBOX)
function createMailboxEmbed(char, user) {
  const mailbox = char.mailbox || [];
  const unclaimed = mailbox.filter(m => !m.isClaimed);

  let mailList = mailbox.length > 0
    ? mailbox.map((m, idx) => {
        const status = m.isClaimed ? '✅ Đã nhận' : '🎁 **Chưa nhận**';
        return `**${idx + 1}. [${m.title}]** — Từ: *${m.senderName}* (${status})\n> ${m.content}`;
      }).join('\n\n')
    : '*Hòm thư trống không!*';

  const embed = new EmbedBuilder()
    .setTitle(`📬 HÒM THƯ TIÊN TÍN • THIÊN CƠ BAN PHÚC`)
    .setDescription(
      `Đạo Hiệu: **${char.name}**\n\n` +
      `${mailList}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      (unclaimed.length > 0
        ? `🎁 **Đạo hữu có ${unclaimed.length} bức thư kèm quà tặng chưa nhận!**`
        : `✅ Đã nhận toàn bộ quà tặng trong hòm thư.`)
    )
    .setColor(0xF1C40F)
    .setFooter({ text: 'Kiểm tra hòm thư thường xuyên để nhận quà thiên đạo và sự kiện!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('mailbox');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_claim_mail')
      .setLabel(`📬 Nhận Toàn Bộ Quà (${unclaimed.length})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(unclaimed.length === 0),
    new ButtonBuilder()
      .setCustomId('tutien_refresh')
      .setLabel('🔄 Làm Mới')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 14. EMBED TÚI TRỮ VẬT (INVENTORY & USE ITEM)
function createInventoryEmbed(char, user) {
  const inv = char.inventory || {};
  const items = Object.entries(inv).filter(([k, v]) => v > 0);

  let itemsText = items.length > 0
    ? items.map(([key, count]) => {
        let tag = '📦';
        if (key.startsWith('dan_')) tag = '💊';
        else if (key.startsWith('thao_duoc_')) tag = '🌿';
        else if (key.startsWith('yeu_dan_')) tag = '🔮';
        else if (key.startsWith('cong_phap_')) tag = '📖';
        else if (key.startsWith('huyet_thu_')) tag = '🩸';
        return `• ${tag} **${key.replace(/_/g, ' ').toUpperCase()}:** \`x${count}\``;
      }).join('\n')
    : '*Túi trữ vật trống không, hãy đi săn quái và hái thuốc để làm giàu!*';

  const embed = new EmbedBuilder()
    .setTitle(`🎒 CÀN KHÔN BẢO TÚI • ${char.name}`)
    .setDescription(
      `Chủ nhân: <@${user.id}>\n` +
      `💰 **Linh Thạch Hiện Có:** \`${(char.spiritStones || 0).toLocaleString('vi-VN')}\` viên\n` +
      `💪 **Thể Lực:** \`${char.stamina || 100} / ${char.maxStamina || 100}\` | 🩸 **Khí Huyết:** \`${char.currentHp || 500} HP\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 **DANH MỤC PHÁP BẢO, ĐAN DƯỢC & LINH NGUYÊN:**\n${itemsText}`
    )
    .setColor(0xDAA520)
    .setFooter({ text: 'Bấm các nút bên dưới để cắn đan dược hồi phục tức thì!' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('inventory');

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_use_dan_the_luc')
      .setLabel(`💊 Cắn Thể Lực Đan (${inv['dan_the_luc'] || 0})`)
      .setStyle(ButtonStyle.Success)
      .setDisabled((inv['dan_the_luc'] || 0) <= 0),
    new ButtonBuilder()
      .setCustomId('tutien_use_dan_hoi_mau')
      .setLabel(`🩸 Cắn Hồi Huyết Đan (${inv['dan_hoi_mau'] || 0})`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled((inv['dan_hoi_mau'] || 0) <= 0),
    new ButtonBuilder()
      .setCustomId('tutien_use_dan_tu_khi')
      .setLabel(`🔮 Cắn Tụ Khí Đan (${inv['dan_tu_khi'] || 0})`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled((inv['dan_tu_khi'] || 0) <= 0),
    new ButtonBuilder()
      .setCustomId('tutien_use_dan_truc_co')
      .setLabel(`🌿 Cắn Trúc Cơ Đan (${inv['dan_truc_co'] || 0})`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled((inv['dan_truc_co'] || 0) <= 0)
  );

  return { embed, components: [selectRow, rowButtons] };
}

// 15. EMBED THIÊN KIÊU BẢNG (LEADERBOARD)
function createLeaderboardEmbed(characters) {
  const sorted = [...characters].sort((a, b) => {
    if ((b.realmId || 1) !== (a.realmId || 1)) {
      return (b.realmId || 1) - (a.realmId || 1);
    }
    return (b.exp || 0) - (a.exp || 0);
  }).slice(0, 10);

  const listText = sorted.map((c, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}.**`;
    const race = RACES_CONFIG[c.race]?.symbol || '⚔️';
    const stats = getCalculatedStats(c);
    return `${medal} ${race} **${c.name}** • \`${stats.realmName}\` (\`${Math.floor(c.exp).toLocaleString('vi-VN')} Exp\`)`;
  }).join('\n\n') || '*Chưa có đạo hữu nào gia nhập Tiên Giới!*';

  const embed = new EmbedBuilder()
    .setTitle(`🏆 THIÊN KIÊU BẢNG • BÁCH ĐẠI CHÂN NHÂN`)
    .setDescription(
      `Bảng xếp hạng tôn vinh những vị tu sĩ có đạo hạnh uy chấn quần hùng trong server:\n\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Tu hành như đi ngược dòng nước, không tiến ắt lùi. Các vị đạo hữu hãy nỗ lực bế quan!*`
    )
    .setColor(0xFFD700)
    .setFooter({ text: 'Tu Chân Giới • Thiên Đạo Bảng Vàng' })
    .setTimestamp();

  const selectRow = createFeatureSelectMenu('leaderboard');

  return { embed, components: [selectRow] };
}

// 16. EMBED LUẬN ĐẠO LÔI ĐÀI (PVP 1V1)
function createPvPEmbed(charA, charB, userA, userB, combatResult) {
  const isWinnerA = combatResult.isWin;
  const winner = isWinnerA ? charA : charB;
  const winnerUser = isWinnerA ? userA : userB;
  const loser = isWinnerA ? charB : charA;
  const loserUser = isWinnerA ? userB : userA;

  const sampleLogs = (combatResult.logs || []).slice(-8).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ LUẬN ĐẠO LÔI ĐÀI • ĐỈNH CAO ĐẤU PHÁP`)
    .setDescription(
      `**Đạo Hữu:** <@${userA.id}> (\`${charA.name}\`) ⚡ **Đạo Hữu:** <@${userB.id}> (\`${charB.name}\`)\n` +
      `**Tổng Số Hiệp Luận Đạo:** \`${combatResult.rounds} hiệp\`\n\n` +
      `📜 **DIỄN BIẾN ĐẤU PHÁP:**\n${sampleLogs}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 **KẾT QUẢ ĐẤU PHÁP:**\n` +
      `🎉 **Chiến Thắng:** <@${winnerUser.id}> (\`${winner.name}\`)\n` +
      `💀 **Bại Trận:** <@${loserUser.id}> (\`${loser.name}\`)\n` +
      `*Sau trận luận đạo, hai bên cùng thu hoạch đốn ngộ, tình huynh đệ thêm gắn kết!*`
    )
    .setColor(0x9B59B6)
    .setFooter({ text: 'Luận Đạo Lôi Đài • Đấu pháp tao nhã, không tổn thương chân thân vĩnh viễn!' })
    .setTimestamp();

  return embed;
}

module.exports = {
  RACE_COLORS,
  renderProgressBar,
  createFeatureSelectMenu,
  createCharacterEmbed,
  createMainActionRows,
  createCultivateResultEmbed,
  createTribulationEmbed,
  createCombatEmbed,
  createWorldBossEmbed,
  createAlchemyEmbed,
  createFarmEmbed,
  createCleanseEmbed,
  createReservoirEmbed,
  createPhysiqueEmbed,
  createSkillsEmbed,
  createMailboxEmbed,
  createInventoryEmbed,
  createLeaderboardEmbed,
  createPvPEmbed
};
