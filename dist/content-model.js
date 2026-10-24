import { DEFAULT_GAMES } from './game-defaults.js?v=20261023-20';

/** Shared by the owner editor, server and public reader. All prose is plain text. */
export const CONTENT_SCHEMA_VERSION = 2;
export const SECTION_KEYS = Object.freeze(['about', 'work', 'study', 'interests', 'people', 'pets', 'games', 'recommendations']);
export const COURSE_STATUSES = Object.freeze(['completed', 'current', 'planned']);
export const PROJECT_DEMOS = Object.freeze(['', 'syncwallpaper', 'usage-monitor', 'cse-helper', 'wuji-ime', 'perch', 'bibi-keyboard', 'manor']);
export const RECOMMENDATION_DEMOS = Object.freeze(['', 'office-tool-plus', '7-zip', 'sharex', 'super-productivity', 'hypomux', 'lx-music', 'mineradio-local', 'mineradio-original', 'thunderbird', 'libretv', 'winhance', 'bulk-crap-uninstaller', 'crystaldiskinfo', 'crystaldiskmark']);
export const RECOMMENDATION_PLATFORMS = Object.freeze(['windows', 'macos', 'linux', 'web']);
export const ENGLISH_FIELDS = Object.freeze({
  profile: { name: ['姓名', 80], tagline: ['一句话介绍', 300], bio: ['关于我', 12000], nationality: ['国籍', 160], birthplace: ['出生城市', 160], education: ['学历与专业', 500], credential: ['资格与证照', 500], footer: ['页脚文字', 180] },
  sections: { title: ['入口名称', 40], subtitle: ['入口说明', 160] },
  projects: { title: ['作品标题', 160], category: ['作品分类', 80], summary: ['作品简介', 1200], body: ['作品正文', 30000] },
  study: { university: ['学校', 160], major: ['专业', 300], description: ['学习介绍', 12000] },
  courses: { name: ['课程名称', 160], notes: ['课程笔记', 30000] },
  interests: { title: ['兴趣标题', 160], body: ['兴趣正文', 30000] },
  people: { name: ['人物姓名', 160], role: ['人物身份', 160], body: ['人物介绍', 30000] },
  pets: { name: ['宠物名字', 160], description: ['宠物介绍', 12000] },
  games: { title: ['游戏名称', 160], body: ['游戏介绍', 30000], favoriteCharacter: ['喜欢的角色', 160] },
  recommendations: { title: ['项目名称', 160], summary: ['项目简介', 2400], usage: ['使用示例', 5000] },
});

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}格式不正确。`);
  return value;
}
function text(value, label, max, required = false) {
  if (typeof value !== 'string') throw new Error(`${label}需要填写文字。`);
  const clean = value.replace(/\r\n?/g, '\n').trim();
  if (clean.length > max) throw new Error(`${label}最多 ${max} 个字符。`);
  if (required && !clean) throw new Error(`请填写${label}。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(clean) || /<\s*\/?\s*[a-z][^>]*>/i.test(clean)) throw new Error(`${label}只接受纯文字，请移除 HTML 标签。`);
  return clean;
}
function flag(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label}需要为开启或关闭。`);
  return value;
}
function englishFields(source, type) {
  return Object.fromEntries(Object.entries(ENGLISH_FIELDS[type]).map(([key, [label, max]]) => {
    const englishKey = `${key}En`;
    return [englishKey, text(source[englishKey] === undefined ? '' : source[englishKey], `${label}（英文）`, max)];
  }));
}
function option(value, label, choices, fallback) {
  const selected = value === undefined ? fallback : value;
  if (!choices.includes(selected)) throw new Error(`${label}不在可选范围内。`);
  return selected;
}
function email(value) {
  const clean = text(value === undefined ? '' : value, '联系邮箱', 254);
  if (clean && (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean) || /[\\,;:]/.test(clean))) throw new Error('请填写完整的联系邮箱。');
  return clean;
}
function wam(value) {
  const clean = text(value === undefined ? '' : value, '第一学年 WAM', 12);
  if (clean && (!/^\d{1,3}(?:\.\d+)?$/.test(clean) || Number(clean) > 100)) throw new Error('第一学年 WAM 需要为 0 到 100 之间的数值，或留空。');
  return clean;
}
function url(value, label, media = false) {
  const clean = text(value, label, 2048);
  if (!clean) return '';
  if (/[\s\\]/.test(clean)) throw new Error(`${label}不能包含空白或反斜线。`);
  if (media && /^(?:\/?assets\/|\/api\/manor\/media\/)[A-Za-z0-9_./-]+$/.test(clean)) {
    if (clean.split('/').some(part => part === '.' || part === '..')) throw new Error(`${label}包含无效路径。`);
    return clean;
  }
  let parsed;
  try { parsed = new URL(clean); } catch { throw new Error(`${label}需要完整的 http 或 https 地址。`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname) throw new Error(`${label}只接受 http 或 https 地址。`);
  return parsed.href;
}
function httpsSource(value, label) {
  const clean = url(value === undefined ? '' : value, label);
  if (clean && new URL(clean).protocol !== 'https:') throw new Error(`${label}只接受完整的 HTTPS 地址。`);
  return clean;
}

/** Only repository roots are accepted; this helper is also used by the reader. */
export function normalizeGitHubRepository(value) {
  const clean = text(value, 'GitHub 仓库链接', 2048, true);
  const message = '请填写 GitHub 仓库首页链接，例如 https://github.com/owner/repository。';
  if (!/^https:\/\/(?:www\.)?github\.com\//i.test(clean) || /[\s\\]/.test(clean)) throw new Error(message);
  let parsed;
  try { parsed = new URL(clean); } catch { throw new Error(message); }
  if (parsed.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) throw new Error(message);
  // Reject encoded paths and path normalization such as /owner/../owner/repo.
  const path = clean.slice(clean.indexOf('/', clean.indexOf('://') + 3));
  const match = /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100})\/?$/.exec(path);
  if (!match) throw new Error(message);
  const owner = match[1], repository = match[2].replace(/\.git$/i, '');
  const reserved = new Set(['about', 'account', 'apps', 'collections', 'contact', 'dashboard', 'enterprise', 'events', 'explore', 'features', 'gist', 'issues', 'join', 'login', 'logout', 'marketplace', 'new', 'notifications', 'orgs', 'organizations', 'pulls', 'readme', 'search', 'security', 'sessions', 'settings', 'site', 'sponsors', 'topics', 'trending', 'users']);
  if (!repository || repository === '.' || repository === '..' || reserved.has(owner.toLowerCase())) throw new Error(message);
  return `https://github.com/${owner}/${repository}`;
}
function entries(value, label, build, max = 60) {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label}最多可保存 ${max} 项。`);
  const ids = new Set();
  return value.map((item, index) => {
    const entry = build(record(item, `${label}第 ${index + 1} 项`), index);
    if (ids.has(entry.id)) throw new Error(`${label}中有重复的条目标识。`);
    ids.add(entry.id);
    return entry;
  });
}
function id(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value)) throw new Error(`${label}的条目标识不正确。`);
  return value;
}

export function validateContent(input) {
  const source = record(input, '网站内容');
  if (![1, CONTENT_SCHEMA_VERSION].includes(source.schemaVersion)) throw new Error('网站内容版本不受支持。');
  // A legacy document never had this collection. Upgrade only that state, so
  // explicitly empty/deleted v2 content and v1 imports with games stay empty.
  const migrateGames = source.schemaVersion === 1 && source.games === undefined;
  const games = migrateGames ? structuredClone(DEFAULT_GAMES) : source.games === undefined ? [] : source.games;
  let interests = source.interests;
  if (migrateGames && Array.isArray(interests) && interests.length < 60 && !interests.some(item => item?.id === 'gaming' || (typeof item?.title === 'string' && item.title.trim() === '玩游戏'))) {
    interests = [...interests, { id: 'gaming', title: '玩游戏', body: '我喜欢玩游戏。', image: '', visible: true, titleEn: 'Gaming', bodyEn: 'I enjoy playing games.' }];
  }
  const profile = record(source.profile, '个人档案');
  // This requested portrait is a one-time legacy default. A later owner removal
  // stays empty, and an existing nonempty personal image is never replaced.
  const avatar = source.schemaVersion === 1 && (profile.avatar === undefined || (typeof profile.avatar === 'string' && !profile.avatar.trim()))
    ? 'assets/profile/sky-wechat.jpg' : profile.avatar === undefined ? '' : profile.avatar;
  const sectionSource = record(source.sections, '大厅入口');
  const sections = {};
  const optionalSections = { people: { title: '名人墙', subtitle: '', visible: true }, pets: { title: '宠物小屋', subtitle: '我家的宠物与相处时光', visible: true }, games: { title: '游戏合集', subtitle: '我玩的游戏', titleEn: 'Games', subtitleEn: 'Games I play', visible: true }, recommendations: { title: '项目珍藏', subtitle: '我推荐的 GitHub 项目', titleEn: 'GitHub picks', subtitleEn: 'GitHub projects I recommend', visible: true } };
  for (const key of SECTION_KEYS) {
    const section = record(sectionSource[key] === undefined ? optionalSections[key] : sectionSource[key], '大厅入口');
    sections[key] = { title: text(section.title, '入口名称', 40, true), subtitle: text(section.subtitle, '入口说明', 160), visible: flag(section.visible, '入口可见状态'), ...englishFields(section, 'sections') };
  }
  const study = record(source.study, '专业学习');
  const settings = record(source.settings, '展示设置');
  if (typeof settings.musicVolume !== 'number' || !Number.isFinite(settings.musicVolume) || settings.musicVolume < 0 || settings.musicVolume > 1) throw new Error('默认音量需要在 0 到 1 之间。');
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    profile: {
      name: text(profile.name, '姓名', 80, true), tagline: text(profile.tagline, '一句话介绍', 300),
      bio: text(profile.bio, '关于我', 12000), avatar: url(avatar, '头像地址', true), footer: text(profile.footer, '页脚文字', 180),
      education: text(profile.education === undefined ? '' : profile.education, '学历与专业', 500),
      nationality: text(profile.nationality === undefined ? '' : profile.nationality, '国籍', 160),
      birthplace: text(profile.birthplace === undefined ? '' : profile.birthplace, '出生城市', 160),
      firstYearWam: wam(profile.firstYearWam), github: url(profile.github === undefined ? '' : profile.github, 'GitHub 主页'),
      email: email(profile.email), credential: text(profile.credential === undefined ? '' : profile.credential, '资格与证照', 500),
      ...englishFields(profile, 'profile'),
    },
    sections,
    projects: entries(source.projects, '作品集', (project) => {
      if (!Array.isArray(project.images) || project.images.length > 12) throw new Error('每件作品最多添加 12 张图片。');
      return {
        id: id(project.id, '作品'), title: text(project.title, '作品标题', 160, true), category: text(project.category, '作品分类', 80),
        summary: text(project.summary, '作品简介', 1200), body: text(project.body, '作品正文', 30000), cover: url(project.cover, '作品封面', true),
        images: project.images.map(image => url(image, '作品图片', true)).filter(Boolean), url: url(project.url, '作品链接'), visible: flag(project.visible, '作品可见状态'),
        demo: option(project.demo, '作品交互演示', PROJECT_DEMOS, ''),
        ...englishFields(project, 'projects'),
      };
    }),
    study: {
      university: text(study.university, '学校', 160), major: text(study.major, '专业', 300), description: text(study.description, '学习介绍', 12000),
      ...englishFields(study, 'study'),
      courses: entries(study.courses, '课程', (course) => ({ id: id(course.id, '课程'), code: text(course.code, '课程代码', 80), name: text(course.name, '课程名称', 160), notes: text(course.notes, '课程笔记', 30000), visible: flag(course.visible, '课程可见状态'), status: option(course.status, '课程状态', COURSE_STATUSES, 'current'), url: url(course.url === undefined ? '' : course.url, '课程手册链接'), ...englishFields(course, 'courses') })),
    },
    interests: entries(interests, '兴趣爱好', (interest) => ({ id: id(interest.id, '兴趣'), title: text(interest.title, '兴趣标题', 160, true), body: text(interest.body, '兴趣正文', 30000), image: url(interest.image, '兴趣图片', true), visible: flag(interest.visible, '兴趣可见状态'), ...englishFields(interest, 'interests') })),
    people: entries(source.people === undefined ? [] : source.people, '名人墙', (person) => ({ id: id(person.id, '人物'), name: text(person.name, '人物姓名', 160, true), role: text(person.role, '人物身份', 160), body: text(person.body, '人物介绍', 30000), image: url(person.image, '人物照片', true), url: url(person.url, '人物链接'), visible: flag(person.visible, '人物可见状态'), ...englishFields(person, 'people') })),
    pets: entries(source.pets === undefined ? [] : source.pets, '宠物小屋', pet => {
      if (!Array.isArray(pet.photos) || pet.photos.length > 12) throw new Error('每只宠物最多添加 12 张照片。');
      return { id: id(pet.id, '宠物'), name: text(pet.name, '宠物名字', 160, true), description: text(pet.description, '宠物介绍', 12000), photos: pet.photos.map(photo => url(photo, '宠物照片', true)).filter(Boolean), visible: flag(pet.visible, '宠物可见状态'), ...englishFields(pet, 'pets') };
    }, 40),
    games: entries(games, '游戏合集', game => ({
      id: id(game.id, '游戏'), title: text(game.title, '游戏名称', 160, true), body: text(game.body === undefined ? '' : game.body, '游戏介绍', 30000),
      favoriteCharacter: text(game.favoriteCharacter === undefined ? '' : game.favoriteCharacter, '喜欢的角色', 160),
      image: url(game.image === undefined ? '' : game.image, '游戏配图', true), url: url(game.url === undefined ? '' : game.url, '游戏链接'),
      visible: flag(game.visible, '游戏可见状态'), ...englishFields(game, 'games'),
    })),
    recommendations: entries(source.recommendations === undefined ? [] : source.recommendations, '项目珍藏', item => {
      const images = item.images === undefined ? [] : item.images;
      if (!Array.isArray(images) || images.length > 8) throw new Error('每个推荐项目最多添加 8 张图片。');
      const platforms = item.platforms === undefined ? [] : item.platforms;
      if (!Array.isArray(platforms) || platforms.length > 4 || platforms.some(value => !RECOMMENDATION_PLATFORMS.includes(value))) throw new Error('适用系统只能选择 Windows、macOS、Linux 或网页，最多 4 项。');
      return {
        id: id(item.id, '推荐项目'), title: text(item.title, '项目名称', 160, true),
        summary: text(item.summary === undefined ? '' : item.summary, '项目简介', 2400), url: normalizeGitHubRepository(item.url),
        cover: url(item.cover === undefined ? '' : item.cover, '推荐项目封面', true),
        images: images.map(image => url(image, '推荐项目图片', true)).filter(Boolean),
        imageSource: httpsSource(item.imageSource, '图片出处'),
        usage: text(item.usage === undefined ? '' : item.usage, '使用示例', 5000),
        demo: option(item.demo, '推荐项目交互示例', RECOMMENDATION_DEMOS, ''),
        platforms: [...new Set(platforms)],
        visible: flag(item.visible, '推荐项目可见状态'), ...englishFields(item, 'recommendations'),
      };
    }),
    settings: { musicVolume: settings.musicVolume, musicEnabled: flag(settings.musicEnabled, '默认声音设置') },
  };
}
