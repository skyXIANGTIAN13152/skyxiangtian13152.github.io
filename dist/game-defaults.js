// Games named by Sky. This is only the v1 migration seed; v2 edits remain authoritative.
const titles = [
  ['identity-v', '第五人格', 'Identity V'],
  ['honor-of-kings', '王者荣耀', 'Honor of Kings'],
  ['genshin-impact', '原神', 'Genshin Impact'],
  ['game-for-peace', '和平精英', 'Game for Peace'],
  ['zenless-zone-zero', '绝区零', 'Zenless Zone Zero'],
  ['onmyoji', '阴阳师', 'Onmyoji'],
  ['lifeafter', '明日之后', 'LifeAfter'],
  ['pvz-fusion', '植物大战僵尸融合版', 'Plants vs. Zombies Fusion'],
  ['pvz2', '植物大战僵尸2', 'Plants vs. Zombies 2'],
  ['naraka', '永劫无间', 'NARAKA: BLADEPOINT'],
  ['wallpaper-engine', 'Wallpaper Engine', 'Wallpaper Engine'],
  ['clash-of-clans', '部落冲突', 'Clash of Clans'],
  ['clash-royale', '皇室战争', 'Clash Royale'],
  ['zaomeng-4', '造梦西游4', '造梦西游4'],
  ['zaomeng-5', '造梦西游5', '造梦西游5'],
];
const artwork = {
  "identity-v": "assets/games/identity-v.jpg",
  "honor-of-kings": "assets/games/honor-of-kings.jpg",
  "genshin-impact": "assets/games/genshin-impact.jpg",
  "game-for-peace": "assets/games/game-for-peace.jpg",
  "zenless-zone-zero": "assets/games/zenless-zone-zero.jpg",
  "onmyoji": "assets/games/onmyoji.jpg",
  "lifeafter": "assets/games/lifeafter.jpg",
  "pvz2": "assets/games/pvz2.jpg",
  "clash-of-clans": "assets/games/clash-of-clans.jpg",
  "clash-royale": "assets/games/clash-royale.jpg",
  "naraka": "assets/games/naraka.jpg",
  "wallpaper-engine": "assets/games/wallpaper-engine.jpg",
  "zaomeng-5": "assets/games/zaomeng-5.jpg",
  "pvz-fusion": "assets/games/pvz-fusion.jpg",
  "zaomeng-4": "assets/games/zaomeng-4.jpg"
};
export const DEFAULT_GAMES = titles.map(([id, title, titleEn]) => ({
  id, title, titleEn, body: '', bodyEn: '', favoriteCharacter: '', favoriteCharacterEn: '',
  image: artwork[id] || '', url: '', visible: true,
  ...(id === 'identity-v' ? { body: '我喜欢玩《第五人格》。', bodyEn: 'I enjoy playing Identity V.',
    favoriteCharacter: '玩具商', favoriteCharacterEn: 'Toy Merchant' } : {}),
}));
