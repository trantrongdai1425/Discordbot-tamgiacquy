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
  reinforceFoundation,
  RACES_CONFIG,
  REALMS
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
  createInventoryEmbed,
  createLeaderboardEmbed
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
  const elapsedSec = Math.max(5, Math.min(28800, Math.floor((now - lastTime) / 1000))); // Tối đa tích 8 tiếng

  const baseGain = elapsedSec * stats.expPerSec;
  let gainedExp = Math.max(10, Math.floor(baseGain));

  // Cộng Tu Vi
  if (char.exp < stats.maxExp) {
    char.exp = Math.min(stats.maxExp, char.exp + gainedExp);
  } else {
    // Nếu tu vi đã đầy, dồn 40% vào Tụ Linh Đỉnh
    const overflow = Math.floor(gainedExp * 0.4);
    if (!char.spiritReservoir) char.spiritReservoir = { storedExp: 0, maxCapacity: 50000 };
    char.spiritReservoir.storedExp += overflow;
    reinforceFoundation(char, overflow);
  }

  // Tự động thanh lọc đan độc tự nhiên
  cleansePillToxins(char, Math.max(1, Math.floor(elapsedSec / 120)));

  // Hồi phục thể lực (1 điểm / 60 giây)
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
    // Đột phá thành công
    char.realmId = Math.min(REALMS.length, (char.realmId || 1) + 1);
    char.exp = 0;
    const newStats = getCalculatedStats(char);
    char.currentHp = newStats.hp; // Hồi phục đầy máu sau khi độ kiếp

    // Tặng danh hiệu nếu vượt đại cảnh giới
    if (tribResult.isMajor) {
      char.spiritStones = (char.spiritStones || 0) + 1000;
    }

    // Nhờ Gemini AI tạo câu đối thoại sấm sét
    if (typeof aiStoryGenerator === 'function') {
      try {
        const prompt = `Viết đúng 2 câu ngắn văn phong Tiên Hiệp cổ phong cực kỳ hào hùng và huyền ảo miêu tả tu sĩ "${char.name}" (${RACES_CONFIG[char.race]?.name}) vừa vượt qua cửu trọng lôi kiếp, phá vỡ bình cảnh từ ${oldRealmName} bước chân vào ${tribResult.nextRealmName}.`;
        aiStory = await aiStoryGenerator(prompt);
      } catch (_) {}
    }
  } else {
    // Thất bại: Chân thân bị tổn hại, lùi 15% tu vi
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

  // Kiểm tra thể lực
  if ((char.stamina || 0) < 10) {
    return {
      error: '⚠️ **Thể Lực cạn kiệt!**\nĐạo hữu cần ít nhất **10 điểm Thể Lực** để vào bãi săn. Thể lực tự hồi 1 điểm mỗi phút hoặc có thể dùng Đan Thể Lực trong túi đồ!'
    };
  }

  // Xác định bậc bãi săn theo cảnh giới
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

    // Cộng Exp & Linh thạch
    char.exp = Math.min(stats.maxExp, (char.exp || 0) + loot.exp);
    char.spiritStones = (char.spiritStones || 0) + loot.stones;

    // Cất đồ vào Túi Trữ Vật
    if (!char.inventory) char.inventory = {};
    (loot.items || []).forEach(item => {
      char.inventory[item.id] = (char.inventory[item.id] || 0) + (item.count || 1);
    });

    char.currentHp = combatResult.remainingPlayerHp;
  } else {
    // Thua trận
    char.stamina = Math.max(0, (char.stamina || 100) - 5);
    char.currentHp = 50; // Thoi thóp trở về
  }

  char.lastActiveAt = Date.now();
  saveCharacter(user.id, char);

  return { char, monster, combatResult, loot };
}

// 4. XỬ LÝ TẤN CÔNG WORLD BOSS TRẢM LƯ MA TÔN
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

  // Tính sát thương người chơi gây ra
  const randFactor = 0.85 + Math.random() * 0.35;
  const isCrit = Math.random() < 0.25;
  const baseDmg = Math.max(100, Math.floor(stats.atk * randFactor - boss.def * 0.2));
  const playerDmg = isCrit ? Math.floor(baseDmg * 1.6) : baseDmg;

  boss.currentHp = Math.max(0, boss.currentHp - playerDmg);

  // Cập nhật bảng DPS
  if (!boss.dpsTable) boss.dpsTable = {};
  const currentDps = boss.dpsTable[user.id] || { name: char.name, damage: 0, realmName: stats.realmName };
  currentDps.damage += playerDmg;
  currentDps.realmName = stats.realmName;
  currentDps.name = char.name;
  boss.dpsTable[user.id] = currentDps;

  // Thưởng chiến tích
  const stonesReward = Math.floor(playerDmg / 8);
  const expReward = Math.floor(playerDmg / 4);
  char.spiritStones = (char.spiritStones || 0) + stonesReward;
  char.exp = Math.min(stats.maxExp, (char.exp || 0) + expReward);
  char.stamina = Math.max(0, (char.stamina || 100) - 15);

  // Nếu Boss bị hạ
  if (boss.currentHp <= 0) {
    boss.isAlive = false;
    boss.lastKilledAt = Date.now();
    boss.respawnAt = Date.now() + 2 * 3600 * 1000; // 2 tiếng hồi sinh
    // Thưởng 5000 Linh thạch cho người tung đòn kết liễu
    char.spiritStones += 5000;
  }

  saveWorldBoss(boss);
  saveCharacter(user.id, char);

  return { char, boss, playerDmg };
}

// 5. BỘ ĐIỀU PHỐI TƯƠNG TÁC NÚT BẤM (BUTTON ROUTER)
async function handleTuTienButtonInteraction(interaction, aiStoryGenerator = null) {
  const customId = interaction.customId;
  const user = interaction.user;

  // Kiểm tra cooldown chống spam click
  const cdRemain = checkCooldown(user.id, 1500);
  if (cdRemain) {
    await interaction.reply({
      content: `⏳ Đạo hữu tâm cảnh dao động quá nhanh, xin đợi **${cdRemain} giây** để ổn định chân khí!`,
      ephemeral: true
    }).catch(() => {});
    return;
  }

  // 1. Nút Bế Quan Tu Luyện
  if (customId === 'tutien_cultivate') {
    const result = await handleCultivate(user);
    const cultivateEmbed = createCultivateResultEmbed(result.char, result.gainedExp, result.elapsedSec);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);

    await interaction.update({
      embeds: [mainEmbed, cultivateEmbed],
      components: buttons
    }).catch(() => {});
    return;
  }

  // 2. Nút Nghênh Đón Lôi Kiếp
  if (customId === 'tutien_breakthrough') {
    await interaction.deferUpdate().catch(() => {});
    const result = await handleBreakthrough(user, aiStoryGenerator);

    if (result.error) {
      await interaction.followUp({ content: result.error, ephemeral: true }).catch(() => {});
      return;
    }

    const tribEmbed = createTribulationEmbed(result.char, result.tribResult, result.aiStory);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);

    await interaction.editReply({
      embeds: [mainEmbed, tribEmbed],
      components: buttons
    }).catch(() => {});
    return;
  }

  // 3. Nút Vào Bãi Săn
  if (customId === 'tutien_hunt_menu') {
    await interaction.deferUpdate().catch(() => {});
    const result = await handleHunt(user);

    if (result.error) {
      await interaction.followUp({ content: result.error, ephemeral: true }).catch(() => {});
      return;
    }

    const combatEmbed = createCombatEmbed(result.char, result.monster, result.combatResult, result.loot);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);

    await interaction.editReply({
      embeds: [mainEmbed, combatEmbed],
      components: buttons
    }).catch(() => {});
    return;
  }

  // 4. Nút Khiêu Chiến World Boss
  if (customId === 'tutien_boss') {
    await interaction.deferUpdate().catch(() => {});
    const result = await handleWorldBoss(user);

    if (result.error) {
      await interaction.followUp({ content: result.error, ephemeral: true }).catch(() => {});
      return;
    }

    const bossEmbed = createWorldBossEmbed(result.boss, result.char, result.playerDmg);
    const mainEmbed = createCharacterEmbed(result.char, user);
    const buttons = createMainActionRows(result.char);

    await interaction.editReply({
      embeds: [mainEmbed, bossEmbed],
      components: buttons
    }).catch(() => {});
    return;
  }

  // 5. Nút Túi Trữ Vật
  if (customId === 'tutien_inventory') {
    const char = getOrInitCharacter(user);
    const invEmbed = createInventoryEmbed(char, user);
    await interaction.reply({
      embeds: [invEmbed],
      ephemeral: true
    }).catch(() => {});
    return;
  }

  // 6. Nút Bảng Xếp Hạng
  if (customId === 'tutien_leaderboard') {
    const characters = getAllCharacters();
    const rankEmbed = createLeaderboardEmbed(characters);
    await interaction.reply({
      embeds: [rankEmbed],
      ephemeral: true
    }).catch(() => {});
    return;
  }

  // 7. Nút Làm Mới Thẻ Nhân Vật
  if (customId === 'tutien_refresh') {
    const char = getOrInitCharacter(user);
    const mainEmbed = createCharacterEmbed(char, user);
    const buttons = createMainActionRows(char);

    await interaction.update({
      embeds: [mainEmbed],
      components: buttons
    }).catch(() => {});
    return;
  }
}

module.exports = {
  getOrInitCharacter,
  handleCultivate,
  handleBreakthrough,
  handleHunt,
  handleWorldBoss,
  handleTuTienButtonInteraction
};
