// server/gameEngine.js - Động cơ tính toán logic Game Tu Tiên
// Nâng cấp: Ngũ Đại Tộc (3 giai đoạn thức tỉnh), Tư Chất & Linh Căn, Căn Cơ & Đan Độc, Đài Độ Kiếp, Bãi Săn Tự Do

// 1. HỆ THỐNG CẢNH GIỚI (32 Cấp Bậc)
const REALMS = [
  // Luyện Khí Tầng 1 -> 9
  { id: 1, name: "Luyện Khí Tầng 1", maxExp: 100, expPerSec: 1, hp: 500, atk: 50, def: 25, speed: 10, isMajor: false },
  { id: 2, name: "Luyện Khí Tầng 2", maxExp: 200, expPerSec: 1.5, hp: 600, atk: 65, def: 32, speed: 11, isMajor: false },
  { id: 3, name: "Luyện Khí Tầng 3", maxExp: 350, expPerSec: 2, hp: 720, atk: 80, def: 40, speed: 12, isMajor: false },
  { id: 4, name: "Luyện Khí Tầng 4", maxExp: 550, expPerSec: 2.5, hp: 860, atk: 100, def: 50, speed: 13, isMajor: false },
  { id: 5, name: "Luyện Khí Tầng 5", maxExp: 800, expPerSec: 3, hp: 1020, atk: 125, def: 62, speed: 14, isMajor: false },
  { id: 6, name: "Luyện Khí Tầng 6", maxExp: 1150, expPerSec: 3.5, hp: 1200, atk: 155, def: 77, speed: 15, isMajor: false },
  { id: 7, name: "Luyện Khí Tầng 7", maxExp: 1600, expPerSec: 4, hp: 1400, atk: 190, def: 95, speed: 16, isMajor: false },
  { id: 8, name: "Luyện Khí Tầng 8", maxExp: 2200, expPerSec: 4.5, hp: 1650, atk: 230, def: 115, speed: 17, isMajor: false },
  { id: 9, name: "Luyện Khí Tầng 9 (Đỉnh Phong)", maxExp: 3000, expPerSec: 5, hp: 2000, atk: 280, def: 140, speed: 18, isMajor: true },

  // Trúc Cơ
  { id: 10, name: "Trúc Cơ Sơ Kỳ", maxExp: 6000, expPerSec: 10, hp: 3500, atk: 450, def: 220, speed: 22, isMajor: false },
  { id: 11, name: "Trúc Cơ Trung Kỳ", maxExp: 12000, expPerSec: 15, hp: 5000, atk: 650, def: 320, speed: 25, isMajor: false },
  { id: 12, name: "Trúc Cơ Hậu Kỳ", maxExp: 20000, expPerSec: 20, hp: 7000, atk: 900, def: 450, speed: 28, isMajor: false },
  { id: 13, name: "Trúc Cơ Viên Mãn", maxExp: 32000, expPerSec: 25, hp: 9500, atk: 1200, def: 600, speed: 32, isMajor: true },

  // Kim Đan
  { id: 14, name: "Kim Đan Sơ Kỳ", maxExp: 60000, expPerSec: 50, hp: 15000, atk: 2000, def: 1000, speed: 40, isMajor: false },
  { id: 15, name: "Kim Đan Trung Kỳ", maxExp: 100000, expPerSec: 70, hp: 22000, atk: 2900, def: 1450, speed: 45, isMajor: false },
  { id: 16, name: "Kim Đan Hậu Kỳ", maxExp: 160000, expPerSec: 90, hp: 30000, atk: 4000, def: 2000, speed: 50, isMajor: false },
  { id: 17, name: "Kim Đan Viên Mãn", maxExp: 250000, expPerSec: 120, hp: 42000, atk: 5500, def: 2750, speed: 55, isMajor: true },

  // Nguyên Anh
  { id: 18, name: "Nguyên Anh Sơ Kỳ", maxExp: 450000, expPerSec: 200, hp: 65000, atk: 8500, def: 4200, speed: 65, isMajor: false },
  { id: 19, name: "Nguyên Anh Trung Kỳ", maxExp: 750000, expPerSec: 280, hp: 95000, atk: 12500, def: 6200, speed: 75, isMajor: false },
  { id: 20, name: "Nguyên Anh Hậu Kỳ", maxExp: 1200000, expPerSec: 380, hp: 135000, atk: 18000, def: 9000, speed: 85, isMajor: false },
  { id: 21, name: "Nguyên Anh Viên Mãn", maxExp: 1800000, expPerSec: 500, hp: 185000, atk: 25000, def: 12500, speed: 95, isMajor: true },

  // Hóa Thần
  { id: 22, name: "Hóa Thần Sơ Kỳ", maxExp: 3000000, expPerSec: 800, hp: 260000, atk: 35000, def: 17500, speed: 110, isMajor: false },
  { id: 23, name: "Hóa Thần Trung Kỳ", maxExp: 4500000, expPerSec: 1100, hp: 360000, atk: 48000, def: 24000, speed: 125, isMajor: false },
  { id: 24, name: "Hóa Thần Hậu Kỳ", maxExp: 6500000, expPerSec: 1500, hp: 480000, atk: 65000, def: 32500, speed: 140, isMajor: false },
  { id: 25, name: "Hóa Thần Viên Mãn", maxExp: 9000000, expPerSec: 2000, hp: 620000, atk: 85000, def: 42500, speed: 155, isMajor: true },

  // Luyện Hư
  { id: 26, name: "Luyện Hư Sơ Kỳ", maxExp: 14000000, expPerSec: 3000, hp: 850000, atk: 120000, def: 60000, speed: 180, isMajor: false },
  { id: 27, name: "Luyện Hư Trung Kỳ", maxExp: 20000000, expPerSec: 4200, hp: 1150000, atk: 165000, def: 82500, speed: 200, isMajor: false },
  { id: 28, name: "Luyện Hư Hậu Kỳ", maxExp: 30000000, expPerSec: 5800, hp: 1550000, atk: 220000, def: 110000, speed: 225, isMajor: false },
  { id: 29, name: "Luyện Hư Viên Mãn", maxExp: 45000000, expPerSec: 8000, hp: 2100000, atk: 300000, def: 150000, speed: 250, isMajor: true },

  // Hợp Thể
  { id: 30, name: "Hợp Thể Đỉnh Phong", maxExp: 100000000, expPerSec: 15000, hp: 4000000, atk: 550000, def: 275000, speed: 300, isMajor: true },
  // Đại Thừa
  { id: 31, name: "Đại Thừa Đỉnh Phong", maxExp: 300000000, expPerSec: 30000, hp: 8000000, atk: 1100000, def: 550000, speed: 400, isMajor: true },
  // Độ Kiếp
  { id: 32, name: "Độ Kiếp Kỳ (Chân Tiên)", maxExp: 999999999, expPerSec: 60000, hp: 20000000, atk: 3000000, def: 1500000, speed: 500, isMajor: true }
];

// Hàm xác định Giai Đoạn Thức Tỉnh (1: Luyện Khí, 2: Trúc Cơ - Kim Đan, 3: Nguyên Anh trở lên)
function getAwakeningTier(realmId) {
  if (realmId <= 9) return 1;
  if (realmId <= 17) return 2;
  return 3;
}

// CÔNG THỨC HIỆU SUẤT THIỀN ĐỊNH (-2% mỗi tiểu cảnh, -5% mỗi đại cảnh)
function getMeditationEfficiency(realmId) {
  let rate = 100;
  const majorBorders = [9, 13, 17, 21, 25, 29, 30, 31];

  for (let id = 2; id <= realmId; id++) {
    if (majorBorders.includes(id - 1)) {
      rate -= 5;
    } else {
      rate -= 2;
    }
  }

  return Math.max(15, rate);
}

// 2. HỆ THỐNG NGŨ ĐẠI TỘC & 3 GIAI ĐOẠN THỨC TỈNH (BALANCED PROGRESSION)
const RACES_CONFIG = {
  Tien: {
    id: "Tien",
    name: "Tiên Tộc",
    symbol: "👑",
    element: "Tiên Khí",
    color: "#facc15",
    desc: "Bẩm Sinh Tiên Cốt, xuất trần thanh khiết, ngạo thị quần hùng.",
    getMods: (tier) => {
      if (tier === 1) {
        return {
          statBonus: 0.08,
          reduceMaYeu: 0.05,
          lowHpThreshold: 0.20,
          lowHpPenalty: 0.10,
          breakthroughCostMult: 1.2,
          trueDmgFromPoison: 0,
          tribulationDmgMult: 0.95,
          thanHiBonus: 0.02
        };
      } else if (tier === 2) {
        return {
          statBonus: 0.16,
          reduceMaYeu: 0.12,
          lowHpThreshold: 0.25,
          lowHpPenalty: 0.18,
          breakthroughCostMult: 1.4,
          trueDmgFromPoison: 0.20,
          tribulationDmgMult: 0.90,
          thanHiBonus: 0.04
        };
      } else {
        return {
          statBonus: 0.25,
          reduceMaYeu: 0.20,
          lowHpThreshold: 0.30,
          lowHpPenalty: 0.25,
          breakthroughCostMult: 2.0,
          trueDmgFromPoison: 0.40,
          tribulationDmgMult: 0.85,
          thanHiBonus: 0.06
        };
      }
    }
  },
  Ma: {
    id: "Ma",
    name: "Ma Tộc",
    symbol: "⚔️",
    element: "Ma Khí",
    color: "#f87171",
    desc: "Thôn Phệ Sát Lực, cuồng ma huyết nộ, sát phạt quả đoán.",
    getMods: (tier) => {
      if (tier === 1) {
        return {
          huntExpBonus: 0.15,
          lifesteal: 0.05,
          berserkPerStep: 0.03,
          berserkHpStep: 0.20,
          tribulationDmgMult: 1.15,
          extraStrikes: 0,
          healPillEff: 0.85,
          backfireChance: 0
        };
      } else if (tier === 2) {
        return {
          huntExpBonus: 0.25,
          lifesteal: 0.08,
          berserkPerStep: 0.03,
          berserkHpStep: 0.10,
          tribulationDmgMult: 1.25,
          extraStrikes: 1,
          healPillEff: 0.75,
          backfireChance: 0.10
        };
      } else {
        return {
          huntExpBonus: 0.40,
          lifesteal: 0.12,
          berserkPerStep: 0.06,
          berserkHpStep: 0.10,
          tribulationDmgMult: 1.40,
          extraStrikes: 2,
          healPillEff: 0.65,
          backfireChance: 0.20
        };
      }
    }
  },
  Yeu: {
    id: "Yeu",
    name: "Yêu Tộc",
    symbol: "🐉",
    element: "Yêu Lực",
    color: "#4ade80",
    desc: "Thái Cổ Thần Khu, da dày vảy cứng, nhục thân bất diệt.",
    getMods: (tier) => {
      if (tier === 1) {
        return {
          hpBonus: 0.15,
          defBonus: 0.10,
          hpRegenPercent: 0.01,
          tribulationResist: 0.10,
          meditationPenalty: -0.15,
          speedPenalty: -3,
          beastDropBonus: 0.10
        };
      } else if (tier === 2) {
        return {
          hpBonus: 0.28,
          defBonus: 0.20,
          hpRegenPercent: 0.02,
          tribulationResist: 0.20,
          meditationPenalty: -0.30,
          speedPenalty: -8,
          beastDropBonus: 0.30
        };
      } else {
        return {
          hpBonus: 0.45,
          defBonus: 0.30,
          hpRegenPercent: 0.03,
          tribulationResist: 0.30,
          meditationPenalty: -0.45,
          speedPenalty: -15,
          beastDropBonus: 0.60
        };
      }
    }
  },
  Minh: {
    id: "Minh",
    name: "Minh Tộc",
    symbol: "👻",
    element: "Hồn Lực",
    color: "#c084fc",
    desc: "Hư Ảnh Vô Tung, toái hồn bạo kích, du đãng cửu tuyền.",
    getMods: (tier) => {
      if (tier === 1) {
        return {
          speedBonus: 6,
          dodgeRate: 0.08,
          critRateBonus: 0.08,
          hpPenalty: -0.10,
          fireVulnerability: 0.15,
          burnDmgPercent: 0,
          tribulationDmgMult: 1.15
        };
      } else if (tier === 2) {
        return {
          speedBonus: 15,
          dodgeRate: 0.14,
          critRateBonus: 0.15,
          hpPenalty: -0.18,
          fireVulnerability: 0.30,
          burnDmgPercent: 0.03,
          tribulationDmgMult: 1.30
        };
      } else {
        return {
          speedBonus: 25,
          dodgeRate: 0.20,
          critRateBonus: 0.25,
          hpPenalty: -0.25,
          fireVulnerability: 0.50,
          burnDmgPercent: 0.05,
          tribulationDmgMult: 1.50
        };
      }
    }
  },
  Nhan: {
    id: "Nhan",
    name: "Nhân Tộc",
    symbol: "☯️",
    element: "Linh Khí",
    color: "#38bdf8",
    desc: "Vạn Đạo Ngộ Tính, bách gia toàn năng, nghịch thiên cải mệnh.",
    getMods: (tier) => {
      if (tier === 1) {
        return {
          meditationBonus: 0.15,
          craftDiscount: 0.10,
          skillBonusMult: 1.25,
          leakGraceSeconds: 180
        };
      } else if (tier === 2) {
        return {
          meditationBonus: 0.22,
          craftDiscount: 0.20,
          skillBonusMult: 1.50,
          leakGraceSeconds: 120
        };
      } else {
        return {
          meditationBonus: 0.30,
          craftDiscount: 0.30,
          skillBonusMult: 2.00,
          leakGraceSeconds: 60
        };
      }
    }
  }
};

function getRaceModifiers(raceKey, realmId) {
  const race = RACES_CONFIG[raceKey] || RACES_CONFIG["Nhan"];
  const tier = getAwakeningTier(realmId || 1);
  return race.getMods(tier);
}

// 3. HỆ THỐNG TƯ CHẤT, ẨN MẠCH, CĂN CƠ & KỲ DƯỢC (IMPORT TỪ CULTIVATION_CONFIG TẬP TRUNG)
const {
  SPIRITUAL_ROOTS,
  APTITUDES,
  LATENT_TRAITS,
  FOUNDATION_FORMS,
  KIM_DAN_INSCRIPTIONS,
  KIM_DAN_PHENOMENA,
  ANCIENT_RELICS_APPRAISAL,
  REINCARNATION_RULES,
  FOUNDATION_CONFIG,
  rollSpiritualRoot,
  rollAptitude,
  rollLatentTrait,
  getFoundationStabilityInfo,
  getPillToxinInfo,
  appraiseAncientRelic,
  evaluateTrucCoGrade,
  evaluateKimDanGrade,
  evaluateKimDanBreakthrough,
  executeReincarnation
} = require('./cultivationConfig');

// 4. HỆ THỐNG THỂ CHẤT (PHYSIQUES)
const PHYSIQUES = [
  { name: "Phàm Thai Nhục Thân", rank: "Phàm", color: "#9e9e9e", atkBonus: 0, defBonus: 0, hpBonus: 0, expRateBonus: 0 },
  { name: "Bì Đao Phàm Thể", rank: "Phàm", color: "#9e9e9e", atkBonus: 0.05, defBonus: 0.02, hpBonus: 0.02, expRateBonus: 0 },
  { name: "Thiết Cốt Phàm Thể", rank: "Phàm", color: "#9e9e9e", atkBonus: 0.02, defBonus: 0.06, hpBonus: 0.03, expRateBonus: 0 },

  { name: "Mộc Linh Thể", rank: "Linh", color: "#4caf50", atkBonus: 0.1, defBonus: 0.08, hpBonus: 0.15, expRateBonus: 0.1 },
  { name: "Kim Cương Linh Thể", rank: "Linh", color: "#2196f3", atkBonus: 0.08, defBonus: 0.2, hpBonus: 0.15, expRateBonus: 0.08 },
  { name: "Liệt Hỏa Linh Thể", rank: "Linh", color: "#ff9800", atkBonus: 0.22, defBonus: 0.05, hpBonus: 0.08, expRateBonus: 0.1 },
  { name: "Huyền Thủy Linh Thể", rank: "Linh", color: "#00bcd4", atkBonus: 0.12, defBonus: 0.12, hpBonus: 0.18, expRateBonus: 0.12 },

  { name: "Cửu Dương Vương Thể", rank: "Vương", color: "#9c27b0", atkBonus: 0.35, defBonus: 0.2, hpBonus: 0.25, expRateBonus: 0.2 },
  { name: "Băng Phách Vương Thể", rank: "Vương", color: "#3f51b5", atkBonus: 0.3, defBonus: 0.3, hpBonus: 0.25, expRateBonus: 0.2 },
  { name: "Chiến Thần Vương Thể", rank: "Vương", color: "#e91e63", atkBonus: 0.45, defBonus: 0.15, hpBonus: 0.3, expRateBonus: 0.25 },

  { name: "Hoang Cổ Thánh Thể", rank: "Thánh", color: "#ffd700", atkBonus: 0.8, defBonus: 0.6, hpBonus: 0.8, expRateBonus: 0.4 },
  { name: "Thái Âm Thánh Thể", rank: "Thánh", color: "#ffd700", atkBonus: 0.75, defBonus: 0.65, hpBonus: 0.75, expRateBonus: 0.45 },
  { name: "Bất Diệt Thánh Thể", rank: "Thánh", color: "#ffd700", atkBonus: 0.6, defBonus: 1.0, hpBonus: 1.2, expRateBonus: 0.4 },
  { name: "Vạn Kiếp Thánh Thể", rank: "Thánh", color: "#ffd700", atkBonus: 0.9, defBonus: 0.5, hpBonus: 0.7, expRateBonus: 0.5 },

  { name: "Hỗn Độn Thể", rank: "Thần", color: "#ff3b30", atkBonus: 1.5, defBonus: 1.2, hpBonus: 1.5, expRateBonus: 1.0 },
  { name: "Tiên Thiên Đạo Thể", rank: "Thần", color: "#ff3b30", atkBonus: 1.3, defBonus: 1.3, hpBonus: 1.4, expRateBonus: 1.2 },
  { name: "Chí Tôn Thần Thể", rank: "Thần", color: "#ff3b30", atkBonus: 1.8, defBonus: 1.0, hpBonus: 1.3, expRateBonus: 0.9 }
];

function rollPhysique() {
  const rand = Math.random() * 100;
  let targetRank = "Phàm";
  if (rand < 1) targetRank = "Thần";
  else if (rand < 6) targetRank = "Thánh";
  else if (rand < 20) targetRank = "Vương";
  else if (rand < 50) targetRank = "Linh";
  else targetRank = "Phàm";

  const candidates = PHYSIQUES.filter(p => p.rank === targetRank);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 5. NGŨ HÀNH & TƯƠNG KHẮC
const ELEMENTS = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
const COUNTER_MAP = {
  "Kim": "Mộc",
  "Mộc": "Thổ",
  "Thổ": "Thủy",
  "Thủy": "Hỏa",
  "Hỏa": "Kim"
};

function getCounterBonus(elemA, elemB) {
  if (COUNTER_MAP[elemA] === elemB) return 1.25;
  if (COUNTER_MAP[elemB] === elemA) return 0.85;
  return 1.0;
}

// 6. DANH SÁCH BÃI SĂN THEO CẢNH GIỚI (TIERED HUNTING GROUNDS)
const HUNTING_ZONES = [
  {
    id: "zone_luyen_khi",
    name: "Luyện Khí Sơn Cốc",
    minRealm: 1,
    desc: "Thung lũng sơ khai, yêu thú cấp thấp sinh sống.",
    monsters: [
      { name: "Hỏa Sí Ma Lang", element: "Hỏa", tier: 1, hp: 350, atk: 40, def: 18, exp: 60, stones: 40, icon: "🐺" },
      { name: "Thanh Mãng Xà", element: "Mộc", tier: 1, hp: 550, atk: 60, def: 28, exp: 90, stones: 60, icon: "🐍" }
    ]
  },
  {
    id: "zone_truc_co",
    name: "Trúc Cơ Đầm Lầy",
    minRealm: 10,
    desc: "Đầm lầy độc khí mịt mù, nơi cư ngụ của hung thú Trúc Cơ.",
    monsters: [
      { name: "Hắc Thủy Cự Hạt", element: "Thủy", tier: 2, hp: 1500, atk: 160, def: 80, exp: 350, stones: 200, icon: "🦂" },
      { name: "Thiết Bối Hùng Vương", element: "Thổ", tier: 2, hp: 4000, atk: 450, def: 280, exp: 900, stones: 500, icon: "🐻" }
    ]
  },
  {
    id: "zone_kim_dan",
    name: "Kim Đan Cổ Lăng",
    minRealm: 14,
    desc: "Lăng mộ cổ xưa chôn giấu linh điền và hung thú Kim Đan.",
    monsters: [
      { name: "Kim Sí Điêu Vương", element: "Kim", tier: 3, hp: 18000, atk: 2200, def: 1200, exp: 2800, stones: 1600, icon: "🦅" },
      { name: "Huyết Diễm Độc Chu", element: "Hỏa", tier: 3, hp: 28000, atk: 3500, def: 1800, exp: 4500, stones: 2600, icon: "🕷️" }
    ]
  },
  {
    id: "zone_nguyen_anh",
    name: "Nguyên Anh Cấm Địa",
    minRealm: 18,
    desc: "Cấm địa nguy hiểm bậc nhất, chỉ có đại năng mới dám bước vào.",
    monsters: [
      { name: "Xích Diễm Ma Giao", element: "Hỏa", tier: 4, hp: 80000, atk: 9000, def: 5000, exp: 12000, stones: 7000, icon: "🐲" },
      { name: "U Minh Bạch Hổ", element: "Kim", tier: 4, hp: 160000, atk: 20000, def: 11000, exp: 26000, stones: 16000, icon: "🐯" }
    ]
  },
  {
    id: "zone_hoa_than",
    name: "Hóa Thần Hoang Nguyên",
    minRealm: 22,
    desc: "Vùng đất viễn cổ hoang vu, hung thú ngàn năm xuất hiện.",
    monsters: [
      { name: "Thái Cổ Cự Kình", element: "Thủy", tier: 5, hp: 600000, atk: 80000, def: 42000, exp: 70000, stones: 45000, icon: "🐋" },
      { name: "Bát Hoang Ma Long", element: "Thổ", tier: 5, hp: 1200000, atk: 180000, def: 90000, exp: 160000, stones: 90000, icon: "🐉" }
    ]
  }
];

// 7. CƠ CHẾ SINH QUÁI BÃI SĂN TỰ DO
const WILD_NAMES = ["Ma Lang", "Cự Hạt", "Giao Long", "Bạch Hổ", "U Hồn Tinh", "Kim Sí Điêu", "Băng Chu", "Hỏa Phượng", "Cự Viên", "Độc Mãng"];
const WILD_PREFIXES = [
  { name: "Thường", rate: 0.58, statMult: 1.0, rewardMult: 1.0, color: "#94a3b8" },
  { name: "Tinh Anh", rate: 0.25, statMult: 1.45, rewardMult: 2.2, color: "#38bdf8" },
  { name: "Biến Dị", rate: 0.12, statMult: 1.9, rewardMult: 4.0, color: "#c084fc" },
  { name: "Thái Cổ Hung Thú", rate: 0.05, statMult: 2.6, rewardMult: 7.5, color: "#f59e0b" }
];

function generateWildMonster(playerRealmId) {
  const randOffset = Math.floor((Math.random() - 0.3) * 6);
  let targetRealmId = Math.max(1, Math.min(32, playerRealmId + randOffset));

  const baseRealm = REALMS.find(r => r.id === targetRealmId) || REALMS[0];
  const elem = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

  const r = Math.random();
  let prefix = WILD_PREFIXES[0];
  let accum = 0;
  for (let p of WILD_PREFIXES) {
    accum += p.rate;
    if (r <= accum) {
      prefix = p;
      break;
    }
  }

  const baseName = WILD_NAMES[Math.floor(Math.random() * WILD_NAMES.length)];
  const fullName = `[${prefix.name}] ${baseName}`;

  const hp = Math.floor(baseRealm.hp * 0.7 * prefix.statMult * (0.85 + Math.random() * 0.3));
  const atk = Math.floor(baseRealm.atk * 0.75 * prefix.statMult * (0.85 + Math.random() * 0.3));
  const def = Math.floor(baseRealm.def * 0.7 * prefix.statMult * (0.85 + Math.random() * 0.3));
  const exp = Math.floor(baseRealm.maxExp * 0.08 * prefix.rewardMult);
  const stones = Math.floor(baseRealm.maxExp * 0.05 * prefix.rewardMult) + 20;

  let tier = 1;
  if (targetRealmId >= 22) tier = 5;
  else if (targetRealmId >= 18) tier = 4;
  else if (targetRealmId >= 14) tier = 3;
  else if (targetRealmId >= 10) tier = 2;

  return {
    name: fullName,
    prefix: prefix.name,
    prefixColor: prefix.color,
    realmName: baseRealm.name,
    targetRealmId,
    element: elem,
    tier,
    hp,
    maxHp: hp,
    atk,
    def,
    exp,
    stones,
    isWild: true
  };
}

// 8. HỆ THỐNG VẬT PHẨM & CÔNG PHÁP, HUYẾT THÚ
const SKILLS_CONFIG = {
  "cong_phap_kiem_quyet": {
    name: "Thái Hư Kiếm Quyết",
    icon: "🗡️",
    desc: "Kiếm khí tung hoành, tăng vĩnh viễn +15% Công Kích.",
    buffAtk: 0.15,
    buffDef: 0,
    buffHp: 0,
    buffSpeed: 0
  },
  "cong_phap_bat_hoai": {
    name: "Kim Cương Bất Hoại Thân",
    icon: "🛡️",
    desc: "Thân thể đúc bằng kim cương, tăng +20% Phòng Ngự và +10% Kháng Lôi Kiếp.",
    buffAtk: 0,
    buffDef: 0.2,
    buffHp: 0.05,
    buffSpeed: 0,
    lightningResist: 0.1
  },
  "cong_phap_huyen_bo": {
    name: "Thiên Lôi Huyễn Bộ",
    icon: "⚡",
    desc: "Thân pháp như điện xẹt, tăng +15 Tốc Độ và +5% Né Tránh.",
    buffAtk: 0,
    buffDef: 0,
    buffHp: 0,
    buffSpeed: 15
  },
  "cong_phap_hoa_kinh": {
    name: "Bát Hoang Liệt Hỏa Kinh",
    icon: "🔥",
    desc: "Ngưng tụ chân hỏa viễn cổ, tăng +25% sát thương hỏa công.",
    buffAtk: 0.25,
    buffDef: 0,
    buffHp: 0,
    buffSpeed: 0
  }
};

const BLOODLINES_CONFIG = {
  "huyet_thu_ma_lang": {
    name: "Huyết Thú Ma Lang",
    icon: "🩸",
    desc: "Luyện hóa tinh huyết ma lang, tăng +15% Khí Huyết và nhận 5% Hút Máu khi chiến đấu.",
    buffHp: 0.15,
    lifesteal: 0.05
  },
  "huyet_thu_hung_vuong": {
    name: "Huyết Thú Cự Hùng",
    icon: "🐻",
    desc: "Luyện hóa gấu chúa viễn cổ, tăng +30% Khí Huyết và giảm 10% sát thương phải chịu.",
    buffHp: 0.3,
    dmgReduction: 0.1
  },
  "huyet_thu_thai_co": {
    name: "Huyết Thú Thái Cổ",
    icon: "🐉",
    desc: "Chân long tinh huyết, tăng +50% Khí Huyết và giảm 25% sát thương Lôi Kiếp!",
    buffHp: 0.5,
    lightningResist: 0.25
  }
};

// Hàm tính toán rơi đồ sau khi diệt quái
function rollCombatLoot(monster, playerRace = "Nhan") {
  let loot = {
    exp: monster.exp,
    stones: monster.stones,
    items: []
  };

  const tier = monster.tier || 1;
  const isWild = !!monster.isWild;
  const prefix = monster.prefix || "Thường";

  // Tỉ lệ rơi Yêu Đan (Yêu Tộc được bonus)
  let coreChance = isWild ? 0.6 : 0.4;
  if (playerRace === "Yeu") coreChance += 0.15;
  if (prefix === "Tinh Anh" || prefix === "Biến Dị" || prefix === "Thái Cổ Hung Thú") {
    coreChance = 1.0;
  }
  if (Math.random() < coreChance) {
    const coreKey = `yeu_dan_${tier}`;
    loot.items.push({ id: coreKey, count: 1, name: `Yêu Đan Giai ${tier}` });
  }

  // Tỉ lệ rơi Thảo dược
  if (Math.random() < 0.4) {
    loot.items.push({ id: "thao_duoc_linh_chi", count: Math.floor(Math.random() * 3) + 1, name: "Thảo Dược Linh Chi" });
  }

  // Tỉ lệ rơi Công Pháp
  let skillChance = 0.03;
  if (prefix === "Tinh Anh") skillChance = 0.1;
  if (prefix === "Biến Dị") skillChance = 0.25;
  if (prefix === "Thái Cổ Hung Thú") skillChance = 0.6;

  if (Math.random() < skillChance) {
    const skillKeys = Object.keys(SKILLS_CONFIG);
    const chosenSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
    loot.items.push({ id: chosenSkill, count: 1, name: SKILLS_CONFIG[chosenSkill].name, isSkill: true });
  }

  // Tỉ lệ rơi Huyết Thú (Yêu Tộc được bonus)
  let bloodChance = 0.02;
  if (playerRace === "Yeu") bloodChance += 0.05;
  if (prefix === "Biến Dị") bloodChance = 0.15;
  if (prefix === "Thái Cổ Hung Thú") bloodChance = 0.45;

  if (Math.random() < bloodChance) {
    const bloodKeys = Object.keys(BLOODLINES_CONFIG);
    const chosenBlood = bloodKeys[Math.floor(Math.random() * bloodKeys.length)];
    loot.items.push({ id: chosenBlood, count: 1, name: BLOODLINES_CONFIG[chosenBlood].name, isBloodline: true });
  }

  return loot;
}

// 9. CÔNG THỨC TÍNH CHỈ SỐ TỔNG HỢP (Base + Tộc + Tư chất + Thể chất + Căn cơ + Đan độc)
function getCalculatedStats(char) {
  const realm = REALMS.find(r => r.id === char.realmId) || REALMS[0];
  const physique = PHYSIQUES.find(p => p.name === char.physique) || PHYSIQUES[0];
  const raceMods = getRaceModifiers(char.race || "Nhan", char.realmId);
  const root = SPIRITUAL_ROOTS[char.spiritualRoot] || SPIRITUAL_ROOTS["chan_can"];
  const apt = APTITUDES.find(a => a.rank === char.aptitude) || APTITUDES[1]; // default Trung Phẩm

  let atkBonus = physique.atkBonus + (apt.statBonus || 0);
  let defBonus = physique.defBonus + (apt.statBonus || 0);
  let hpBonus = physique.hpBonus + (apt.statBonus || 0);
  let speedBonus = 0;
  let expRateMod = 0;

  // Bonus từ Linh Căn
  if (root.atkBonus) atkBonus += root.atkBonus;
  if (root.defBonus) defBonus += root.defBonus;
  if (root.hpBonus) hpBonus += root.hpBonus;
  if (root.speedBonus) speedBonus += root.speedBonus;
  if (root.allStatBonus) {
    atkBonus += root.allStatBonus;
    defBonus += root.allStatBonus;
    hpBonus += root.allStatBonus;
  }

  // Bonus/Debuff từ Tộc theo giai đoạn
  if (raceMods.statBonus) {
    atkBonus += raceMods.statBonus;
    defBonus += raceMods.statBonus;
    hpBonus += raceMods.statBonus;
  }
  if (raceMods.hpBonus) hpBonus += raceMods.hpBonus;
  if (raceMods.defBonus) defBonus += raceMods.defBonus;
  if (raceMods.hpPenalty) hpBonus += raceMods.hpPenalty; // Minh Tộc: -10% -> -25%
  if (raceMods.speedBonus) speedBonus += raceMods.speedBonus; // Minh Tộc: +6 -> +25
  if (raceMods.speedPenalty) speedBonus += raceMods.speedPenalty; // Yêu Tộc: -3 -> -15

  // Công Pháp (Nhân Tộc có skillBonusMult)
  const skillMult = raceMods.skillBonusMult || 1.0;
  if (char.learnedSkills && Array.isArray(char.learnedSkills)) {
    char.learnedSkills.forEach(sid => {
      const s = SKILLS_CONFIG[sid];
      if (s) {
        if (s.buffAtk) atkBonus += s.buffAtk * skillMult;
        if (s.buffDef) defBonus += s.buffDef * skillMult;
        if (s.buffHp) hpBonus += s.buffHp * skillMult;
        if (s.buffSpeed) speedBonus += s.buffSpeed * skillMult;
      }
    });
  }

  // Huyết Thú
  if (char.absorbedBloodlines && Array.isArray(char.absorbedBloodlines)) {
    char.absorbedBloodlines.forEach(bid => {
      const b = BLOODLINES_CONFIG[bid];
      if (b && b.buffHp) hpBonus += b.buffHp;
    });
  }

  // Căn Cơ từ FOUNDATION_CONFIG:
  let foundationStability = (char.foundation && typeof char.foundation.stability === "number") ? char.foundation.stability : 100;
  const foundationInfo = getFoundationStabilityInfo(foundationStability);
  if (foundationInfo.effects && foundationInfo.effects.defPenalty) {
    defBonus += foundationInfo.effects.defPenalty; // defPenalty is -0.25
  }
  if (foundationInfo.effects && foundationInfo.effects.defBonus) {
    defBonus += foundationInfo.effects.defBonus; // kim cương +10%
  }

  // 6 Đại Hình Thái Đạo Đài (nếu đã đúc ở Trúc Cơ Kỳ)
  if (char.foundation && char.foundation.form && FOUNDATION_FORMS[char.foundation.form]) {
    const form = FOUNDATION_FORMS[char.foundation.form];
    if (form.bonusAtk) atkBonus += form.bonusAtk;
    if (form.bonusDef) defBonus += form.bonusDef;
    if (form.bonusSpeed) speedBonus += form.bonusSpeed;
  }

  // Ẩn Mạch & Khiếm Khuyết Thần Bí (Latent Traits)
  if (char.latentTrait && LATENT_TRAITS[char.latentTrait.id]) {
    const lt = LATENT_TRAITS[char.latentTrait.id];
    if (char.latentTrait.awakened && lt.awakenedEffect) {
      if (lt.awakenedEffect.hpBonus) hpBonus += lt.awakenedEffect.hpBonus;
      if (lt.awakenedEffect.atkBonus) atkBonus += lt.awakenedEffect.atkBonus;
      if (lt.awakenedEffect.expRateBonus) expRateMod += lt.awakenedEffect.expRateBonus;
    } else if (!char.latentTrait.awakened && lt.dormantEffect) {
      if (lt.dormantEffect.expPenalty) expRateMod += lt.dormantEffect.expPenalty;
    }
  }

  // Trảm Đạo Trọng Tu (Mỗi lần trọng tu tăng vĩnh viễn +50% Exp)
  if (char.reincarnationCount && char.reincarnationCount > 0) {
    expRateMod += char.reincarnationCount * 0.50;
  }

  const hp = Math.max(100, Math.floor(realm.hp * (1 + hpBonus)));
  const atk = Math.max(10, Math.floor(realm.atk * (1 + atkBonus)));
  const def = Math.max(5, Math.floor(realm.def * (1 + defBonus)));
  const speed = Math.max(1, realm.speed + speedBonus);

  // Hiệu suất thiền định & Tốc độ Tu Vi/s
  const meditationEff = getMeditationEfficiency(char.realmId);
  let expRateModFinal = physique.expRateBonus + (root.expRateBonus || 0) + (apt.expRateBonus || 0) + expRateMod;

  if (raceMods.meditationBonus) expRateModFinal += raceMods.meditationBonus; // Nhân Tộc
  if (raceMods.meditationPenalty) expRateModFinal += raceMods.meditationPenalty; // Yêu Tộc

  let baseRate = realm.expPerSec * Math.max(0.2, 1 + expRateModFinal);

  // Đan Độc từ FOUNDATION_CONFIG:
  let pillToxins = (char.foundation && typeof char.foundation.pillToxins === "number") ? char.foundation.pillToxins : 0;
  const toxinInfo = getPillToxinInfo(pillToxins);
  let toxinPenalty = toxinInfo.effects.expRateMult;
  if (toxinInfo.effects.atkMult < 1.0) {
    atkBonus -= (1 - toxinInfo.effects.atkMult);
  }

  const actualExpPerSec = Number((baseRate * (meditationEff / 100) * toxinPenalty).toFixed(1));

  return {
    hp,
    maxHp: hp,
    atk,
    def,
    speed,
    expPerSec: actualExpPerSec,
    rawExpPerSec: Number(baseRate.toFixed(1)),
    meditationEff,
    realmName: realm.name,
    maxExp: realm.maxExp,
    isMajorRealm: !!realm.isMajor,
    tier: getAwakeningTier(char.realmId),
    raceName: (RACES_CONFIG[char.race] || RACES_CONFIG["Nhan"]).name,
    rootName: root.name,
    aptitudeRank: apt.rank,
    pillToxins,
    foundationStability
  };
}

// 10. HÀM MÔ PHỎNG CHIẾN ĐẤU TURN-BASED (KẾT HỢP TỘC & CĂN CƠ)
function simulateCombat(char, monster) {
  let pStats = getCalculatedStats(char);
  let playerHp = char.currentHp > 0 ? char.currentHp : pStats.hp;
  let monsterHp = monster.hp;
  let logs = [];
  let round = 1;

  const playerCounter = getCounterBonus(char.element, monster.element);
  const monsterCounter = getCounterBonus(monster.element, char.element);
  const raceMods = getRaceModifiers(char.race || "Nhan", char.realmId);
  const root = SPIRITUAL_ROOTS[char.spiritualRoot] || SPIRITUAL_ROOTS["chan_can"];

  // 1. Tỉ lệ hút máu cơ bản
  let lifestealRate = (raceMods.lifesteal || 0) + (root.lifesteal || 0);
  if (char.absorbedBloodlines) {
    char.absorbedBloodlines.forEach(bid => {
      if (BLOODLINES_CONFIG[bid] && BLOODLINES_CONFIG[bid].lifesteal) {
        lifestealRate += BLOODLINES_CONFIG[bid].lifesteal;
      }
    });
  }

  // 2. Tỉ lệ né tránh
  let dodgeRate = (raceMods.dodgeRate || 0) + (root.dodgeBonus || 0);

  // 3. Tỉ lệ bạo kích
  let critRate = 0.18 + (raceMods.critRateBonus || 0) + (root.critBonus || 0);

  // 4. Kháng sát thương quái từ Tiên Uy
  let playerDmgReduction = 0;
  if (raceMods.reduceMaYeu && (monster.element === "Hỏa" || monster.element === "Thổ" || monster.name.includes("Ma") || monster.name.includes("Yêu"))) {
    playerDmgReduction += raceMods.reduceMaYeu;
  }

  while (playerHp > 0 && monsterHp > 0 && round <= 30) {
    // --- HIỆU ỨNG ĐẦU HIỆP ---
    // Yêu Tộc: Tự hồi máu mỗi hiệp
    if (raceMods.hpRegenPercent) {
      let regenAmt = Math.floor(pStats.hp * raceMods.hpRegenPercent);
      playerHp = Math.min(pStats.hp, playerHp + regenAmt);
      logs.push(`Hiệp ${round}: Thái Cổ Thần Khu kích phát, [${char.name}] tự hồi phục +${regenAmt} Khí Huyết!`);
    }

    // Ma Tộc: Kiểm tra Tâm Ma Phản Phệ khi máu thấp
    if (raceMods.backfireChance && (playerHp / pStats.hp) < 0.35) {
      if (Math.random() < raceMods.backfireChance) {
        let backfireDmg = Math.floor(playerHp * 0.04) + 10;
        playerHp = Math.max(1, playerHp - backfireDmg);
        logs.push(`Hiệp ${round}: 💀 Tâm Ma Phản Phệ! Ma khí cắn ngược khiến [${char.name}] mất ${backfireDmg} HP!`);
      }
    }

    // --- LƯỢT NGƯỜI CHƠI RA CHIÊU ---
    let currentAtk = pStats.atk;

    // Tiên Tộc: Kiêu sa hoảng loạn khi máu thấp
    if (raceMods.lowHpPenalty && (playerHp / pStats.hp) < raceMods.lowHpThreshold) {
      currentAtk = Math.floor(currentAtk * (1 - raceMods.lowHpPenalty));
    }

    // Ma Tộc: Cuồng Nộ Berserk (càng mất máu đánh càng đau)
    if (raceMods.berserkPerStep) {
      let lostHpRatio = Math.max(0, 1 - (playerHp / pStats.hp));
      let steps = Math.floor(lostHpRatio / raceMods.berserkHpStep);
      let berserkBonus = steps * raceMods.berserkPerStep;
      if (berserkBonus > 0) {
        currentAtk = Math.floor(currentAtk * (1 + berserkBonus));
      }
    }

    let isCrit = Math.random() < critRate;
    let baseDmg = Math.max(5, (currentAtk * 1.0) - (monster.def * 0.4));
    let finalDmg = Math.floor(baseDmg * playerCounter * (isCrit ? 1.5 : 1.0));

    // Đan độc nặng (>50%) làm suy giảm 15% lực ra đòn
    if (pStats.pillToxins > 50) {
      finalDmg = Math.floor(finalDmg * 0.85);
    }

    monsterHp -= finalDmg;

    let healText = "";
    if (lifestealRate > 0) {
      let healAmt = Math.floor(finalDmg * lifestealRate);
      playerHp = Math.min(pStats.hp, playerHp + healAmt);
      healText = ` (Hút +${healAmt} HP)`;
    }

    logs.push(`Hiệp ${round}: [${char.name}] xuất chiêu đánh trúng [${monster.name}] gây ${finalDmg} sát thương!${isCrit ? " 💥 (BẠO KÍCH!)" : ""}${healText}`);

    // Minh Tộc: Đòn đánh thiêu đốt HP đối thủ
    if (raceMods.burnDmgPercent && monsterHp > 0) {
      let burnDmg = Math.floor(monster.maxHp * raceMods.burnDmgPercent);
      monsterHp -= burnDmg;
      logs.push(`Hiệp ${round}: 🔥 Toái Hồn Chích Diễm thiêu đốt [${monster.name}] mất thêm ${burnDmg} HP!`);
    }

    if (monsterHp <= 0) break;

    // --- LƯỢT QUÁI THÚ TẤN CÔNG ---
    // Minh Tộc: Kiểm tra Né Tránh tuyệt đối
    if (dodgeRate > 0 && Math.random() < dodgeRate) {
      logs.push(`Hiệp ${round}: 💨 [${char.name}] thi triển Hư Ảnh Thân Pháp, nhẹ nhàng né tránh hoàn toàn đòn đánh của [${monster.name}]!`);
    } else {
      let mBaseDmg = Math.max(5, (monster.atk * 1.0) - (pStats.def * 0.45));
      let mFinalDmg = Math.floor(mBaseDmg * monsterCounter * (1 - playerDmgReduction));

      // Minh Tộc sợ Hỏa: nhận thêm sát thương nếu quái hệ Hỏa
      if (raceMods.fireVulnerability && monster.element === "Hỏa") {
        mFinalDmg = Math.floor(mFinalDmg * (1 + raceMods.fireVulnerability));
      }

      // Căn Cơ Hư Phù: có 10% bị đánh trúng vết rạn đạo cơ
      if (pStats.foundationStability < 40 && Math.random() < 0.10) {
        mFinalDmg = Math.floor(mFinalDmg * 1.4);
        logs.push(`Hiệp ${round}: ⚠️ [${char.name}] căn cơ hư phù, bị đánh trúng Đạo Cơ Chấn Thương nhận thêm sát thương!`);
      }

      playerHp -= mFinalDmg;
      logs.push(`Hiệp ${round}: [${monster.name}] phản kích, gây ${mFinalDmg} sát thương lên [${char.name}].`);
    }

    round++;
  }

  const isWin = monsterHp <= 0 && playerHp > 0;
  return {
    isWin,
    remainingPlayerHp: Math.max(0, playerHp),
    remainingMonsterHp: Math.max(0, monsterHp),
    rounds: round,
    logs
  };
}

// 11. CƠ CHẾ ĐÀI ĐỘ KIẾP LÔI ĐÌNH (KẾT HỢP TỘC & ĐẠO CƠ)
function simulateTribulation(char, useShieldPill = false) {
  const currentRealm = REALMS.find(r => r.id === char.realmId) || REALMS[0];
  const nextRealm = REALMS.find(r => r.id === char.realmId + 1);
  if (!nextRealm) {
    return { error: "Đạo hữu đã đạt cảnh giới tối cao!" };
  }

  const pStats = getCalculatedStats(char);
  let playerHp = char.currentHp > 0 ? char.currentHp : pStats.hp;
  const maxHp = pStats.hp;
  const raceMods = getRaceModifiers(char.race || "Nhan", char.realmId);
  const root = SPIRITUAL_ROOTS[char.spiritualRoot] || SPIRITUAL_ROOTS["chan_can"];

  // Tính kháng lôi kiếp từ kỹ năng, huyết thú, linh căn và yêu tộc
  let lightningResist = (root.lightningResist || 0) + (raceMods.tribulationResist || 0);
  if (char.learnedSkills) {
    char.learnedSkills.forEach(sid => {
      if (SKILLS_CONFIG[sid] && SKILLS_CONFIG[sid].lightningResist) {
        lightningResist += SKILLS_CONFIG[sid].lightningResist;
      }
    });
  }
  if (char.absorbedBloodlines) {
    char.absorbedBloodlines.forEach(bid => {
      if (BLOODLINES_CONFIG[bid] && BLOODLINES_CONFIG[bid].lightningResist) {
        lightningResist += BLOODLINES_CONFIG[bid].lightningResist;
      }
    });
  }

  // Số đạo lôi kiếp (Đại cảnh: 5, Tiểu cảnh: 3; Ma Tộc ở cảnh giới cao chịu thêm lôi kiếp)
  const isMajor = currentRealm.isMajor;
  let totalStrikes = isMajor ? 5 : 3;
  if (raceMods.extraStrikes) {
    totalStrikes += raceMods.extraStrikes;
  }

  // Hệ số sát thương lôi kiếp theo Tộc và Đạo Cơ
  let tribulationMult = raceMods.tribulationDmgMult || 1.0;

  // Căn Cơ Hư Phù: tăng 30% sát thương lôi phạt
  if (pStats.foundationStability < 40) {
    tribulationMult += 0.30;
  }

  // Đan độc nặng (>60%): Lôi kiếp dẫn hỏa thiêu đốt thêm 20%
  if (pStats.pillToxins > 60) {
    tribulationMult += 0.20;
  }

  let strikes = [];
  let isAlive = true;

  for (let i = 1; i <= totalStrikes; i++) {
    let mult = (1.0 + (i - 1) * 0.25) * tribulationMult;
    let baseLightning = (currentRealm.hp * 0.35) * mult;

    let defReduction = pStats.def * 0.75;
    let netDmg = Math.max(currentRealm.hp * 0.10, baseLightning - defReduction);

    if (useShieldPill) {
      netDmg *= 0.6; // Hộ Mạch Đan chặn 40%
    }

    if (lightningResist > 0) {
      netDmg *= Math.max(0.25, 1 - lightningResist);
    }

    netDmg = Math.floor(netDmg);
    playerHp -= netDmg;

    strikes.push({
      strikeIndex: i,
      damage: netDmg,
      remainingHp: Math.max(0, playerHp),
      shieldUsed: useShieldPill,
      text: `Đạo Lôi Kiếp thứ ${i}: Giáng xuống sấm sét lôi đình gây ${netDmg} sát thương! ${playerHp > 0 ? `(Khí huyết: ${playerHp}/${maxHp})` : "💀 (KHÍ HUYẾT ĐOẠN TUYỆT!)"}`
    });

    if (playerHp <= 0) {
      isAlive = false;
      break;
    }
  }

  return {
    success: isAlive,
    isMajor,
    totalStrikes,
    strikes,
    finalHp: Math.max(1, playerHp),
    nextRealmName: nextRealm.name,
    thanHiBonus: (isAlive && raceMods.thanHiBonus) ? raceMods.thanHiBonus : 0
  };
}

// 12. HÀM QUẢN LÝ CĂN CƠ & ĐAN ĐỘC
function addPillToxins(char, amount) {
  if (!char.foundation) {
    char.foundation = { purity: 100, stability: 100, pillToxins: 0, grade: "Phàm Phẩm Trúc Cơ" };
  }
  char.foundation.pillToxins = Math.min(100, (char.foundation.pillToxins || 0) + amount);
  char.foundation.purity = Math.max(0, 100 - char.foundation.pillToxins);
}

function cleansePillToxins(char, amount) {
  if (!char.foundation) {
    char.foundation = { purity: 100, stability: 100, pillToxins: 0, grade: "Phàm Phẩm Trúc Cơ" };
  }
  char.foundation.pillToxins = Math.max(0, (char.foundation.pillToxins || 0) - amount);
  char.foundation.purity = Math.max(0, 100 - char.foundation.pillToxins);
}

function reinforceFoundation(char, expAmt) {
  if (!char.foundation) {
    char.foundation = { purity: 100, stability: 100, pillToxins: 0, grade: "Phàm Phẩm Trúc Cơ" };
  }
  const gainPer1000 = (FOUNDATION_CONFIG && FOUNDATION_CONFIG.stability && FOUNDATION_CONFIG.stability.reinforceGainPer1000Exp) ? FOUNDATION_CONFIG.stability.reinforceGainPer1000Exp : 5;
  const stabilityGain = Math.floor(expAmt / 1000) * gainPer1000;
  if (stabilityGain > 0) {
    char.foundation.stability = Math.min(100, (char.foundation.stability || 100) + stabilityGain);
  }
}

// 13. KHỞI TẠO NHÂN VẬT MỚI (HỖ TRỢ CHỌN TỘC, GIEO LINH CĂN & CĂN CƠ)
function createNewCharacter(name, password, race = "Nhan") {
  const chosenRace = RACES_CONFIG[race] ? race : "Nhan";
  const randomElement = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  const starterPhysique = PHYSIQUES[0];
  const starterRoot = rollSpiritualRoot();
  const starterAptitude = rollAptitude();

  const createPlots = () => {
    let plots = [];
    for (let i = 0; i < 8; i++) {
      plots.push({
        id: i,
        stage: Math.floor(Math.random() * 4),
        water: Math.floor(Math.random() * 5),
        fert: Math.floor(Math.random() * 6),
        hasBug: Math.random() < 0.3
      });
    }
    return plots;
  };

  return {
    name: name.trim(),
    password: password || "123456",
    race: chosenRace,
    element: randomElement,
    spiritualRoot: starterRoot,
    aptitude: starterAptitude,
    realmId: 1,
    exp: 0,
    currentHp: 500,
    stamina: 100,
    maxStamina: 100,
    spiritStones: 5000,
    physique: starterPhysique.name,
    physiquePending: null,
    hasCuLinhTran: false,
    wellCooldownUntil: 0,

    // Căn Cơ & Đan Độc ban đầu (Tân Thủ Đạo Vận)
    foundation: {
      purity: 100,
      stability: 100,
      pillToxins: 0,
      grade: "Phàm Phẩm Trúc Cơ",
      form: null // Sẽ đúc tại Trúc Cơ Kỳ
    },

    // Ẩn Mạch & Khiếm Khuyết Thần Bí (xác suất bẩm sinh)
    latentTrait: rollLatentTrait(),
    reincarnationCount: 0,

    // Tụ Linh Đỉnh tích lũy 4/10 tu vi dôi dư
    spiritReservoir: {
      storedExp: 0,
      maxCapacity: 50000
    },

    // Danh sách Công Pháp & Huyết Thú đã học
    learnedSkills: [],
    absorbedBloodlines: [],

    // Bát Quái Đạo Đài (6 ô công pháp kích hoạt - Doc 22)
    equippedSkills: [null, null, null, null, null, null],

    // Lục Vị Trang Bị Bản Mệnh (Doc 21 & Doc 23)
    equippedArtifacts: {
      weapon: null,
      armor: null,
      boots: null,
      amulet: null,
      ring: null,
      relic: null
    },

    // Tàng Bảo Khố Động Phủ 500 ô (Doc 21)
    vault: {},

    // Tông Môn & Cống Hiến (Doc 12)
    sectOrigin: "TAN_TU",
    sectRank: "TAP_DICH",
    sectContribution: 0,
    lastStipendClaimedAt: 0,

    // Đạo Lữ & Song Tu (Doc 26)
    companionId: null,
    lastDualCultivateAt: 0,

    // Danh Hiệu & Thành Tựu (Doc 26)
    titles: ["Tân Thủ Nhập Đạo"],
    activeTitle: "Tân Thủ Nhập Đạo",

    // Quan Hệ Nhân Quả 31 NPC (Doc 13)
    npcAffinities: {},

    // Hòm Thư Tiên Tín (Doc 25)
    mailbox: [
      {
        id: "mail_welcome",
        senderName: "Thiên Đạo Ban Phúc",
        title: "Khai Sơn Lập Đạo Quà Tặng",
        content: "Chào mừng đạo hữu bước chân vào Tu Chân Giới! Kèm theo 1,000 Linh Thạch và 5 Đan Thể Lực hỗ trợ khởi đầu.",
        attachedItems: [{ itemId: "dan_the_luc", quantity: 5 }],
        attachedStones: 1000,
        isRead: false,
        isClaimed: false,
        sentAt: Date.now()
      }
    ],

    // Nhiệm Vụ Huyền Thưởng Hàng Ngày (Doc 26)
    dailyBounties: [
      { id: "bounty_1", type: "MONSTER", title: "Trảm Yêu Trừ Ma", progress: 0, target: 5, rewardExp: 1000, rewardStones: 300, isClaimed: false },
      { id: "bounty_2", type: "FARM", title: "Thái Dược Dưỡng Sinh", progress: 0, target: 8, rewardExp: 800, rewardStones: 200, isClaimed: false }
    ],

    inventory: {
      "thao_duoc_linh_chi": 25,
      "thao_duoc_hoang_tinh": 20,
      "dan_the_luc": 5,
      "dan_hoi_mau": 5,
      "dan_ho_mach": 2,
      "dan_tu_khi": 3
    },
    gardens: {
      "DAN": createPlots(),
      "HOA": createPlots(),
      "HIEM": createPlots()
    },
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  };
}

function ensureCharacterSchema(char) {
  if (!char) return char;
  if (!char.race) char.race = "Nhan";
  if (!char.spiritualRoot) char.spiritualRoot = rollSpiritualRoot();
  if (!char.aptitude) char.aptitude = rollAptitude();
  if (!char.foundation) {
    char.foundation = { purity: 100, stability: 100, pillToxins: 0, grade: "Phàm Phẩm Trúc Cơ", form: null };
  }
  if (!char.spiritReservoir) {
    char.spiritReservoir = { storedExp: 0, maxCapacity: 50000 };
  }
  if (!char.learnedSkills) char.learnedSkills = [];
  if (!char.absorbedBloodlines) char.absorbedBloodlines = [];
  if (!char.equippedSkills) char.equippedSkills = [null, null, null, null, null, null];
  if (!char.equippedArtifacts) {
    char.equippedArtifacts = { weapon: null, armor: null, boots: null, amulet: null, ring: null, relic: null };
  }
  if (!char.vault) char.vault = {};
  if (!char.sectOrigin) char.sectOrigin = "TAN_TU";
  if (!char.sectRank) char.sectRank = "TAP_DICH";
  if (typeof char.sectContribution === 'undefined') char.sectContribution = 0;
  if (!char.titles) char.titles = ["Tân Thủ Nhập Đạo"];
  if (!char.activeTitle) char.activeTitle = "Tân Thủ Nhập Đạo";
  if (!char.npcAffinities) char.npcAffinities = {};
  if (!char.mailbox) char.mailbox = [];
  if (!char.dailyBounties) {
    char.dailyBounties = [
      { id: "bounty_1", type: "MONSTER", title: "Trảm Yêu Trừ Ma", progress: 0, target: 5, rewardExp: 1000, rewardStones: 300, isClaimed: false },
      { id: "bounty_2", type: "FARM", title: "Thái Dược Dưỡng Sinh", progress: 0, target: 8, rewardExp: 800, rewardStones: 200, isClaimed: false }
    ];
  }
  return char;
}

module.exports = {
  REALMS,
  PHYSIQUES,
  ELEMENTS,
  HUNTING_ZONES,
  RACES_CONFIG,
  SPIRITUAL_ROOTS,
  APTITUDES,
  LATENT_TRAITS,
  FOUNDATION_FORMS,
  KIM_DAN_INSCRIPTIONS,
  KIM_DAN_PHENOMENA,
  ANCIENT_RELICS_APPRAISAL,
  REINCARNATION_RULES,
  FOUNDATION_CONFIG,
  getFoundationStabilityInfo,
  getPillToxinInfo,
  evaluateTrucCoGrade,
  evaluateKimDanGrade,
  evaluateKimDanBreakthrough,
  appraiseAncientRelic,
  executeReincarnation,
  SKILLS_CONFIG,
  BLOODLINES_CONFIG,
  getAwakeningTier,
  getRaceModifiers,
  rollSpiritualRoot,
  rollAptitude,
  rollLatentTrait,
  rollPhysique,
  generateWildMonster,
  rollCombatLoot,
  simulateCombat,
  simulateTribulation,
  getMeditationEfficiency,
  getCalculatedStats,
  addPillToxins,
  cleansePillToxins,
  reinforceFoundation,
  createNewCharacter,
  ensureCharacterSchema
};
