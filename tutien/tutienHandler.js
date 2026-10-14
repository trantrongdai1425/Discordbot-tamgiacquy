const {
  createNewCharacter,
  ensureCharacterSchema,
  getCalculatedStats,
  simulateCombat,
  simulateTribulation,
  generateWildMonster,
  rollCombatLoot,
  rollPhysique,
  cleansePillToxins,
  addPillToxins,
  reinforceFoundation,
  RACES_CONFIG,
  REALMS,
  PHYSIQUES,
  SKILLS_CONFIG,
  BLOODLINES_CONFIG
} = require('./gameEngine');

const {
  getCharacter,
  saveCharacter,
  getAllCharacters,
  getWorldBoss,
  saveWorldBoss
} = require('./db');

const {
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
} = require('./tutienUI');

// Bộ đệm chống spam nút bấm theo User ID (cooldown 1.5 giây)
const userCooldowns = new Map();

function checkCooldown(userId, cooldownMs = 1500) {
  const now = Date.now();
  const lastTime = userCooldowns.get(userId) || 0;
  if (now - lastTime < cooldownMs) {
    const remainSec = ((cooldownMs - (now - lastTime)) / 1000).toFixed(1);
    return remainSec;
  }
  userCooldowns.set(userId, now);
  return null;
}

// Lấy hoặc tự động khởi tạo nhân vật mới cho User Discord
function getOrInitCharacter(user) {
  let char = getCharacter(user.id);
  if (!char) {
    const raceKeys = ['Tien', 'Ma', 'Yeu', 'Minh', 'Nhan'];
    const randomRace = raceKeys[Math.floor(Math.random() * raceKeys.length)];
    const chosenName = user.displayName || user.username || 'Vô Danh Tu Sĩ';

    char = createNewCharacter(chosenName, '123456', randomRace);
    const rolledPhysique = rollPhysique();
    if (rolledPhysique) {
      char.physique = rolledPhysique.name;
    }
    saveCharacter(user.id, char);
    console.log(`[TuTiên]: Khởi tạo tân thủ: ${char.name} (${char.race}) cho Discord ID: ${user.id}`);
  } else {
    ensureCharacterSchema(char);
  }
  return char;
}

// 1. XỬ LÝ BẾ QUAN TU LUYỆN
async function handleCultivate(user) {
  const char = getOrInitCharacter(user);
  const stats = getCalculatedStats(char);
  const now = Date.now();

  const lastTime = char.lastCultivatedAt || char.lastActiveAt || now - 10000;
  const elapsedSec = Math.max(5, Math.min(28800, Math.floor((now - lastTime) / 1000)));

  const baseGain = elapsedSec * stats.expPerSec;
  let gainedExp = Math.max(10, Math.floor(baseGain));

  if (char.exp < stats.maxExp) {
    char.exp = Math.min(stats.maxExp, char.exp + gainedExp);
  } else {
    const overflow = Math.floor(gainedExp * 0.4);
    if (!char.spiritReservoir) char.spiritReservoir = { storedExp: 0, maxCapacity: 50000 };
    char.spiritReservoir.storedExp += overflow;
    reinforceFoundation(char, overflow);
  }

  cleansePillToxins(char, Math.max(1, Math.floor(elapsedSec / 120)));

  const staminaRegen = Math.floor(elapsedSec / 60);
  if (staminaRegen > 0) {
    char.stamina = Math.min(char.maxStamina || 100, (char.stamina || 0) + staminaRegen);
  }

  char.lastCultivatedAt = now;
  char.lastActiveAt = now;
  saveCharacter(user.id, char);

  return { char, gainedExp, elapsedSec };
}

// 2. XỬ LÝ NGHÊNH ĐÓN LÔI KIẾP (ĐỘ KIẾP ĐỘT PHÁ)
async function handleBreakthrough(user, aiStoryGenerator = null) {
  const char = getOrInitCharacter(user);
  const stats = getCalculatedStats(char);

  if (char.exp < stats.maxExp) {
    return {
      error: `⚠️ **Đạo hạnh chưa viên mãn!**\nĐạo hữu hiện có \`${Math.floor(char.exp)} / ${stats.maxExp} Exp\` (${((char.exp / stats.maxExp) * 100).toFixed(1)}%). Vui lòng tiếp tục bế quan hoặc cắn đan dược trước khi nghênh đón thiên kiếp!`
    };
  }

  const oldRealmName = stats.realmName;
  const tribResult = simulateTribulation(char, false);

  let aiStory = null;

  if (tribResult.success) {
    char.realmId = Math.min(REALMS.length, (char.realmId || 1) + 1);
    char.exp = 0;
    const newStats = getCalculatedStats(char);
    char.currentHp = newStats.hp;

    if (tribResult.isMajor) {
      char.spiritStones = (char.spiritStones || 0) + 1000;
    }

    if (typeof aiStoryGenerator === 'function') {
      try {
        const prompt = `Viết đúng 2 câu ngắn văn phong Tiên Hiệp cổ phong cực kỳ hào hùng và huyền ảo miêu tả tu sĩ "${char.name}" (${RACES_CONFIG[char.race]?.name}) vừa vượt qua cửu trọng lôi kiếp, phá vỡ bình cảnh từ ${oldRealmName} bước chân vào ${tribResult.nextRealmName}.`;
        aiStory = await aiStoryGenerator(prompt);
      } catch (_) {}
    }
  } else {
    char.currentHp = tribResult.finalHp || 50;
    char.exp = Math.max(0, Math.floor(char.exp * 0.85));
  }

  char.lastActiveAt = Date.now();
  saveCharacter(user.id, char);

  return { char, tribResult, aiStory };
}

// 3. XỬ LÝ SĂN YÊU THÚ BÃI SĂN
async function handleHunt(user) {
  const char = getOrInitCharacter(user);
  const stats = getCalculatedStats(char);

  if ((char.stamina || 0) < 10) {
    return {
      error: '⚠️ **Thể Lực cạn kiệt!**\nĐạo hữu cần ít nhất **10 điểm Thể Lực** để vào bãi săn. Thể lực tự hồi 1 điểm mỗi phút hoặc có thể cắn Đan Thể Lực trong túi đồ!'
    };
  }

  let zoneTier = 1;
  if (char.realmId >= 26) zoneTier = 5;
  else if (char.realmId >= 22) zoneTier = 4;
  else if (char.realmId >= 18) zoneTier = 4;
  else if (char.realmId >= 14) zoneTier = 3;
  else if (char.realmId >= 10) zoneTier = 2;

  const monster = generateWildMonster(zoneTier);
  const combatResult = simulateCombat(char, monster);

  let loot = null;
  if (combatResult.isWin) {
    char.stamina = Math.max(0, (char.stamina || 100) - 10);
    loot = rollCombatLoot(monster, char.race);

    char.exp = Math.min(stats.maxExp, (char.exp || 0) + loot.exp);
    char.spiritStones = (char.spiritStones || 0) + loot.stones;

    if (!char.inventory) char.inventory = {};
    (loot.items || []).forEach(item => {
      char.inventory[item.id] = (char.inventory[item.id] || 0) + (item.count || 1);
    });

    char.currentHp = combatResult.remainingPlayerHp;
  } else {
    char.stamina = Math.max(0, (char.stamina || 100) - 5);
    char.currentHp = 50;
  }

  char.lastActiveAt = Date.now();
  saveCharacter(user.id, char);

  return { char, monster, combatResult, loot };
}

// 4. XỬ LÝ WORLD BOSS
async function handleWorldBoss(user) {
  const char = getOrInitCharacter(user);
  const stats = getCalculatedStats(char);

  if ((char.stamina || 0) < 15) {
    return {
      error: '⚠️ **Khí lực bất túc!**\nKhiêu chiến Boss Thế Giới tiêu hao **15 điểm Thể Lực**. Vui lòng nghỉ ngơi lấy lại chân khí!'
    };
  }

  const boss = getWorldBoss();
  if (!boss.isAlive || boss.currentHp <= 0) {
    const remainMs = (boss.respawnAt || 0) - Date.now();
    const remainMin = Math.max(1, Math.ceil(remainMs / 60000));
    return {
      error: `💤 **Trạm Lư Ma Tôn hiện đã bị toàn server phong ấn!**\nDự kiến ma thần sẽ ngưng tụ lại chân thân sau **${remainMin} phút** nữa!`
    };
  }

  const randFactor = 0.85 + Math.random() * 0.35;
  const isCrit = Math.random() < 0.25;
  const baseDmg = Math.max(100, Math.floor(stats.atk * randFactor - boss.def * 0.2));
  const playerDmg = isCrit ? Math.floor(baseDmg * 1.6) : baseDmg;

  boss.currentHp = Math.max(0, boss.currentHp - playerDmg);

  if (!boss.dpsTable) boss.dpsTable = {};
  const currentDps = boss.dpsTable[user.id] || { name: char.name, damage: 0, realmName: stats.realmName };
  currentDps.damage += playerDmg;
  currentDps.realmName = stats.realmName;
  currentDps.name = char.name;
  boss.dpsTable[user.id] = currentDps;

  const stonesReward = Math.floor(playerDmg / 8);
  const expReward = Math.floor(playerDmg / 4);
  char.spiritStones = (char.spiritStones || 0) + stonesReward;
  char.exp = Math.min(stats.maxExp, (char.exp || 0) + expReward);
  char.stamina = Math.max(0, (char.stamina || 100) - 15);

  if (boss.currentHp <= 0) {
    boss.isAlive = false;
    boss.lastKilledAt = Date.now();
    boss.respawnAt = Date.now() + 2 * 3600 * 1000;
    char.spiritStones += 5000;
  }

  saveWorldBoss(boss);
  saveCharacter(user.id, char);

  return { char, boss, playerDmg };
}

// 5. XỬ LÝ LUẬN ĐẠO PVP 1V1
async function handlePvP(userA, userB) {
  if (userA.id === userB.id) {
    return { error: '⚠️ Đạo hữu không thể tự luận đạo với chính bóng của mình!' };
  }

  const charA = getOrInitCharacter(userA);
  const charB = getOrInitCharacter(userB);

  const combatResult = simulateCombat(charA, charB);
  return { charA, charB, combatResult };
}

// 6. ĐIỀU PHỐI MENU THẢ XUỐNG (SELECT MENU ROUTER)
async function handleTuTienSelectMenu(interaction) {
  const value = interaction.values[0];
  const user = interaction.user;
  const char = getOrInitCharacter(user);

  if (value === 'feature_profile') {
    const embed = createCharacterEmbed(char, user);
    const rows = createMainActionRows(char);
    return interaction.update({ embeds: [embed], components: rows }).catch(() => {});
  }

  if (value === 'feature_hunt') {
    const result = await handleHunt(user);
    if (result.error) {
      return interaction.reply({ content: result.error, ephemeral: true }).catch(() => {});
    }
    const combatEmbed = createCombatEmbed(result.char, result.monster, result.combatResult, result.loot);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const rows = createMainActionRows(result.char);
    return interaction.update({ embeds: [mainEmbed, combatEmbed], components: rows }).catch(() => {});
  }

  if (value === 'feature_boss') {
    const boss = getWorldBoss();
    const embed = createWorldBossEmbed(boss, char, 0);
    const rows = createMainActionRows(char);
    return interaction.update({ embeds: [embed], components: rows }).catch(() => {});
  }

  if (value === 'feature_alchemy') {
    const { embed, components } = createAlchemyEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_farm') {
    const { embed, components } = createFarmEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_cleanse') {
    const { embed, components } = createCleanseEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_reservoir') {
    const { embed, components } = createReservoirEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_physique') {
    const { embed, components } = createPhysiqueEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_skills') {
    const { embed, components } = createSkillsEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_inventory') {
    const { embed, components } = createInventoryEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_mailbox') {
    const { embed, components } = createMailboxEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (value === 'feature_leaderboard') {
    const all = getAllCharacters();
    const { embed, components } = createLeaderboardEmbed(all);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }
}

// 7. BỘ ĐIỀU PHỐI TƯƠNG TÁC NÚT BẤM (BUTTON ROUTER)
async function handleTuTienButtonInteraction(interaction, aiStoryGenerator = null) {
  const customId = interaction.customId;
  const user = interaction.user;

  // Kiểm tra cooldown chống spam click
  const cdRemain = checkCooldown(user.id, 1200);
  if (cdRemain) {
    await interaction.reply({
      content: `⏳ Đạo hữu tâm cảnh dao động quá nhanh, xin đợi **${cdRemain} giây** để ổn định chân khí!`,
      ephemeral: true
    }).catch(() => {});
    return;
  }

  const char = getOrInitCharacter(user);

  // --- 1. CÁC NÚT CƠ BẢN ---
  if (customId === 'tutien_cultivate') {
    const result = await handleCultivate(user);
    const cultivateEmbed = createCultivateResultEmbed(result.char, result.gainedExp, result.elapsedSec);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);
    return interaction.update({ embeds: [mainEmbed, cultivateEmbed], components: buttons }).catch(() => {});
  }

  if (customId === 'tutien_breakthrough') {
    await interaction.deferUpdate().catch(() => {});
    const result = await handleBreakthrough(user, aiStoryGenerator);
    if (result.error) {
      return interaction.followUp({ content: result.error, ephemeral: true }).catch(() => {});
    }
    const tribEmbed = createTribulationEmbed(result.char, result.tribResult, result.aiStory);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);
    return interaction.editReply({ embeds: [mainEmbed, tribEmbed], components: buttons }).catch(() => {});
  }

  if (customId === 'tutien_hunt_menu') {
    await interaction.deferUpdate().catch(() => {});
    const result = await handleHunt(user);
    if (result.error) {
      return interaction.followUp({ content: result.error, ephemeral: true }).catch(() => {});
    }
    const combatEmbed = createCombatEmbed(result.char, result.monster, result.combatResult, result.loot);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);
    return interaction.editReply({ embeds: [mainEmbed, combatEmbed], components: buttons }).catch(() => {});
  }

  if (customId === 'tutien_boss') {
    await interaction.deferUpdate().catch(() => {});
    const result = await handleWorldBoss(user);
    if (result.error) {
      return interaction.followUp({ content: result.error, ephemeral: true }).catch(() => {});
    }
    const bossEmbed = createWorldBossEmbed(result.boss, result.char, result.playerDmg);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);
    return interaction.editReply({ embeds: [mainEmbed, bossEmbed], components: buttons }).catch(() => {});
  }

  if (customId === 'tutien_refresh') {
    const mainEmbed = createCharacterEmbed(char, user);
    const buttons = createMainActionRows(char);
    return interaction.update({ embeds: [mainEmbed], components: buttons }).catch(() => {});
  }

  // --- 2. LUYỆN ĐAN PHÒNG (ALCHEMY) ---
  if (customId === 'tutien_alchemy_view') {
    const { embed, components } = createAlchemyEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId.startsWith('tutien_craft_')) {
    const type = customId.replace('tutien_craft_', '');
    const inv = char.inventory || {};
    let msg = '';

    if (type === 'the_luc') {
      if ((inv['thao_duoc_linh_chi'] || 0) < 5) {
        return interaction.reply({ content: '⚠️ Cần ít nhất 5x Linh Chi để luyện Thể Lực Đan!', ephemeral: true });
      }
      inv['thao_duoc_linh_chi'] -= 5;
      inv['dan_the_luc'] = (inv['dan_the_luc'] || 0) + 1;
      msg = '🎉 Luyện chế thành công: **1x Thể Lực Đan (+50 Thể Lực)**!';
    } else if (type === 'ho_mach') {
      if ((inv['thao_duoc_linh_chi'] || 0) < 8 || (inv['nuoc_linh_khi'] || 0) < 5) {
        return interaction.reply({ content: '⚠️ Cần 8x Linh Chi và 5x Nước Linh Khí để luyện Hộ Mạch Đan!', ephemeral: true });
      }
      inv['thao_duoc_linh_chi'] -= 8;
      inv['nuoc_linh_khi'] -= 5;
      inv['dan_ho_mach'] = (inv['dan_ho_mach'] || 0) + 1;
      msg = '🎉 Luyện chế thành công: **1x Hộ Mạch Đan (Chặn 40% sát thương Lôi Kiếp)**!';
    } else if (type === 'tu_khi') {
      if ((inv['yeu_dan_1'] || 0) < 1 || (inv['thao_duoc_linh_chi'] || 0) < 5) {
        return interaction.reply({ content: '⚠️ Cần 1x Yêu Đan 1 và 5x Linh Chi để luyện Tụ Khí Đan!', ephemeral: true });
      }
      inv['yeu_dan_1'] -= 1;
      inv['thao_duoc_linh_chi'] -= 5;
      inv['dan_tu_khi'] = (inv['dan_tu_khi'] || 0) + 1;
      msg = '🎉 Luyện chế thành công: **1x Tụ Khí Đan (+500 Tu Vi)**!';
    } else if (type === 'truc_co') {
      if ((inv['yeu_dan_2'] || 0) < 1 || (inv['thao_duoc_hoang_tinh'] || 0) < 8) {
        return interaction.reply({ content: '⚠️ Cần 1x Yêu Đan 2 và 8x Hoàng Tinh để luyện Trúc Cơ Đan!', ephemeral: true });
      }
      inv['yeu_dan_2'] -= 1;
      inv['thao_duoc_hoang_tinh'] -= 8;
      inv['dan_truc_co'] = (inv['dan_truc_co'] || 0) + 1;
      msg = '🎉 Luyện chế thành công: **1x Trúc Cơ Linh Đan (+3.000 Tu Vi)**!';
    } else if (type === 'tay_tuy') {
      if ((inv['thao_duoc_linh_chi'] || 0) < 10 || (inv['nuoc_linh_khi'] || 0) < 5) {
        return interaction.reply({ content: '⚠️ Cần 10x Linh Chi và 5x Nước Linh Khí để luyện Tẩy Tủy Đan!', ephemeral: true });
      }
      inv['thao_duoc_linh_chi'] -= 10;
      inv['nuoc_linh_khi'] -= 5;
      inv['dan_tay_tuy'] = (inv['dan_tay_tuy'] || 0) + 1;
      msg = '🎉 Luyện chế thành công: **1x Tẩy Tủy Đan (Thanh trừ 25% Đan Độc)**!';
    }

    saveCharacter(user.id, char);
    const { embed, components } = createAlchemyEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
  }

  // --- 3. DƯỢC ĐIỀN ĐỘNG PHỦ (FARM) ---
  if (customId === 'tutien_farm_view') {
    const { embed, components } = createFarmEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_farm_well') {
    const now = Date.now();
    if (char.wellCooldownUntil && char.wellCooldownUntil > now) {
      const leftSec = Math.ceil((char.wellCooldownUntil - now) / 1000);
      return interaction.reply({ content: `⏳ Giếng đang hồi linh khí! Vui lòng chờ ${leftSec}s.`, ephemeral: true });
    }
    char.wellCooldownUntil = now + 300000; // 5 phút cooldown
    if (!char.inventory) char.inventory = {};
    char.inventory['nuoc_linh_khi'] = (char.inventory['nuoc_linh_khi'] || 0) + 10;
    saveCharacter(user.id, char);

    const { embed, components } = createFarmEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: '🪣 Múc nước giếng thành công! Nhận được **+10 Nước Linh Khí**!', ephemeral: true }).catch(() => {});
  }

  if (customId === 'tutien_farm_water' || customId === 'tutien_farm_fert' || customId === 'tutien_farm_bug') {
    const gardens = char.gardens || {};
    ['DAN', 'HOA'].forEach(k => {
      (gardens[k] || []).forEach(p => {
        if (customId === 'tutien_farm_water') p.water = 5;
        if (customId === 'tutien_farm_fert') p.fert = 6;
        if (customId === 'tutien_farm_bug') p.hasBug = false;
        p.stage = Math.min(4, (p.stage || 0) + 1);
      });
    });
    saveCharacter(user.id, char);
    const { embed, components } = createFarmEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_farm_harvest') {
    const gardens = char.gardens || {};
    let totalHarvest = 0;
    ['DAN', 'HOA'].forEach(k => {
      const plots = gardens[k] || [];
      const ripe = plots.filter(p => p.stage >= 4);
      if (ripe.length > 0) {
        const hKey = k === 'DAN' ? 'thao_duoc_linh_chi' : 'thao_duoc_hoang_tinh';
        const gain = ripe.length * 5;
        if (!char.inventory) char.inventory = {};
        char.inventory[hKey] = (char.inventory[hKey] || 0) + gain;
        totalHarvest += gain;
        ripe.forEach(p => { p.stage = 0; p.water = 0; p.fert = 0; });
      }
    });

    if (totalHarvest === 0) {
      return interaction.reply({ content: '⚠️ Chưa có ô đất nào chín muồi (Stage 4) để thu hoạch! Hãy tiếp tục tưới nước và bón phân.', ephemeral: true });
    }

    saveCharacter(user.id, char);
    const { embed, components } = createFarmEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: `🧺 Thu hoạch thành công tổng cộng **${totalHarvest}x Thảo Dược** đã cất vào Túi Trữ Vật!`, ephemeral: true }).catch(() => {});
  }

  // --- 4. TẨY ĐỘC & ĐẠO CƠ (CLEANSE) ---
  if (customId === 'tutien_cleanse_view') {
    const { embed, components } = createCleanseEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_cleanse_action') {
    if ((char.stamina || 0) < 5) {
      return interaction.reply({ content: '⚠️ Cần ít nhất 5 Thể Lực để vận công bế quan tẩy độc!', ephemeral: true });
    }
    char.stamina -= 5;
    cleansePillToxins(char, 15);
    reinforceFoundation(char, 1000);
    saveCharacter(user.id, char);

    const { embed, components } = createCleanseEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: '🧪 Vận công tẩy uế hoàn tất! Đã thanh lọc **-15% Đan Độc** và củng cố **+5% Độ Vững Căn Cơ**!', ephemeral: true }).catch(() => {});
  }

  // --- 5. TỤ LINH ĐỈNH (RESERVOIR) ---
  if (customId === 'tutien_reservoir_view') {
    const { embed, components } = createReservoirEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_reservoir_claim') {
    const stats = getCalculatedStats(char);
    const needed = stats.maxExp - char.exp;
    const reservoir = char.spiritReservoir || { storedExp: 0 };
    const stored = Math.floor(reservoir.storedExp || 0);

    if (needed <= 0 || stored <= 0) {
      return interaction.reply({ content: '⚠️ Không có tu vi khả dụng để trích xuất lúc này!', ephemeral: true });
    }

    const claimAmt = Math.min(needed, stored);
    char.exp += claimAmt;
    reservoir.storedExp -= claimAmt;
    saveCharacter(user.id, char);

    const { embed, components } = createReservoirEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: `🏔️ Trích xuất thành công **+${claimAmt.toLocaleString('vi-VN')} Tu Vi** từ Tụ Linh Đỉnh vào đan điền!`, ephemeral: true }).catch(() => {});
  }

  // --- 6. TẨY TỦY THỂ CHẤT (PHYSIQUE) ---
  if (customId === 'tutien_physique_view') {
    const { embed, components } = createPhysiqueEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_physique_wash') {
    if ((char.spiritStones || 0) < 1000) {
      return interaction.reply({ content: '⚠️ Cần ít nhất 1.000 Linh Thạch để tẩy tủy hoán cốt!', ephemeral: true });
    }
    char.spiritStones -= 1000;
    const newP = rollPhysique();
    char.physiquePending = newP.name;
    saveCharacter(user.id, char);

    const { embed, components } = createPhysiqueEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_physique_accept') {
    if (char.physiquePending) {
      char.physique = char.physiquePending;
      char.physiquePending = null;
      saveCharacter(user.id, char);
    }
    const { embed, components } = createPhysiqueEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_physique_reject') {
    char.physiquePending = null;
    saveCharacter(user.id, char);
    const { embed, components } = createPhysiqueEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  // --- 7. CÔNG PHÁP & HUYẾT THÚ (SKILLS) ---
  if (customId === 'tutien_skills_view') {
    const { embed, components } = createSkillsEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_learn_all') {
    const inv = char.inventory || {};
    if (!char.learnedSkills) char.learnedSkills = [];
    if (!char.absorbedBloodlines) char.absorbedBloodlines = [];

    let learnedCount = 0;
    Object.keys(inv).forEach(k => {
      if (SKILLS_CONFIG[k] && inv[k] > 0 && !char.learnedSkills.includes(k)) {
        char.learnedSkills.push(k);
        inv[k]--;
        learnedCount++;
      }
      if (BLOODLINES_CONFIG[k] && inv[k] > 0 && !char.absorbedBloodlines.includes(k)) {
        char.absorbedBloodlines.push(k);
        inv[k]--;
        learnedCount++;
      }
    });

    saveCharacter(user.id, char);
    const { embed, components } = createSkillsEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: `📖 Đã lĩnh ngộ và thối thể thành công **${learnedCount} bộ Công Pháp / Huyết Thú**!`, ephemeral: true }).catch(() => {});
  }

  // --- 8. HÒM THƯ TIÊN TÍN (MAILBOX) ---
  if (customId === 'tutien_mailbox_view') {
    const { embed, components } = createMailboxEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId === 'tutien_claim_mail') {
    const mailbox = char.mailbox || [];
    let claimCount = 0;
    if (!char.inventory) char.inventory = {};

    mailbox.forEach(m => {
      if (!m.isClaimed) {
        m.isClaimed = true;
        claimCount++;
        if (m.attachedStones) char.spiritStones = (char.spiritStones || 0) + m.attachedStones;
        (m.attachedItems || []).forEach(it => {
          char.inventory[it.itemId] = (char.inventory[it.itemId] || 0) + (it.quantity || 1);
        });
      }
    });

    saveCharacter(user.id, char);
    const { embed, components } = createMailboxEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: `📬 Đã nhận thành công **${claimCount} bức thư** kèm toàn bộ Linh Thạch và bảo vật!`, ephemeral: true }).catch(() => {});
  }

  // --- 9. TÚI TRỮ VẬT & CẮN ĐAN ---
  if (customId === 'tutien_inventory') {
    const { embed, components } = createInventoryEmbed(char, user);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }

  if (customId.startsWith('tutien_use_')) {
    const itemKey = customId.replace('tutien_use_', '');
    const inv = char.inventory || {};

    if ((inv[itemKey] || 0) <= 0) {
      return interaction.reply({ content: `⚠️ Trong túi đồ không có ${itemKey}!`, ephemeral: true });
    }

    inv[itemKey]--;
    const stats = getCalculatedStats(char);
    let msg = '';

    if (itemKey === 'dan_the_luc') {
      char.stamina = Math.min(char.maxStamina || 100, (char.stamina || 0) + 50);
      addPillToxins(char, 1);
      msg = '💊 Đã cắn Thể Lực Đan! Hồi **+50 Thể Lực**. (+1% Đan Độc)';
    } else if (itemKey === 'dan_hoi_mau') {
      char.currentHp = stats.hp;
      addPillToxins(char, 1);
      msg = '🩸 Đã cắn Hồi Huyết Đan! Khí Huyết hồi phục **100%**. (+1% Đan Độc)';
    } else if (itemKey === 'dan_tu_khi') {
      char.exp = Math.min(stats.maxExp, (char.exp || 0) + 500);
      addPillToxins(char, 3);
      msg = '🔮 Đã cắn Tụ Khí Đan! Hấp thu **+500 Tu Vi**. (+3% Đan Độc)';
    } else if (itemKey === 'dan_truc_co') {
      char.exp = Math.min(stats.maxExp, (char.exp || 0) + 3000);
      addPillToxins(char, 5);
      msg = '🌿 Đã cắn Trúc Cơ Linh Đan! Hấp thu **+3.000 Tu Vi**. (+5% Đan Độc)';
    }

    saveCharacter(user.id, char);
    const { embed, components } = createInventoryEmbed(char, user);
    await interaction.update({ embeds: [embed], components }).catch(() => {});
    return interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
  }

  // --- 10. BẢNG XẾP HẠNG ---
  if (customId === 'tutien_leaderboard') {
    const characters = getAllCharacters();
    const { embed, components } = createLeaderboardEmbed(characters);
    return interaction.update({ embeds: [embed], components }).catch(() => {});
  }
}

module.exports = {
  getOrInitCharacter,
  handleCultivate,
  handleBreakthrough,
  handleHunt,
  handleWorldBoss,
  handlePvP,
  handleTuTienSelectMenu,
  handleTuTienButtonInteraction
};
