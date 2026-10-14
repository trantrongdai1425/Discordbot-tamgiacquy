// server/cultivationConfig.js - Bộ Cấu Hình Hệ Thống Căn Cơ & Tư Chất Thâm Sâu (Dễ Dàng Cân Bằng & Tinh Chỉnh)
// Quy chuẩn thiết kế: Modular hóa, dữ liệu tập trung, cho phép Game Designer buff/nerf hoặc thêm mới kỳ ngộ chỉ trong 5 giây.

// =========================================================================
// 1. HỆ THỐNG TƯ CHẤT: LINH CĂN HIỂN LỘ (SPIRITUAL ROOTS)
// =========================================================================
const SPIRITUAL_ROOTS = {
  "tap_can": {
    id: "tap_can",
    name: "Tạp Linh Căn (Ngụy Căn)",
    tier: "Tạp",
    color: "#94a3b8",
    desc: "Tứ/Ngũ hệ lẫn lộn. Dẻo dai kiên cường: +5% HP, +5% DEF, -10% Tu vi/s",
    rate: 0.40,
    expRateBonus: -0.10,
    hpBonus: 0.05,
    defBonus: 0.05,
    atkBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    lightningResist: 0
  },
  "chan_can": {
    id: "chan_can",
    name: "Chân Linh Căn",
    tier: "Chân",
    color: "#38bdf8",
    desc: "2-3 hệ tương sinh cân bằng. Phát triển quân bình, chuẩn mực thiên đạo",
    rate: 0.42,
    expRateBonus: 0.00,
    hpBonus: 0,
    defBonus: 0,
    atkBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    lightningResist: 0
  },
  "thien_can_hoa": {
    id: "thien_can_hoa",
    name: "Thiên Hỏa Linh Căn",
    tier: "Thiên",
    color: "#f97316",
    desc: "Thuần dương chi hỏa. +20% Tu vi/s, +8% Công Kích, +2% Bạo Kích",
    rate: 0.02,
    expRateBonus: 0.20,
    hpBonus: 0,
    defBonus: 0,
    atkBonus: 0.08,
    speedBonus: 0,
    critBonus: 0.02,
    dodgeBonus: 0,
    lifesteal: 0,
    lightningResist: 0
  },
  "thien_can_thuy": {
    id: "thien_can_thuy",
    name: "Thiên Thủy Linh Căn",
    tier: "Thiên",
    color: "#06b6d4",
    desc: "Thuần khiết huyền thủy. +20% Tu vi/s, +10% Khí Huyết, hồi 1% HP/hiệp",
    rate: 0.02,
    expRateBonus: 0.20,
    hpBonus: 0.10,
    defBonus: 0,
    atkBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    hpRegenBonus: 0.01,
    lightningResist: 0
  },
  "thien_can_kim": {
    id: "thien_can_kim",
    name: "Thiên Kim Linh Căn",
    tier: "Thiên",
    color: "#eab308",
    desc: "Bén nhọn kim linh. +20% Tu vi/s, +10% Công Kích, +3% Bạo Kích",
    rate: 0.02,
    expRateBonus: 0.20,
    hpBonus: 0,
    defBonus: 0,
    atkBonus: 0.10,
    speedBonus: 0,
    critBonus: 0.03,
    dodgeBonus: 0,
    lifesteal: 0,
    lightningResist: 0
  },
  "thien_can_moc": {
    id: "thien_can_moc",
    name: "Thiên Mộc Linh Căn",
    tier: "Thiên",
    color: "#22c55e",
    desc: "Sinh sinh bất tức. +20% Tu vi/s, +5% HP, +5% DEF, hồi 1.5% HP/hiệp",
    rate: 0.02,
    expRateBonus: 0.20,
    hpBonus: 0.05,
    defBonus: 0.05,
    atkBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    hpRegenBonus: 0.015,
    lightningResist: 0
  },
  "thien_can_tho": {
    id: "thien_can_tho",
    name: "Thiên Thổ Linh Căn",
    tier: "Thiên",
    color: "#d97706",
    desc: "Đại địa thâm hậu. +20% Tu vi/s, +12% Phòng Ngự, +6% Khí Huyết, +5% Kháng Lôi",
    rate: 0.02,
    expRateBonus: 0.20,
    hpBonus: 0.06,
    defBonus: 0.12,
    atkBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    lightningResist: 0.05
  },
  "di_can_phong": {
    id: "di_can_phong",
    name: "Dị Linh Căn — Phong",
    tier: "Dị",
    color: "#10b981",
    desc: "Biến dị Phong hệ. +12% Tu vi/s, +4 Thân Pháp, +3% Né Tránh",
    rate: 0.016,
    expRateBonus: 0.12,
    hpBonus: 0,
    defBonus: 0,
    atkBonus: 0,
    speedBonus: 4,
    critBonus: 0,
    dodgeBonus: 0.03,
    lifesteal: 0,
    lightningResist: 0
  },
  "di_can_loi": {
    id: "di_can_loi",
    name: "Dị Linh Căn — Lôi",
    tier: "Dị",
    color: "#c084fc",
    desc: "Biến dị Lôi hệ. +12% Tu vi/s, +5% Bạo Kích, giảm 10% sát thương Lôi Kiếp",
    rate: 0.016,
    expRateBonus: 0.12,
    hpBonus: 0,
    defBonus: 0,
    atkBonus: 0.05,
    speedBonus: 0,
    critBonus: 0.05,
    dodgeBonus: 0,
    lifesteal: 0,
    lightningResist: 0.10
  },
  "di_can_bang": {
    id: "di_can_bang",
    name: "Dị Linh Căn — Băng",
    tier: "Dị",
    color: "#67e8f9",
    desc: "Biến dị Băng hệ. +12% Tu vi/s, +5% Phòng Ngự, 15% làm chậm đối thủ",
    rate: 0.016,
    expRateBonus: 0.12,
    hpBonus: 0.05,
    defBonus: 0.05,
    atkBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    slowChance: 0.15
  },
  "di_can_am": {
    id: "di_can_am",
    name: "Dị Linh Căn — Ám",
    tier: "Dị",
    color: "#64748b",
    desc: "Biến dị Ám hệ. +12% Tu vi/s, đòn đánh xuyên 8% Giáp đối thủ",
    rate: 0.016,
    expRateBonus: 0.12,
    hpBonus: 0,
    defBonus: 0,
    atkBonus: 0.06,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0,
    armorPen: 0.08
  },
  "di_can_huyet": {
    id: "di_can_huyet",
    name: "Dị Linh Căn — Huyết",
    tier: "Dị",
    color: "#ef4444",
    desc: "Biến dị Huyết hệ. +12% Tu vi/s, sở hữu 3% Hút Máu trong giao tranh",
    rate: 0.016,
    expRateBonus: 0.12,
    hpBonus: 0.04,
    defBonus: 0,
    atkBonus: 0.04,
    speedBonus: 0,
    critBonus: 0,
    dodgeBonus: 0,
    lifesteal: 0.03
  },
  "hon_don_can": {
    id: "hon_don_can",
    name: "Hỗn Độn Linh Căn",
    tier: "Thần",
    color: "#f43f5e",
    desc: "Vạn cổ thần căn. +35% Tu vi/s, +12% Toàn Thuộc Tính, kháng Lôi Kiếp 15%",
    rate: 0.005,
    expRateBonus: 0.35,
    hpBonus: 0.12,
    defBonus: 0.12,
    atkBonus: 0.12,
    speedBonus: 10,
    critBonus: 0.08,
    dodgeBonus: 0.05,
    lifesteal: 0.04,
    lightningResist: 0.15
  }
};

// =========================================================================
// 2. HỆ THỐNG PHẨM CẤP CĂN CỐT (APTITUDE GRADES)
// =========================================================================
const APTITUDES = [
  { rank: "Hạ Phẩm",     color: "#94a3b8", rate: 0.450, statBonus: 0.00, expRateBonus: 0.00, critBonus: 0 },
  { rank: "Trung Phẩm",  color: "#38bdf8", rate: 0.300, statBonus: 0.06, expRateBonus: 0.05, critBonus: 0 },
  { rank: "Thượng Phẩm", color: "#4ade80", rate: 0.150, statBonus: 0.14, expRateBonus: 0.10, critBonus: 0 },
  { rank: "Cực Phẩm",    color: "#a855f7", rate: 0.060, statBonus: 0.25, expRateBonus: 0.18, critBonus: 0.02 },
  { rank: "Địa Phẩm",    color: "#f59e0b", rate: 0.025, statBonus: 0.40, expRateBonus: 0.28, critBonus: 0.05 },
  { rank: "Thiên Phẩm",  color: "#ec4899", rate: 0.012, statBonus: 0.60, expRateBonus: 0.40, critBonus: 0.08 },
  { rank: "Thần Phẩm",   color: "#ef4444", rate: 0.003, statBonus: 0.90, expRateBonus: 0.60, critBonus: 0.12 }
];

// =========================================================================
// 3. HỆ THỐNG ẨN MẠCH & KHIẾM KHUYẾT THẦN BÍ (LATENT TRAITS & DAO FLAWS)
// =========================================================================
const LATENT_TRAITS = {
  "hoang_co_thanh_the": {
    id: "hoang_co_thanh_the",
    name: "Hoang Cổ Thánh Thể (Phong Ấn)",
    unlockedName: "Hoang Cổ Thánh Thể (Đại Thành)",
    color: "#eab308",
    unlockCondition: "Chịu đòn tụt máu < 5% HP khi độ kiếp hoặc đánh Boss mà sống sót",
    dormantEffect: { expPenalty: -0.20, desc: "Kinh mạch tắc nghẽn: -20% Tu vi/s" },
    awakenedEffect: {
      hpBonus: 0.50,
      lightningResist: 0.30,
      fistShockwave: 0.20, // 20% sát thương chuẩn chấn động nghiền nát giáp
      desc: "Phá 9 đạo tỏa liên: HP +50%, Kháng Lôi +30%, Đòn đánh kèm sóng chấn động khí huyết"
    },
    rollChance: 0.03 // 3% người chơi sở hữu thể chất này
  },
  "cuu_am_tuyet_mach": {
    id: "cuu_am_tuyet_mach",
    name: "Cửu Âm Tuyệt Mạch (Hàn Độc)",
    unlockedName: "Cửu U Băng Phách Thánh Thể",
    color: "#06b6d4",
    unlockCondition: "Dung hợp Thiên Hỏa Dị Chủng hoặc Song Tu cùng người có Thuần Dương Chi Thể",
    dormantEffect: { hourlyDamage: 0.05, desc: "Hàn độc tích tụ, thọ mệnh giảm sút" },
    awakenedEffect: {
      iceDamageBonus: 0.35,
      freezeChance: 0.25, // 25% làm đông cứng đối thủ 2 hiệp
      desc: "Nhiệt cực sinh hàn: Sát thương Băng +35%, 25% tỷ lệ đông cứng đối thủ"
    },
    rollChance: 0.03
  },
  "than_ma_an_mach": {
    id: "than_ma_an_mach",
    name: "Thần Ma Dị Mạch (Hỗn Loạn)",
    unlockedName: "Thần Ma Hợp Thể",
    color: "#a855f7",
    unlockCondition: "Nuốt sống Yêu Đan cấp Tướng ở trạng thái Đan Độc >= 50%",
    dormantEffect: { hitFluctuation: 0.15, desc: "Chân khí hỗn loạn, xuất chiêu thất thường" },
    awakenedEffect: {
      atkBonus: 0.25,
      trueDamageBurst: 0.15, // 15% nộ chiêu gây sát thương chuẩn xuyên giáp
      desc: "Thần Ma quy nhất: Công Kích +25%, nộ chiêu phóng thích Thần Ma Hư Ảnh chém sát thương chuẩn"
    },
    rollChance: 0.025
  },
  "tu_nhien_dao_the": {
    id: "tu_nhien_dao_the",
    name: "Tự Nhiên Đạo Thể (Thiên Nhân Hợp Nhất)",
    unlockedName: "Thiên Tự Đạo Thai",
    color: "#22c55e",
    unlockCondition: "Thiền định dưới Cổ Thụ hoặc Vạn Mộc Linh Cảnh tích lũy 600 giây",
    dormantEffect: { silentAura: true, desc: "Trầm mặc ít nói, tích lũy thiên địa chi khí" },
    awakenedEffect: {
      guaranteedBreakthroughTrucCo: true, // Trúc cơ 100% không cần đan
      expRateBonus: 0.15,
      desc: "Trời sinh hòa hợp: Trúc Cơ 100% thành công không cần đan dược, Tu vi thiền định +15%"
    },
    rollChance: 0.02
  },
  "trung_dong_thien_nhan": {
    id: "trung_dong_thien_nhan",
    name: "Thượng Cổ Trùng Đồng (Nhìn Thấu Càn Khôn)",
    unlockedName: "Chân Lý Thần Nhãn",
    color: "#fb923c",
    unlockCondition: "Đổ xúc xắc D20 rơi vào cửa Tử Môn hoặc bị kích sát chí mạng",
    dormantEffect: { blurredVision: true, desc: "Mắt kép xám tro, nhìn vật mờ ảo" },
    awakenedEffect: {
      critBonus: 0.10,
      dodgeBonus: 0.08,
      canAppraiseRelicsInstantly: true, // Nhìn thấu giá trị thực cổ vật chợ đen
      desc: "Nhìn thấu sơ hở vạn vật: +10% Bạo Kích, +8% Né Tránh, nhìn thấu phẩm cấp Cổ Vật chưa giám định"
    },
    rollChance: 0.015
  },
  "kiem_tam_thong_minh": {
    id: "kiem_tam_thong_minh",
    name: "Kiếm Tâm Thông Minh (Trời Sinh Kiếm Si)",
    unlockedName: "Vô Thượng Kiếm Hoàng",
    color: "#facc15",
    unlockCondition: "Đánh bại 100 quái thú bằng Kiếm Quyết",
    dormantEffect: { swordOnly: true, desc: "Chỉ có thể sử dụng Kiếm, từ chối mọi pháp khí khác" },
    awakenedEffect: {
      swordDmgBonus: 0.30,
      doubleSlashChance: 0.20, // 20% chém đòn thứ 2 x2 sát thương
      desc: "Vạn vật quy kiếm: Sát thương Kiếm pháp +30%, 20% xuất chiêu chém kép x2"
    },
    rollChance: 0.02
  }
};

// =========================================================================
// 4. HỆ THỐNG SÁU ĐẠI HÌNH THÁI ĐẠO ĐÀI (DAO FOUNDATION MORPHOLOGIES)
// =========================================================================
const FOUNDATION_FORMS = {
  "thien_dao_vo_ha": {
    id: "thien_dao_vo_ha",
    name: "Thiên Đạo Vô Hà Đạo Đài",
    tier: "Thần Thoại",
    color: "#f59e0b",
    requiredStability: 90,
    maxToxins: 10,
    requiredItem: "thien_dao_chi_khi",
    statMultiplier: 2.50,
    combatSkill: "Hấp thụ sấm sét lôi kiếp thành HP, tự động giải trừ mọi trạng thái suy yếu sau 2 hiệp",
    cleanseTurn: 2,
    lightningAbsorbRate: 0.50,
    desc: "Đạo đài đúc bằng Thiên Đạo Chi Khí, hoàn mỹ không một vết rạn, muôn đời bất hủ"
  },
  "kiem_tuy_dao_co": {
    id: "kiem_tuy_dao_co",
    name: "Vạn Kiếm Tủy Đạo Cơ",
    tier: "Cực Phẩm",
    color: "#eab308",
    requiredStability: 75,
    maxToxins: 30,
    requiredItem: "van_kiem_tan_hai",
    statMultiplier: 2.00,
    combatSkill: "Thân hóa thần kiếm: Công Kích +35%, Thân Pháp +15, xuất Vô Hình Kiếm Khí chém địch mỗi hiệp",
    bonusAtk: 0.35,
    bonusSpeed: 15,
    passiveSwordAuraDmg: 0.15,
    desc: "Lấy vạn thanh tàn kiếm đúc thành xương tủy, phát ra kiếm khí bén nhọn xé rách hư không"
  },
  "huyet_lien_dao_dai": {
    id: "huyet_lien_dao_dai",
    name: "Cửu Phẩm Huyết Liên Đạo Đài",
    tier: "Ma Đạo Cực Phẩm",
    color: "#ef4444",
    requiredStability: 70,
    maxToxins: 50,
    requiredItem: "huyet_tinh_van_yeu",
    statMultiplier: 1.90,
    combatSkill: "Hút máu +15%. Khi HP < 30% kích hoạt Huyết Liên Hộ Thể miễn tử 1 hiệp và phản đòn 20%",
    lifestealBonus: 0.15,
    deathImmunityTurns: 1,
    desc: "Đài sen máu nở rộ từ máu của vạn yêu ma thú, giết chóc càng nhiều đài sen càng rực rỡ"
  },
  "ngu_hanh_luan_hoi": {
    id: "ngu_hanh_luan_hoi",
    name: "Ngũ Hành Hỗn Nguyên Đạo Đài",
    tier: "Cực Phẩm",
    color: "#10b981",
    requiredStability: 80,
    maxToxins: 25,
    requiredItem: "ngu_hanh_hon_nguyen_chau",
    statMultiplier: 2.10,
    combatSkill: "Giảm 25% sát thương nguyên tố phải chịu. Tự động hồi phục 4% Max HP mỗi hiệp",
    elementalResist: 0.25,
    hpRegenPerTurn: 0.04,
    desc: "Ngũ hành tương sinh tương khắc tuần hoàn bất tận, chân nguyên dồi dào vĩnh cửu"
  },
  "chan_long_dao_co": {
    id: "chan_long_dao_co",
    name: "Thần Long Tủy Đạo Cơ",
    tier: "Cực Phẩm",
    color: "#3b82f6",
    requiredStability: 80,
    maxToxins: 25,
    requiredItem: "chan_long_tinh_huyet",
    statMultiplier: 2.05,
    combatSkill: "Phòng Ngự +30%. Đòn đánh kèm tiếng Rồng ngâm có 20% làm choáng đối thủ 1 hiệp",
    bonusDef: 0.30,
    stunChance: 0.20,
    desc: "Hấp thụ tinh huyết Chân Long rèn cốt, thể phách như thần binh bảo giáp sừng sững"
  },
  "pham_thai_thach_co": {
    id: "pham_thai_thach_co",
    name: "Phàm Thai Toái Thạch Cơ",
    tier: "Hạ Phẩm",
    color: "#64748b",
    requiredStability: 0,
    maxToxins: 100,
    requiredItem: null,
    statMultiplier: 0.80,
    combatSkill: "15% xác suất thổ huyết mất lượt khi giao tranh. Dẫn hỏa lôi kiếp +40%",
    selfWoundChance: 0.15,
    tribulationVulnerability: 0.40,
    canReincarnate: true, // Mở khóa Trảm Đạo Trọng Tu!
    desc: "Trúc cơ vội vã, đan điền rạn nứt như đá vụn, tương lai mù mịt trừ phi dám Trảm Đạo Phá Lập"
  }
};

// =========================================================================
// 5. CỬU CHUYỂN KIM ĐAN & THIÊN ĐỊA DỊ TƯỢNG (KIM DAN PHENOMENON)
// =========================================================================
const KIM_DAN_INSCRIPTIONS = {
  "cuu_chuyen_cuc_pham": {
    name: "Cửu Chuyển Kim Đan",
    rings: 9,
    minStability: 90,
    maxToxins: 10,
    statMult: 2.80,
    nascentSoulSuccessRate: 1.00, // 100% không bình cảnh
    color: "#f59e0b",
    desc: "Khắc trọn vẹn 9 vòng Đạo Văn Thiên Địa, tử khí quấn quanh, pháp lực thâm hậu gấp 3 lần"
  },
  "luc_chuyen_thuong_pham": {
    name: "Lục Chuyển Kim Đan",
    rings: 6,
    minStability: 75,
    maxToxins: 30,
    statMult: 2.00,
    nascentSoulSuccessRate: 0.75,
    color: "#a855f7",
    desc: "Khắc 6 vòng Đạo Văn, kim quang lấp lánh, ngưng kết Nguyên Anh thuận buồm xuôi gió"
  },
  "tam_chuyen_trung_pham": {
    name: "Tam Chuyển Kim Đan",
    rings: 3,
    minStability: 50,
    maxToxins: 50,
    statMult: 1.40,
    nascentSoulSuccessRate: 0.50,
    color: "#38bdf8",
    desc: "Khắc 3 vòng Đạo Văn, hào quang thanh khiết, tiến cảnh bình phàm"
  },
  "nhat_chuyen_ha_pham": {
    name: "Nhất Chuyển Kim Đan (Tro Tàn)",
    rings: 1,
    minStability: 0,
    maxToxins: 100,
    statMult: 0.90,
    nascentSoulSuccessRate: 0.20,
    color: "#64748b",
    desc: "Hạt đan màu tro đục ngầu, vết nứt ngang dọc, cơ duyên ngưng Anh chỉ như chỉ mành treo chuông"
  }
};

const KIM_DAN_PHENOMENA = {
  "tu_khi_dong_lai": {
    id: "tu_khi_dong_lai",
    name: "Tử Khí Đông Lai Ba Vạn Dặm",
    banner: "Bầu trời rực sáng mây tím ngũ sắc! Toàn thể đồng môn được hưởng phúc trạch!",
    playerAura: { defBonus: 0.20, desc: "Tử Khí Hộ Thể: Phòng ngự +20%" },
    globalSectBuff: { expBonus: 0.10, durationSeconds: 600, desc: "+10% Exp toàn tông môn trong 10 phút" }
  },
  "van_kiem_trieu_quy": {
    id: "van_kiem_trieu_quy",
    name: "Vạn Kiếm Triều Quy",
    banner: "Vạn thanh phi kiếm tề tụ xé rách hư không, vang dội tiếng kiếm minh chấn động tam giới!",
    playerAura: { armorPen: 0.15, desc: "Kiếm Ý Thông Thiên: Đòn đánh xuyên 15% giáp" },
    globalSectBuff: { swordAtkBonus: 0.08, durationSeconds: 600, desc: "+8% ATK cho toàn bộ Kiếm Tu đang online" }
  },
  "minh_hai_trieu_sinh": {
    id: "minh_hai_trieu_sinh",
    name: "Minh Hải Triều Sinh (Trăng Máu Biển Đêm)",
    banner: "Vầng trăng máu khổng lồ trồi lên từ biển tối, u tịch bao trùm cửu châu!",
    playerAura: { blindEnemyChance: 0.20, desc: "Ám Ảnh Chi Vực: Giảm 20% độ chính xác của địch" }
  },
  "ma_than_hang_the": {
    id: "ma_than_hang_the",
    name: "Ma Thần Hàng Thế",
    banner: "Hư ảnh Thần Ma khổng lồ sừng sững xé rách mây đen, sát khí ngập tràn trời đất!",
    playerAura: { enemyIntimidation: 0.15, desc: "Ma Thần Uy Áp: Kẻ địch đối đầu giảm 15% Công và Thủ" }
  },
  "kim_lien_dia_dung": {
    id: "kim_lien_dia_dung",
    name: "Kim Liên Địa Dũng (Sen Vàng Nở Rộ)",
    banner: "Mặt đất trổ hoa sen vàng, hương thơm lan tỏa khắp các nẻo đường!",
    playerAura: { immunePillToxinsDurationDays: 30, desc: "Công Đức Vô Lượng: Miễn nhiễm đan độc trong 30 ngày" }
  },
  "thien_loi_pha_gioi": {
    id: "thien_loi_pha_gioi",
    name: "Cửu Cực Lôi Kiếp Phá Giới",
    banner: "Chín đạo sấm sét xé toạc hư không để lộ cánh cổng Tiên Giới!",
    playerAura: { trueLightningDmg: true, desc: "Thiên Phạt Chi Lôi: Đòn đánh chuyển thành sát thương Chân Lôi bỏ qua khiên" }
  }
};

// =========================================================================
// 6. THIÊN TÀI ĐỊA BẢO CĂN CƠ & GIÁM ĐỊNH KỲ VẬT (RELICS & APPRAISAL)
// =========================================================================
const ANCIENT_RELICS_APPRAISAL = {
  // Vật phẩm chưa giám định
  unidentifiedItems: {
    "co_vat_da_hoen_ri": { name: "Khối Đá Rêu Phong Cổ Xưa", basePrice: 50, costDanHoa: 10 },
    "co_vat_khuc_go_den": { name: "Khúc Gỗ Cháy Đen Bất Thường", basePrice: 120, costDanHoa: 25 },
    "co_vat_trung_hoa_thach": { name: "Quả Trứng Hóa Thạch Trầm Tích", basePrice: 300, costDanHoa: 50 }
  },
  // Bảng kết quả sau khi dùng Đan Hỏa nung nấu giám định
  outcomes: [
    {
      tier: "JUNK",
      name: "Phế Liệu Vụn Nát",
      rate: 0.65, // 65% xui xẻo
      reward: { item: "khoang_thach_vun", qty: 5, desc: "Đá vỡ vụn, chỉ thu được chút bột khoáng hạ phẩm" }
    },
    {
      tier: "UNCOMMON",
      name: "Kỳ Dược Tẩy Tủy Tuyền",
      rate: 0.25, // 25% cơ duyên nhẹ
      reward: { item: "tay_tuy_tuyen", stabilityGain: 10, toxinReduction: 15, desc: "Suối nguồn thanh khiết giúp bồi đắp +10% Căn Cơ và giảm 15% Đan Độc" }
    },
    {
      tier: "RARE",
      name: "Chân Long Nghịch Lân",
      rate: 0.08, // 8% đại kỳ ngộ
      reward: { item: "chan_long_nghich_linh", materialFor: "chan_long_dao_co", desc: "Vảy ngược Chân Long, bảo vật vô giá để đúc Thần Long Đạo Cơ" }
    },
    {
      tier: "MYTHIC",
      name: "Chân Tiên Tiên Cốt (Xương Ngón Tay Thái Cổ)",
      rate: 0.015, // 1.5% Thần thoại
      reward: {
        item: "chan_tien_tien_cot",
        legendarySkill: "thien_dao_nhat_chi",
        bonusAtkMult: 1.50,
        desc: "Dung hợp Tiên Cốt: Mở khóa tuyệt kỹ 'Thiên Đạo Nhất Chỉ' gây x3 sát thương khi địch máu đỏ!"
      }
    },
    {
      tier: "MYTHIC_CHAOS",
      name: "Hỗn Độn Tức Nhưỡng (Đất Mẹ Khai Thiên)",
      rate: 0.005, // 0.5% Chí bảo
      reward: {
        item: "hon_don_tuc_nhuong",
        eternalStability: 100,
        desc: "Thả vào Đan Điền: Căn cơ vĩnh viễn khóa ở mức 100% Kim Cương, không bao giờ suy suyển!"
      }
    }
  ]
};

// =========================================================================
// 7. QUY TẮC TRẢM ĐẠO TRỌNG TU (REINCARNATION & REDO FOUNDATION)
// =========================================================================
const REINCARNATION_RULES = {
  requiredItem: "cuu_chuyen_tan_cong_dan",
  resetTargetRealm: 1, // Luyện Khí Tầng 1
  benefits: {
    expGainPermanentMult: 1.50, // Kiếp thứ hai tu vi nhanh gấp 1.5 lần vĩnh viễn
    foundationPerfectionBonus: 30, // Lần sau Trúc Cơ được cộng thêm +30% tỉ lệ đúc Đạo Đài hoàn mỹ
    maxReincarnations: 3,
    mythicTitleAfter3Times: "Vạn Kiếp Bất Diệt Đạo Tôn",
    mythicStatMultiplier: 2.00
  }
};

// =========================================================================
// 8. HỆ THỐNG ĐỘ VỮNG & ĐAN ĐỘC (FOUNDATION CORE CONFIG)
// =========================================================================
const FOUNDATION_CONFIG = {
  stability: {
    initial: 100,
    thresholds: {
      CRITICAL_LOW: 40,   // Dưới 40%: Căn Cơ Hư Phù
      DIAMOND_HIGH: 85    // Từ 85% trở lên: Kim Cương Đạo Cơ
    },
    effects: {
      hư_phù: {
        defPenalty: -0.25,
        combatWoundChance: 0.10,
        tribulationDamageMult: 1.30
      },
      bình_ổn: {
        defPenalty: 0,
        combatWoundChance: 0,
        tribulationDamageMult: 1.00
      },
      kim_cương: {
        defBonus: 0.10,
        tribulationDamageMult: 0.85
      }
    },
    reinforceGainPer1000Exp: 5,
    decayOnFastBreakthrough: -15
  },

  pillToxins: {
    initial: 0,
    thresholds: {
      SAFE: 29,
      MILD: 59,
      HEAVY: 79,
      LETHAL: 80
    },
    accumulation: {
      lowGradePill: 1,
      expPill: 4,
      rawBeastCore: 4
    },
    effects: {
      safe: { expRateMult: 1.00, atkMult: 1.00, burnDmgMult: 0 },
      mild: { expRateMult: 0.85, atkMult: 0.92, burnDmgMult: 0 },
      heavy: { expRateMult: 0.65, atkMult: 0.80, burnDmgMult: 0.25 },
      lethal: { expRateMult: 0.00, atkMult: 0.50, burnDmgMult: 0.50, blockPillUsage: true }
    },
    naturalCleanseRatePer60s: 1
  },

  forms: FOUNDATION_FORMS,
  inscriptions: KIM_DAN_INSCRIPTIONS,
  phenomena: KIM_DAN_PHENOMENA,
  relics: ANCIENT_RELICS_APPRAISAL,
  reincarnation: REINCARNATION_RULES
};

// =========================================================================
// 9. CÁC HÀM TIỆN ÍCH DỄ DÙNG CHO ENGINE & SERVER
// =========================================================================

// 1. Roll ngẫu nhiên Linh Căn
function rollSpiritualRoot() {
  const r = Math.random();
  let accum = 0;
  for (let key in SPIRITUAL_ROOTS) {
    accum += SPIRITUAL_ROOTS[key].rate;
    if (r <= accum) return key;
  }
  return "chan_can";
}

// 2. Roll ngẫu nhiên Căn Cốt
function rollAptitude() {
  const r = Math.random();
  let accum = 0;
  for (let a of APTITUDES) {
    accum += a.rate;
    if (r <= accum) return a.rank;
  }
  return "Trung Phẩm";
}

// 3. Roll xác suất nhận Ẩn Mạch bẩm sinh
function rollLatentTrait() {
  for (let key in LATENT_TRAITS) {
    const trait = LATENT_TRAITS[key];
    if (Math.random() < trait.rollChance) {
      return { id: key, awakened: false };
    }
  }
  return null;
}

// 4. Lấy thông tin cấp bậc Căn Cơ
function getFoundationStabilityInfo(stability) {
  const stab = typeof stability === "number" ? stability : 100;
  const cfg = FOUNDATION_CONFIG.stability;
  if (stab < cfg.thresholds.CRITICAL_LOW) {
    return { tier: "HƯ_PHÙ", name: "Căn Cơ Hư Phù", color: "#ef4444", effects: cfg.effects.hư_phù };
  } else if (stab >= cfg.thresholds.DIAMOND_HIGH) {
    return { tier: "KIM_CƯƠNG", name: "Kim Cương Đạo Cơ", color: "#facc15", effects: cfg.effects.kim_cương };
  }
  return { tier: "BÌNH_ỔN", name: "Căn Cơ Bình Ổn", color: "#38bdf8", effects: cfg.effects.bình_ổn };
}

// 5. Lấy thông tin mức Đan Độc
function getPillToxinInfo(toxins) {
  const tox = typeof toxins === "number" ? toxins : 0;
  const cfg = FOUNDATION_CONFIG.pillToxins;
  if (tox <= cfg.thresholds.SAFE) {
    return { tier: "SAFE", name: "Thanh Khiết", color: "#4ade80", effects: cfg.effects.safe };
  } else if (tox <= cfg.thresholds.MILD) {
    return { tier: "MILD", name: "Nhiễm Độc Nhẹ", color: "#facc15", effects: cfg.effects.mild };
  } else if (tox <= cfg.thresholds.HEAVY) {
    return { tier: "HEAVY", name: "Tạp Chất Nặng", color: "#fb923c", effects: cfg.effects.heavy };
  }
  return { tier: "LETHAL", name: "Đan Độc Công Tâm", color: "#ef4444", effects: cfg.effects.lethal };
}

// 6. Giám định Cổ Vật Phong Ấn bằng Đan Hỏa
function appraiseAncientRelic(hasTrùngĐồng = false, luckBonus = 0) {
  let outcomes = [...ANCIENT_RELICS_APPRAISAL.outcomes];
  let r = Math.random();
  // Nếu có Trùng Đồng hoặc Khí Vận cao -> tăng tỉ lệ ra đồ hiếm
  if (hasTrùngĐồng) r = r * 0.70;
  if (luckBonus > 0) r = r * (1 - Math.min(luckBonus, 0.30));

  let accum = 0;
  for (let out of outcomes) {
    accum += out.rate;
    if (r <= accum) return out;
  }
  return outcomes[0];
}

// 7. Xác định phẩm cấp Kim Đan & Dị Tượng khi đột phá
function evaluateKimDanBreakthrough(stability, pillToxins, sectId = null) {
  const stab = typeof stability === "number" ? stability : 100;
  const tox = typeof pillToxins === "number" ? pillToxins : 0;

  let chosenGrade = KIM_DAN_INSCRIPTIONS.nhat_chuyen_ha_pham;
  if (stab >= 90 && tox <= 10) {
    chosenGrade = KIM_DAN_INSCRIPTIONS.cuu_chuyen_cuc_pham;
  } else if (stab >= 75 && tox <= 30) {
    chosenGrade = KIM_DAN_INSCRIPTIONS.luc_chuyen_thuong_pham;
  } else if (stab >= 50 && tox <= 50) {
    chosenGrade = KIM_DAN_INSCRIPTIONS.tam_chuyen_trung_pham;
  }

  // Nếu là Cửu Chuyển hoặc Lục Chuyển -> Kích hoạt Thiên Địa Dị Tượng
  let phenomenon = null;
  if (chosenGrade.rings >= 6) {
    const pKeys = Object.keys(KIM_DAN_PHENOMENA);
    // Ma tu có xu hướng ra Ma Thần Hàng Thế
    if (sectId === "van_ma_uyen") {
      phenomenon = KIM_DAN_PHENOMENA["ma_than_hang_the"];
    } else if (sectId === "thanh_van_kiem_tong") {
      phenomenon = KIM_DAN_PHENOMENA["van_kiem_trieu_quy"];
    } else {
      const randKey = pKeys[Math.floor(Math.random() * pKeys.length)];
      phenomenon = KIM_DAN_PHENOMENA[randKey];
    }
  }

  return { grade: chosenGrade, phenomenon };
}

// 8. Thực hiện Trảm Đạo Trọng Tu
function executeReincarnation(character) {
  const currentCount = character.reincarnationCount || 0;
  if (currentCount >= REINCARNATION_RULES.benefits.maxReincarnations) {
    return { success: false, message: "Đã đạt cảnh giới cực hạn Trảm Đạo, không thể trọng tu thêm nữa!" };
  }

  const nextCount = currentCount + 1;
  const isFinal = nextCount >= REINCARNATION_RULES.benefits.maxReincarnations;

  return {
    success: true,
    reincarnationCount: nextCount,
    resetRealm: 1, // Về Luyện Khí Tầng 1
    permanentExpMult: 1.0 + (nextCount * 0.50), // Mỗi lần +50% exp
    isFinalMaster: isFinal,
    unlockedTitle: isFinal ? REINCARNATION_RULES.benefits.mythicTitleAfter3Times : null,
    message: `Trảm Đạo thành công lần thứ ${nextCount}! Đạo Đài cũ tan rã, Niết Bàn Trùng Sinh!`
  };
}

// 9. Xác định phẩm cấp Trúc Cơ dựa theo Đạo Cơ
function evaluateTrucCoGrade(stability, pillToxins, chosenFormId = null) {
  if (chosenFormId && FOUNDATION_FORMS[chosenFormId]) {
    return FOUNDATION_FORMS[chosenFormId];
  }
  const stab = typeof stability === "number" ? stability : 100;
  const tox = typeof pillToxins === "number" ? pillToxins : 0;
  if (stab >= 90 && tox <= 10) return FOUNDATION_FORMS["thien_dao_vo_ha"];
  if (stab >= 75 && tox <= 30) return FOUNDATION_FORMS["kiem_tuy_dao_co"];
  if (stab >= 50 && tox <= 50) return FOUNDATION_FORMS["ngu_hanh_luan_hoi"];
  return FOUNDATION_FORMS["pham_thai_thach_co"];
}

// 10. Tương thích ngược evaluateKimDanGrade
function evaluateKimDanGrade(stability, pillToxins, sectId = null) {
  return evaluateKimDanBreakthrough(stability, pillToxins, sectId);
}

// =========================================================================
// 11. HỆ THỐNG THIÊN THỜI: THẬP NHỊ THỜI THẦN (12 CANH GIỜ) & KHÍ TƯỢNG (DOC 09)
// Chu kỳ 48 phút thực tế = 1 Ngày Đêm Tu Tiên (Mỗi Canh Giờ = 4 phút thực tế)
// =========================================================================
const CANH_GIO_CONFIG = [
  { index: 0, name: 'TÝ', icon: '🌑', range: '00 - 04p', phenomenon: 'Thái Âm Cực Thịnh', element: 'Thủy / Băng / Ám', bonusDesc: 'Công kích hệ Thủy/Băng/Ám +25% | Mở Chợ Đen Ma Tiêu Cục', type: 'THUY_BANG', atkBonus: 0.25 },
  { index: 1, name: 'SỬU', icon: '🪨', range: '04 - 08p', phenomenon: 'Âm Trọc Trầm Tích', element: 'Thổ', bonusDesc: 'Phòng ngự Thổ Mệnh +20% | Bế quan tẩy đan độc hiệu quả +30%', type: 'THO', defBonus: 0.20, cleanseBonus: 0.30 },
  { index: 2, name: 'DẦN', icon: '🌅', range: '08 - 12p', phenomenon: 'Dương Khí Sơ Sinh', element: 'Dương Lôi', bonusDesc: '⚡ GIỜ VÀNG ĐỘ KIẾP: Sát thương Lôi Kiếp tự nhiên giảm -15%', type: 'LOI_GIO_VANG', tribReduce: 0.15 },
  { index: 3, name: 'MÃO', icon: '🌸', range: '12 - 16p', phenomenon: 'Tử Khí Đông Lai', element: 'Toàn Hệ', bonusDesc: 'Tọa Thiền Tĩnh Tọa toàn server nhận thêm +30% Tu Vi/giây', type: 'EXP_BUFF', expMult: 1.30 },
  { index: 4, name: 'THÌN', icon: '🌿', range: '16 - 20p', phenomenon: 'Vạn Mộc Triều Dương', element: 'Mộc', bonusDesc: 'Dược Điền sinh trưởng cực nhanh, thu hoạch x1.5 sản lượng thảo dược', type: 'FARM_BUFF', farmYieldMult: 1.5 },
  { index: 5, name: 'TỊ', icon: '🔥', range: '20 - 24p', phenomenon: 'Thuần Dương Nhen Nhóm', element: 'Hỏa', bonusDesc: 'Đan hỏa ôn hòa ổn định, giảm 25% tỷ lệ nổ lò luyện đan', type: 'ALCHEMY_BUFF', alchSuccessBonus: 0.25 },
  { index: 6, name: 'NGỌ', icon: '☀️', range: '24 - 28p', phenomenon: 'Thái Dương Cực Thịnh', element: 'Hỏa / Lôi', bonusDesc: 'Hỏa & Lôi công kích +25%, gây thêm +30% sát thương chuẩn lên Ma Tộc', type: 'HOA_LOI', atkBonus: 0.25, vsMaBonus: 0.30 },
  { index: 7, name: 'MÙI', icon: '⚒️', range: '28 - 32p', phenomenon: 'Hỏa Nung Kim Địa', element: 'Thổ / Kim', bonusDesc: 'Thần Thức Tầm Bảo tăng +25% xác suất đào được Linh Thạch cổ', type: 'MINE_BUFF', treasureBonus: 0.25 },
  { index: 8, name: 'THÂN', icon: '⚔️', range: '32 - 36p', phenomenon: 'Bạch Hổ Canh Kim', element: 'Kim', bonusDesc: 'Kim Mệnh +25%, Phi Kiếm tăng +15% xuyên giáp, Bạo Kích +5%', type: 'KIM', atkBonus: 0.25, critBonus: 0.05 },
  { index: 9, name: 'DẬU', icon: '🌪️', range: '36 - 40p', phenomenon: 'Hoàng Hôn Lạc Nhật', element: 'Phong', bonusDesc: 'Phong Mệnh +25%, Thân pháp ngự kiếm x2, Tỉ lệ Né Tránh +8%', type: 'PHONG', speedBonus: 0.50, dodgeBonus: 0.08 },
  { index: 10, name: 'TUẤT', icon: '🐺', range: '40 - 44p', phenomenon: 'Ma Chướng Khởi Sinh', element: 'Ma / Tà', bonusDesc: 'Quái bãi săn cuồng nộ, tăng +35% tỷ lệ rơi Yêu Đan & Bí Tịch', type: 'HUNT_BUFF', dropRateBonus: 0.35 },
  { index: 11, name: 'HỢI', icon: '🌌', range: '44 - 48p', phenomenon: 'Vạn Linh Quy Tịch', element: 'Toàn Hệ', bonusDesc: 'Tốc độ hồi phục Thể Lực (Stamina) tăng +50%', type: 'STAMINA_BUFF', staminaRegenMult: 1.50 }
];

const WEATHER_CONFIG = {
  thanh_thien: { id: 'thanh_thien', name: 'Thanh Thiên Không Mây', icon: '☀️', desc: 'Ngũ hành điều hòa, thiên địa thanh bình, vạn vật hanh thông.' },
  bao_set: { id: 'bao_set', name: 'Bão Mưa Sấm Chớp', icon: '⛈️', desc: 'Thủy +30%, Lôi +25%, Dược Điền tự động ngậm nước đầy 100%!' },
  han_han: { id: 'han_han', name: 'Hạn Hán Liệt Diễm', icon: '🏜️', desc: 'Hỏa +30%, lò luyện đan tăng nhiệt tự nhiên, Thủy tính suy giảm.' },
  huyen_suong: { id: 'huyen_suong', name: 'Vạn Dặm Huyền Sương', icon: '🌫️', desc: 'Né tránh +10%, Thần Thức quét kho báu phát hiện Cổ Vật dễ hơn.' },
  huyet_nguyet: { id: 'huyet_nguyet', name: '🩸 HUYẾT NGUYỆT GIÁNG THẾ', icon: '🩸', desc: 'Mặt trăng chuyển đỏ máu! Ma Tộc bạo nộ +40% sát thương, rơi Thần Vật Thái Cổ!' }
};

function getCurrentCanhGioAndWeather() {
  const now = Date.now();
  const cycleMs = 48 * 60 * 1000;
  const inCycleMs = now % cycleMs;
  const canhGioIndex = Math.floor(inCycleMs / (4 * 60 * 1000));
  const canhGio = CANH_GIO_CONFIG[canhGioIndex] || CANH_GIO_CONFIG[0];

  const dayCycleIndex = Math.floor(now / cycleMs);
  const weatherKeys = Object.keys(WEATHER_CONFIG);
  const weatherSeed = (dayCycleIndex * 13 + 7) % (weatherKeys.length - 1);
  let weather = WEATHER_CONFIG[weatherKeys[weatherSeed]] || WEATHER_CONFIG.thanh_thien;

  if (canhGio.name === 'TÝ' && (dayCycleIndex % 30 === 15)) {
    weather = WEATHER_CONFIG.huyet_nguyet;
  }

  const remainSec = 240 - Math.floor((inCycleMs % (4 * 60 * 1000)) / 1000);
  return { canhGio, weather, remainSec };
}

// =========================================================================
// 12. HỆ THỐNG LỤC ĐẠI TRANG BỊ BẢN MỆNH (DOC 21, 23)
// 6 vị trí: weapon, armor, boots, amulet, ring, relic
// =========================================================================
const EQUIPMENT_CONFIG = {
  // 1. Binh Khí
  kiem_thanh_van: { id: 'kiem_thanh_van', slot: 'weapon', name: 'Thanh Vân Linh Kiếm', icon: '🗡️', tier: 'Hạ Phẩm', atk: 120, crit: 0.05, desc: 'Phi kiếm ngoại môn đệ tử Thanh Vân Tông (+120 Công, +5% Bạo Kích)' },
  ma_dao_thon_thien: { id: 'ma_dao_thon_thien', slot: 'weapon', name: 'Thôn Thiên Ma Đao', icon: '⚔️', tier: 'Trung Phẩm', atk: 380, lifesteal: 0.08, desc: 'Đao ma rèn từ xương Hung Thú (+380 Công, +8% Hút Máu)' },
  kiem_thai_hu: { id: 'kiem_thai_hu', slot: 'weapon', name: 'Thái Hư Cổ Kiếm', icon: '✨', tier: 'Cực Phẩm', atk: 950, crit: 0.15, desc: 'Thần kiếm thượng cổ chấn hưng vạn phái (+950 Công, +15% Bạo Kích)' },

  // 2. Pháp Y / Đạo Bào
  ao_thanh_truc: { id: 'ao_thanh_truc', slot: 'armor', name: 'Thanh Trúc Đạo Bào', icon: '🥋', tier: 'Hạ Phẩm', def: 60, hp: 500, desc: 'Đạo bào dệt từ linh trúc ngàn năm (+60 Giáp, +500 Khí Huyết)' },
  giap_huyen_vu: { id: 'giap_huyen_vu', slot: 'armor', name: 'Huyền Vũ Thần Giáp', icon: '🛡️', tier: 'Cực Phẩm', def: 480, hp: 3800, desc: 'Giáp mai rùa ngàn năm đao thương bất nhập (+480 Giáp, +3.800 Máu)' },

  // 3. Hài Thân Pháp
  hai_thanh_phong: { id: 'hai_thanh_phong', slot: 'boots', name: 'Thanh Phong Tiên Hài', icon: '🥾', tier: 'Hạ Phẩm', speed: 30, dodge: 0.05, desc: 'Hài đạp mây ngự gió (+30 Thân Pháp, +5% Né Tránh)' },
  hai_thien_loi: { id: 'hai_thien_loi', slot: 'boots', name: 'Thiên Lôi Huyễn Bộ Hài', icon: '⚡', tier: 'Cực Phẩm', speed: 120, dodge: 0.15, desc: 'Bước đi kéo theo tia lôi điện (+120 Thân Pháp, +15% Né Tránh)' },

  // 4. Ngọc Bội Hộ Mệnh
  ngoc_thanh_tam: { id: 'ngoc_thanh_tam', slot: 'amulet', name: 'Thanh Tâm Bích Ngọc Bội', icon: '📿', tier: 'Trung Phẩm', lightningResist: 0.15, desc: 'Ngọc bội an thần hộ tâm (Giảm 15% sát thương Lôi Kiếp)' },
  ngoc_ho_mach: { id: 'ngoc_ho_mach', slot: 'amulet', name: 'Hộ Mạch Thần Phù Bội', icon: '💎', tier: 'Cực Phẩm', lightningResist: 0.35, desc: 'Chí bảo hộ đan điền (Giảm 35% sát thương Lôi Kiếp)' },

  // 5. Giới Chỉ Không Gian
  nhan_tu_di: { id: 'nhan_tu_di', slot: 'ring', name: 'Tu Di Giới Chỉ', icon: '💍', tier: 'Hạ Phẩm', expRateBonus: 0.10, desc: 'Nhẫn nạp linh khí càn khôn (Tăng +10% tốc độ tu luyện)' },
  nhan_can_khon: { id: 'nhan_can_khon', slot: 'ring', name: 'Càn Khôn Nạp Giới', icon: '👑', tier: 'Cực Phẩm', expRateBonus: 0.30, desc: 'Không gian hư vô chứa càn khôn (Tăng +30% tốc độ tu luyện)' },

  // 6. Bản Mệnh Dị Bảo
  dinh_than_nong: { id: 'dinh_than_nong', slot: 'relic', name: 'Thần Nông Dược Đỉnh', icon: '🏺', tier: 'Thần Giai', hpRegen: 0.05, desc: 'Chí bảo đan đạo cổ đại (Tự động hồi phục 5% Khí Huyết mỗi hiệp)' },
  cot_chan_tien: { id: 'cot_chan_tien', slot: 'relic', name: 'Chân Tiên Tiên Cốt', icon: '🦴', tier: 'Thần Giai', atk: 500, def: 300, desc: 'Xương tiên thái cổ phát quang (+500 Công Kích, +300 Phòng Ngự)' }
};

// =========================================================================
// 13. HỆ THỐNG LỤC ĐẲNG ĐỆ TỬ TÔNG MÔN (DOC 12)
// =========================================================================
const SECT_RANKS_CONFIG = {
  TAP_DICH: { id: 'TAP_DICH', name: 'Tạp Dịch Đệ Tử', icon: '🧹', stipend: 500, reqRealmId: 1, reqStones: 0, nextRank: 'NGOAI_MON', title: 'Tạp Dịch Viện', desc: 'Bổ củi, gánh nước, quét sân sơn môn' },
  NGOAI_MON: { id: 'NGOAI_MON', name: 'Ngoại Môn Đệ Tử', icon: '🗡️', stipend: 1500, reqRealmId: 4, reqStones: 1000, nextRank: 'NOI_MON', title: 'Ngoại Môn Đường', desc: 'Tuần tra bìa rừng, săn bắt yêu thú sơ cấp' },
  NOI_MON: { id: 'NOI_MON', name: 'Nội Môn Đệ Tử', icon: '🛡️', stipend: 5000, reqRealmId: 8, reqStones: 5000, nextRank: 'CHAN_TRUYEN', title: 'Nội Môn Điện', desc: 'Trấn thủ mỏ khoáng thạch, dẫn đội săn quái' },
  CHAN_TRUYEN: { id: 'CHAN_TRUYEN', name: 'Chân Truyền Đệ Tử', icon: '🌟', stipend: 15000, reqRealmId: 13, reqStones: 20000, nextRank: 'THU_TICH', title: 'Chân Truyền Đỉnh', desc: 'Đồ đệ thân truyền đại Trưởng Lão, học tuyệt kỹ trấn phái' },
  THU_TICH: { id: 'THU_TICH', name: 'Thủ Tịch Đại Đệ Tử', icon: '👑', stipend: 50000, reqRealmId: 18, reqStones: 100000, nextRank: 'THANH_TU', title: 'Đại Sư Huynh / Tỷ', desc: 'Đứng đầu vạn đệ tử môn phái, nắm giữ Chấp Pháp Quyền' },
  THANH_TU: { id: 'THANH_TU', name: 'Thánh Tử / Thánh Nữ', icon: '☀️', stipend: 150000, reqRealmId: 24, reqStones: 300000, nextRank: null, title: 'Người Kế Vị Chưởng Môn', desc: 'Hiệu lệnh quần hùng cửu châu, uy áp cái thế' }
};

// =========================================================================
// 14. HỆ THỐNG DANH PHẢ ĐẠI NPC & HẢO CẢM (DOC 13)
// =========================================================================
const NPCS_CONFIG = {
  huyen_co: { id: 'huyen_co', name: 'Huyền Cơ (Khí Linh)', sect: 'Thái Cổ Thiên Đạo', avatar: '🔮', desc: 'Ý thức Trái Tim Thiên Đạo Thứ Nhất, ẩn trong ngực người chơi', giftLiked: 'yeu_dan_1', blessing: 'Giảm 20% sát thương Lôi Kiếp vĩnh viễn' },
  ly_huyen_chan: { id: 'ly_huyen_chan', name: 'Lý Huyền Chân', sect: 'Thanh Vân Kiếm Tông', avatar: '⚔️', desc: 'Thuần Dương Kiếm Tôn Hóa Thần Kỳ, tóc bạc một đêm vì thê tử', giftLiked: 'dan_truc_co', blessing: 'Ban Bản Mệnh Kiếm Phù tăng +15% Sát Thương Binh Khí' },
  doc_co_diet: { id: 'doc_co_diet', name: 'Độc Cô Diệt', sect: 'Vạn Ma Uyên', avatar: '🩸', desc: 'Ma tôn cuồng bạo xé nát thiên địa, sát phạt quả đoán', giftLiked: 'yeu_dan_2', blessing: 'Kích hoạt Huyết Ma Cuồng Nộ +10% Hút Máu' },
  lieu_nhu_yen: { id: 'lieu_nhu_yen', name: 'Liễu Như Yên', sect: 'Hợp Hoan Tông', avatar: '🌸', desc: 'Tuyệt sắc giai nhân, hồng nhan trà xanh mang vết sẹo tủi nhục', giftLiked: 'thao_duoc_hoang_tinh', blessing: 'Bế quan song tu tăng gấp đôi Tu Vi nhận được' },
  au_da_ton_gia: { id: 'au_da_ton_gia', name: 'Âu Dã Tôn Giả', sect: 'Thần Binh Các', avatar: '⚒️', desc: 'Lão thợ rèn cụt ngón từng chém rách Thần Giới', giftLiked: 'thao_duoc_linh_chi', blessing: 'Được ban 1 thanh Thanh Vân Linh Kiếm cực phẩm' },
  co_nhu_tuyet: { id: 'co_nhu_tuyet', name: 'Cơ Như Tuyết', sect: 'Băng Tuyết Cung', avatar: '❄️', desc: 'Băng cơ ngọc cốt, lãnh diễm ngạo thị cửu tiêu', giftLiked: 'nuoc_linh_khi', blessing: 'Khí huyết hồi phục +10% sau mỗi trận thắng bãi săn' }
};

module.exports = {
  SPIRITUAL_ROOTS,
  APTITUDES,
  LATENT_TRAITS,
  FOUNDATION_FORMS,
  KIM_DAN_INSCRIPTIONS,
  KIM_DAN_PHENOMENA,
  ANCIENT_RELICS_APPRAISAL,
  REINCARNATION_RULES,
  FOUNDATION_CONFIG,
  CANH_GIO_CONFIG,
  WEATHER_CONFIG,
  EQUIPMENT_CONFIG,
  SECT_RANKS_CONFIG,
  NPCS_CONFIG,
  getCurrentCanhGioAndWeather,
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
};
