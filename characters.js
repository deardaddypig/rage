/* =============================================================================
   characters.js  —  所有角色資料（屬性 / 招式 / 外觀 / 臉部參數）
   -----------------------------------------------------------------------------
   index.html 只負責遊戲引擎，唔會寫死任何角色。
   想「加角色」或「改招式」：只需要改呢個檔案，唔使掂 index.html。

   結構：
     1. CharacterDefaults   預設招式 + 預設臉部參數（角色冇寫嘅項目就用呢度）
     2. CharacterRoster     角色名單（陣列次序 = 選角畫面次序）
     3. CharacterRegistry   將 Roster 同 Defaults 合併，俾 index.html 讀取（一般唔使改）

   ─────────────────────────  加新角色 3 步  ─────────────────────────
   1) 喺下面 CharacterRoster 陣列加一個物件（可以複製現有角色改）
   2) 填 id / name / role / 四項屬性 / special1 / special2 / appearance
   3) 重新整理頁面，選角畫面會自動出現新角色（卡片、3D 預覽、頭像都自動生成）

   ─────────────────────────  改招式  ─────────────────────────
   喺角色物件加 moves: { ... }，只寫你想改嘅部分，其餘沿用 CharacterDefaults.moves。
   例：  moves: { kick: { mult: 1.6, range: 2.2 } }

   招式欄位（所有攻擊通用）：
     anim       動畫：'punch' | 'punch2' | 'heavy' | 'kick' | 'special'（引擎內置姿勢）
     duration   出招時間（秒，會再按 spd 加速）
     mult       傷害倍率（× atk × 0.24）
     range      攻擊距離           zRange  前後（縱深）判定範圍
     knockback  擊退力度           knockdown  true = 打低對手
     hitStart / hitEnd  判定生效嘅動作進度 0~1（預設 0.25 ~ 0.72）
     sfx        音效：'punch' | 'kick' | 'heavy' | 'special'
   ============================================================================= */

// ─────────────────────────────────────────────────────────────────────────────
// 1. 預設值
// ─────────────────────────────────────────────────────────────────────────────
const CharacterDefaults = {
  moves: {
    // J 鍵連擊：按次序循環，最後一招完成後重新由第一招開始
    combo: [
      { anim: 'punch',  duration: 0.24, mult: 0.90, range: 1.50, knockback: 2.2, sfx: 'punch' },
      { anim: 'punch2', duration: 0.25, mult: 1.05, range: 1.55, knockback: 2.8, sfx: 'punch' },
      { anim: 'heavy',  duration: 0.36, mult: 1.55, range: 1.75, knockback: 6.2, knockdown: true, sfx: 'heavy' }
    ],
    comboWindow: 0.75,   // 連擊輸入時限（秒）

    // 衝刺中按 J
    dashAttack: { anim: 'heavy', duration: 0.34, mult: 1.50, range: 1.85, knockback: 6.5, knockdown: true, sfx: 'heavy' },

    // K 鍵：地面踢 / 空中踢
    kick: {
      anim: 'kick', duration: 0.32, mult: 1.25, range: 1.80, knockback: 4.8, sfx: 'kick',
      comboKnockdown: 2   // 連擊去到第幾段之後，踢會打低對手
    },
    airKick: { anim: 'kick', duration: 0.34, mult: 1.35, range: 1.80, knockback: 5.8, knockdown: true, sfx: 'kick' },

    // O 鍵：抓摔
    grab: {
      duration: 0.34,
      reach: 1.65, reachZ: 0.95,   // 抓取範圍（左右 / 縱深）
      pull: 0.95,                  // 對手被拉到面前嘅距離
      damageMult: 0.34, knockback: 9.2,
      energyGain: 12               // 成功後回復幾多能量
    },

    // 必殺技（U / 拳+腳）同 大招（H）嘅共通設定；name / cost / mult / radius 喺角色物件度寫
    special1: { cost: 35,  duration: 0.48, invuln: 0.45, knockback: 6.5, knockdown: true, color: 0x00d4ff, sfx: 'special', banner: false },
    special2: { cost: 100, duration: 0.65, invuln: 0.75, knockback: 9.5, knockdown: true, color: 0xff2a5f, sfx: 'special', banner: true }
  },

  // 臉部 / 頭部參數預設值（角色冇寫就用呢度）
  face: {
    template: 'sidepart',          // 臉部／髮型模板：'messy' | 'undercut' | 'sidepart' | 'spiky' | 'slickback'
    palette: null,                 // null = 根據 appearance 嘅顏色自動生成
    head:  { sx: 0.220, sy: 0.270, sz: 0.218, jaw: 0.21, cheek: 0.015 },  // 3D 頭形
    earX: 0.212,                   // 耳仔左右位置
    noseScale: 0.88,               // 3D 鼻樑大細
    tex: {                         // 臉部貼圖微調
      noseW: 14, noseY: 21,
      sideHairY: 210,              // 鬢角延伸高度
      sideburnSolid: false,        // true = 鬢角全黑實色
      earY: 244, faceCy: 240, faceScale: 1.44
    }
  },

  // 敵人 / Boss 共用嘅 3D 頭形
  enemyHead: { sx: 0.218, sy: 0.258, sz: 0.218, jaw: 0.24, cheek: 0.01 }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. 角色名單（次序 = 選角畫面由左至右：SHING / CHIT / FELIX）
// ─────────────────────────────────────────────────────────────────────────────
const CharacterRoster = [
  // ── 1. SHING：速度型（保留）────────────────────────────────────────────────
  {
    id: 'SHING',
    name: 'SHING',
    role: 'SPEED TYPE',
    hp: 75, def: 55, atk: 75, spd: 100,
    special1: { name: 'Cyclone Kick',       cost: 35,  mult: 1.70, radius: 3.8, color: 0x00d4ff },
    special2: { name: 'Hyper Blitz Flurry', cost: 100, mult: 2.95, radius: 5.0, color: 0x00f5d4 },
    appearance: {
      faceId: 'SHING',
      skin: 0xe8bfa4, hair: 0x261b15, hairStyle: 'undercut',
      shirt: 0xf0eadc, pants: 0x1c2940,
      torsoW: 0.62, pocket: false, glasses: 'silver'
    },
    face: {
      template: 'undercut',
      palette: {
        base: '#e8bfa4', hi: '#f7d9c4', mid: '#ddae90', sh: '#c49275',
        lip: '#c47b74', lipLine: '#844640', hair: '#261b15', hairHi: '#423026',
        shirt: '#f0eadc', shirtDark: '#d6cdb8', bgA: '#1d2948', bgB: '#0f1324'
      },
      head: { sx: 0.218, sy: 0.258, sz: 0.218, jaw: 0.24, cheek: 0.01 },
      earX: 0.212,
      noseScale: 0.88,
      tex: { noseW: 13.5, noseY: 21, sideHairY: 210, sideburnSolid: false, earY: 244, faceCy: 240, faceScale: 1.44 }
    }
  },

  // ── 2. CHIT：防守型（圖一｜圓框眼鏡＋兩側剷青 Skin Head 豎立短髮＋灰色短袖上衣及短褲）
  {
    id: 'CHIT',
    name: 'CHIT',
    role: 'DEFENSE TYPE',
    hp: 100, def: 100, atk: 72, spd: 48,
    special1: { name: 'Aegis Guard Wave', cost: 35,  mult: 1.78, radius: 4.1, color: 0x38ef7d },
    special2: { name: 'Iron Bastion Nova', cost: 100, mult: 3.05, radius: 5.3, color: 0x00d4ff },
    appearance: {
      faceId: 'CHIT',
      skin: 0xe6b99a, hair: 0x1e1815, hairStyle: 'spiky',
      shirt: 0x7e8591, pants: 0x222630,
      torsoW: 0.67, pocket: false, glasses: 'round',
      shorts: true,                 // 膝上深灰短褲＋露小腿及短襪
      skinSides: true               // 左右兩側剷青（Skin Head）
    },
    face: {
      template: 'spiky',            // 頭頂豎立短髮＋左右兩側 Skin Head＋圓框眼鏡
      palette: {
        base: '#e6b99a', hi: '#f6d5bc', mid: '#d8a686', sh: '#be8c6e',
        lip: '#c47c72', lipLine: '#844a42', hair: '#1e1815', hairHi: '#3d322c',
        shirt: '#7e8591', shirtDark: '#5b626e', bgA: '#233038', bgB: '#0c101a'
      },
      head: { sx: 0.232, sy: 0.260, sz: 0.222, jaw: 0.16, cheek: 0.048 },
      earX: 0.222,
      noseScale: 0.96,
      tex: { noseW: 15.2, noseY: 22, sideHairY: 115, sideburnSolid: false, earY: 244, faceCy: 242, faceScale: 1.44 }
    },
    moves: {
      // 穩重防守反擊：較大範圍重擊與高威力抓摔
      combo: [
        { anim: 'punch',  duration: 0.25, mult: 0.92, range: 1.55, knockback: 2.6, sfx: 'punch' },
        { anim: 'punch2', duration: 0.26, mult: 1.08, range: 1.62, knockback: 3.4, sfx: 'punch' },
        { anim: 'heavy',  duration: 0.36, mult: 1.62, range: 1.85, knockback: 7.2, knockdown: true, sfx: 'heavy' }
      ],
      grab: { duration: 0.32, reach: 1.78, reachZ: 1.02, pull: 0.95, damageMult: 0.40, knockback: 10.2, energyGain: 15 }
    }
  },

  // ── 3. FELIX：攻擊型（圖二｜濃眉半框眼鏡＋側梳黑髮＋啡色西裝及西褲）────────
  {
    id: 'FELIX',
    name: 'FELIX',
    role: 'ATTACK TYPE',
    hp: 86, def: 64, atk: 100, spd: 60,
    special1: { name: 'Breaker Impact',     cost: 35,  mult: 1.92, radius: 3.7, color: 0xff9e00 },
    special2: { name: 'Apex Meteor Strike', cost: 100, mult: 3.25, radius: 5.0, color: 0xff2a5f },
    appearance: {
      faceId: 'FELIX',
      skin: 0xdfb193, hair: 0x131518, hairStyle: 'slickback',
      shirt: 0x6e4730, pants: 0x5c3a27,
      torsoW: 0.68, pocket: false, glasses: 'halfRim',
      blazer: true,                 // 啡色西裝翻領外套＋米白恤衫＋深啡領帶＋啡色西褲
      innerShirt: 0xf2ede4,
      tieColor: 0x3b2114,
      shoes: 0x3a2214,
      sole: 0x22130b
    },
    face: {
      template: 'slickback',        // 側分後梳蓬鬆黑髮＋濃黑眉＋半框眼鏡＋冷靜自信神情
      palette: {
        base: '#dfb193', hi: '#f1ccb3', mid: '#d19f80', sh: '#b88568',
        lip: '#b6746b', lipLine: '#76433c', hair: '#131518', hairHi: '#2f343d',
        shirt: '#6e4730', shirtDark: '#4f3120', bgA: '#3b2419', bgB: '#120c0c'
      },
      head: { sx: 0.224, sy: 0.272, sz: 0.220, jaw: 0.19, cheek: 0.022 },
      earX: 0.216,
      noseScale: 1.00,
      tex: { noseW: 15.8, noseY: 22, sideHairY: 230, sideburnSolid: true, earY: 242, faceCy: 242, faceScale: 1.44 }
    },
    moves: {
      // 高爆發攻擊連招與強力衝刺重擊
      combo: [
        { anim: 'punch',  duration: 0.23, mult: 0.98, range: 1.56, knockback: 2.5, sfx: 'punch' },
        { anim: 'punch2', duration: 0.24, mult: 1.15, range: 1.62, knockback: 3.4, sfx: 'punch' },
        { anim: 'heavy',  duration: 0.35, mult: 1.75, range: 1.88, knockback: 7.4, knockdown: true, sfx: 'heavy' }
      ],
      dashAttack: { anim: 'heavy', duration: 0.32, mult: 1.70, range: 1.98, knockback: 7.6, knockdown: true, sfx: 'heavy' },
      kick: { anim: 'kick', duration: 0.31, mult: 1.38, range: 1.86, knockback: 5.5, sfx: 'kick', comboKnockdown: 2 }
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Registry（合併預設值，俾 index.html 使用；一般唔使改）
// ─────────────────────────────────────────────────────────────────────────────
const CharacterRegistry = (() => {
  const byId = {};
  const ids = [];

  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
  const shade = (n, f) => {
    // f > 0 變亮，f < 0 變暗
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
      Math.max(0, Math.min(255, Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f))))
    );
    return hex((ch[0] << 16) | (ch[1] << 8) | ch[2]);
  };

  // 冇寫 palette 嘅角色，由 appearance 嘅顏色自動生成
  const autoPalette = (a) => {
    const skin = a.skin != null ? a.skin : 0xdca583;
    const hair = a.hair != null ? a.hair : 0x1a1a1a;
    const shirt = a.shirt != null ? a.shirt : 0x333333;
    return {
      base: hex(skin), hi: shade(skin, 0.18), mid: shade(skin, -0.06), sh: shade(skin, -0.20),
      lip: shade(skin, -0.22), lipLine: shade(skin, -0.50),
      hair: hex(hair), hairHi: shade(hair, 0.22),
      shirt: hex(shirt), shirtDark: shade(shirt, -0.25),
      bgA: shade(shirt, -0.55), bgB: '#0f1324'
    };
  };

  const merge = (def, ov) => Object.assign({}, def, ov || {});

  function register(raw) {
    if (!raw || !raw.id) throw new Error('CharacterRegistry.register: 角色需要 id');
    const D = CharacterDefaults;
    const m = raw.moves || {};
    const app = Object.assign({ faceId: raw.id }, raw.appearance || {});
    const f = raw.face || {};

    const data = {
      id: raw.id,
      name: raw.name || raw.id,
      role: raw.role || '',
      hp: raw.hp, def: raw.def, atk: raw.atk, spd: raw.spd,
      appearance: app,
      special1: merge(merge(D.moves.special1, m.special1), raw.special1),
      special2: merge(merge(D.moves.special2, m.special2), raw.special2),
      moves: {
        combo: m.combo || D.moves.combo,
        comboWindow: m.comboWindow != null ? m.comboWindow : D.moves.comboWindow,
        dashAttack: merge(D.moves.dashAttack, m.dashAttack),
        kick: merge(D.moves.kick, m.kick),
        airKick: merge(D.moves.airKick, m.airKick),
        grab: merge(D.moves.grab, m.grab)
      },
      face: {
        template: f.template || D.face.template,
        palette: f.palette || autoPalette(app),
        head: merge(D.face.head, f.head),
        earX: f.earX != null ? f.earX : D.face.earX,
        noseScale: f.noseScale != null ? f.noseScale : D.face.noseScale,
        tex: merge(D.face.tex, f.tex)
      }
    };

    if (!byId[data.id]) ids.push(data.id);
    byId[data.id] = data;
    return data;
  }

  CharacterRoster.forEach(register);

  return {
    ids,                                           // 角色 id 列表（選角次序）
    register,                                      // 亦可以喺其他檔案 CharacterRegistry.register({...}) 加角色
    has: (id) => !!byId[id],
    get: (id) => byId[id] || byId[ids[0]],         // 搵唔到就用第一個角色
    list: () => ids.map((i) => byId[i])
  };
})();