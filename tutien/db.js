const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'tutien_db.json');

// Dữ liệu mặc định khởi tạo
const DEFAULT_DATA = {
  characters: {}, // key: discordUserId -> character object
  worldBoss: {
    id: 'boss_tram_lu',
    name: 'Trạm Lư Ma Tôn (Thái Cổ Hung Thú)',
    title: 'Thái Cổ Ma Thần Đệ Nhất Kiếp',
    currentHp: 5000000,
    maxHp: 5000000,
    atk: 1500,
    def: 800,
    isAlive: true,
    lastKilledAt: null,
    respawnAt: null,
    dpsTable: {} // key: userId -> { name, damage, realmName }
  },
  globalLogs: []
};

// Đảm bảo thư mục data tồn tại
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let cachedDb = null;
let saveDebounceTimer = null;

function readDb() {
  if (cachedDb) return cachedDb;
  try {
    if (!fs.existsSync(DB_FILE)) {
      saveDbDirect(DEFAULT_DATA);
      cachedDb = JSON.parse(JSON.stringify(DEFAULT_DATA));
      return cachedDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cachedDb = JSON.parse(raw);
    if (!cachedDb.characters) cachedDb.characters = {};
    if (!cachedDb.worldBoss) cachedDb.worldBoss = JSON.parse(JSON.stringify(DEFAULT_DATA.worldBoss));
    return cachedDb;
  } catch (err) {
    console.error('⚠️ [TuTiên DB]: Lỗi đọc tutien_db.json, dùng fallback:', err.message);
    cachedDb = JSON.parse(JSON.stringify(DEFAULT_DATA));
    return cachedDb;
  }
}

function saveDbDirect(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ [TuTiên DB]: Lỗi ghi tutien_db.json:', err.message);
  }
}

function saveDb(data) {
  cachedDb = data;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveDbDirect(cachedDb);
  }, 1000); // Debounce 1s để giảm tải đĩa
}

// Lấy nhân vật theo Discord User ID
function getCharacter(userId) {
  const db = readDb();
  return db.characters[userId] || null;
}

// Lưu nhân vật
function saveCharacter(userId, char) {
  const db = readDb();
  char.lastActiveAt = Date.now();
  db.characters[userId] = char;
  saveDb(db);
}

// Lấy tất cả nhân vật (để xếp hạng)
function getAllCharacters() {
  const db = readDb();
  return Object.entries(db.characters).map(([userId, char]) => ({
    userId,
    ...char
  }));
}

// Lấy World Boss
function getWorldBoss() {
  const db = readDb();
  const boss = db.worldBoss;
  // Kiểm tra hồi sinh boss sau 2 giờ nếu đã bị hạ
  if (!boss.isAlive && boss.respawnAt && Date.now() >= boss.respawnAt) {
    boss.isAlive = true;
    boss.currentHp = boss.maxHp;
    boss.dpsTable = {};
    boss.respawnAt = null;
    saveDb(db);
  }
  return boss;
}

function saveWorldBoss(boss) {
  const db = readDb();
  db.worldBoss = boss;
  saveDb(db);
}

module.exports = {
  readDb,
  saveDb,
  saveDbDirect,
  getCharacter,
  saveCharacter,
  getAllCharacters,
  getWorldBoss,
  saveWorldBoss,
  DB_FILE
};
