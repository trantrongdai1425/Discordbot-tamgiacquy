const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
  REALMS,
  RACES_CONFIG,
  SPIRITUAL_ROOTS,
  APTITUDES,
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

  // Kiểm tra điều kiện độ kiếp
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
      text: `Tu Chân Giới • Nhấn các nút bấm bên dưới để tu luyện, săn quái và độ kiếp!`,
      iconURL: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png'
    })
    .setTimestamp();

  return embed;
}

// 2. CÁC NÚT BẤM ĐIỀU KHIỂN CHÍNH
function createMainActionRows(char) {
  const stats = getCalculatedStats(char);
  const canBreakthrough = char.exp >= stats.maxExp;

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
      .setLabel('🗡️ Bãi Săn Yêu Thú')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tutien_boss')
      .setLabel('🐉 Trảm Lư Ma Tôn')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('tutien_inventory')
      .setLabel('🎒 Túi Trữ Vật')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_leaderboard')
      .setLabel('🏆 Thiên Kiêu Bảng')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tutien_refresh')
      .setLabel('🔄 Làm Mới')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
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

  let strikeDetails = tribResult.strikes.map(s => {
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

  // Lấy 5 hiệp tiêu biểu
  const sampleLogs = combatResult.logs.slice(-6).join('\n');

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

// 7. EMBED TÚI TRỮ VẬT
function createInventoryEmbed(char, user) {
  const inv = char.inventory || {};
  const items = Object.entries(inv);

  let itemsText = items.length > 0
    ? items.map(([key, count]) => `• 📦 **${key.replace(/_/g, ' ').toUpperCase()}:** \`x${count}\``).join('\n')
    : '*Túi trữ vật trống không, hãy đi săn quái và hái thuốc để làm giàu!*';

  const embed = new EmbedBuilder()
    .setTitle(`🎒 CÀN KHÔN BẢO TÚI • ${char.name}`)
    .setDescription(
      `Chủ nhân: <@${user.id}>\n` +
      `💰 **Linh Thạch Hiện Có:** \`${(char.spiritStones || 0).toLocaleString('vi-VN')}\` viên\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 **DANH MỤC PHÁP BẢO & ĐAN DƯỢC:**\n${itemsText}`
    )
    .setColor(0xDAA520)
    .setFooter({ text: 'Tu Chân Giới • Dùng linh thạch và vật phẩm để luyện đan và đúc khí!' })
    .setTimestamp();

  return embed;
}

// 8. EMBED THIÊN KIÊU BẢNG (LEADERBOARD)
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

  return embed;
}

module.exports = {
  RACE_COLORS,
  renderProgressBar,
  createCharacterEmbed,
  createMainActionRows,
  createCultivateResultEmbed,
  createTribulationEmbed,
  createCombatEmbed,
  createWorldBossEmbed,
  createInventoryEmbed,
  createLeaderboardEmbed
};
