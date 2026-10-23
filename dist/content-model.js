/** Shared by the owner editor, server and public reader. All prose is plain text. */
export const CONTENT_SCHEMA_VERSION = 1;
export const SECTION_KEYS = Object.freeze(['about', 'work', 'study', 'interests', 'people', 'pets']);
export const COURSE_STATUSES = Object.freeze(['completed', 'current', 'planned']);
export const PROJECT_DEMOS = Object.freeze(['', 'syncwallpaper', 'usage-monitor', 'cse-helper', 'wuji-ime', 'perch', 'bibi-keyboard', 'manor']);
export const ENGLISH_FIELDS = Object.freeze({
  profile: { name: ['姓名', 80], tagline: ['一句话介绍', 300], bio: ['关于我', 12000], nationality: ['国籍', 160], birthplace: ['出生城市', 160], education: ['学历与专业', 500], credential: ['资格与证照', 500], footer: ['页脚文字', 180] },
  sections: { title: ['入口名称', 40], subtitle: ['入口说明', 160] },
  projects: { title: ['作品标题', 160], category: ['作品分类', 80], summary: ['作品简介', 1200], body: ['作品正文', 30000] },
  study: { university: ['学校', 160], major: ['专业', 300], description: ['学习介绍', 12000] },
  courses: { name: ['课程名称', 160], notes: ['课程笔记', 30000] },
  interests: { title: ['兴趣标题', 160], body: ['兴趣正文', 30000] },
  people: { name: ['人物姓名', 160], role: ['人物身份', 160], body: ['人物介绍', 30000] },
  pets: { name: ['宠物名字', 160], description: ['宠物介绍', 12000] },
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
  if (source.schemaVersion !== CONTENT_SCHEMA_VERSION) throw new Error('网站内容版本不受支持。');
  const profile = record(source.profile, '个人档案');
  const sectionSource = record(source.sections, '大厅入口');
  const sections = {};
  const optionalSections = { people: { title: '名人墙', subtitle: '', visible: true }, pets: { title: '宠物小屋', subtitle: '我家的宠物与相处时光', visible: true } };
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
      bio: text(profile.bio, '关于我', 12000), avatar: url(profile.avatar, '头像地址', true), footer: text(profile.footer, '页脚文字', 180),
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
    interests: entries(source.interests, '兴趣爱好', (interest) => ({ id: id(interest.id, '兴趣'), title: text(interest.title, '兴趣标题', 160, true), body: text(interest.body, '兴趣正文', 30000), image: url(interest.image, '兴趣图片', true), visible: flag(interest.visible, '兴趣可见状态'), ...englishFields(interest, 'interests') })),
    people: entries(source.people === undefined ? [] : source.people, '名人墙', (person) => ({ id: id(person.id, '人物'), name: text(person.name, '人物姓名', 160, true), role: text(person.role, '人物身份', 160), body: text(person.body, '人物介绍', 30000), image: url(person.image, '人物照片', true), url: url(person.url, '人物链接'), visible: flag(person.visible, '人物可见状态'), ...englishFields(person, 'people') })),
    pets: entries(source.pets === undefined ? [] : source.pets, '宠物小屋', pet => {
      if (!Array.isArray(pet.photos) || pet.photos.length > 12) throw new Error('每只宠物最多添加 12 张照片。');
      return { id: id(pet.id, '宠物'), name: text(pet.name, '宠物名字', 160, true), description: text(pet.description, '宠物介绍', 12000), photos: pet.photos.map(photo => url(photo, '宠物照片', true)).filter(Boolean), visible: flag(pet.visible, '宠物可见状态'), ...englishFields(pet, 'pets') };
    }, 40),
    settings: { musicVolume: settings.musicVolume, musicEnabled: flag(settings.musicEnabled, '默认声音设置') },
  };
}
