const STORAGE_KEY = 'sky-language';
let language = 'zh';
try { if (globalThis.localStorage?.getItem(STORAGE_KEY) === 'en') language = 'en'; } catch { /* Browsing works without storage. */ }

// Only published bilingual fields are projected. Missing translations retain
// the owner's original wording; neither links nor unknown fields are rewritten.
const FIELDS = {
  profile: ['name','tagline','bio','education','nationality','birthplace','credential','footer'],
  section: ['title','subtitle'], project: ['title','category','summary','body'],
  study: ['university','major','description'], course: ['name','notes'],
  interest: ['title','body'], person: ['name','role','body'], pet: ['name','description'],
  game: ['title','body','favoriteCharacter'], recommendation: ['title','summary','usage'],
};
export function localizeContent(raw, locale = language) {
  const result = structuredClone(raw);
  if (locale !== 'en') return result;
  const project = (item, fields) => {
    if (!item) return;
    for (const key of fields) if (typeof item[`${key}En`] === 'string' && item[`${key}En`].trim()) item[key] = item[`${key}En`];
  };
  project(result.profile,FIELDS.profile);
  Object.values(result.sections || {}).forEach(item=>project(item,FIELDS.section));
  (result.projects || []).forEach(item=>project(item,FIELDS.project));
  project(result.study,FIELDS.study);
  (result.study?.courses || []).forEach(item=>project(item,FIELDS.course));
  (result.interests || []).forEach(item=>project(item,FIELDS.interest));
  (result.people || []).forEach(item=>project(item,FIELDS.person));
  (result.pets || []).forEach(item=>project(item,FIELDS.pet));
  (result.games || []).forEach(item=>project(item,FIELDS.game));
  (result.recommendations || []).forEach(item=>project(item,FIELDS.recommendation));
  return result;
}

const WORDS = new Map(Object.entries({
  '跳至主要内容':'Skip to content','页面导航':'Page navigation','手机页面导航':'Mobile navigation','场景导航':'Scene navigation',
  '序章':'Prologue','大厅':'Lobby','个人大厅':'Manor lobby','个人档案':'Personal archive','个 人 档 案':'PERSONAL ARCHIVE',
  '关于我':'About me','作品集':'Projects','专业学习':'Studies','兴趣爱好':'Interests','名人墙':'People','宠物小屋':'Pet album',
  '游戏合集':'Games','我玩的游戏':'Games I play','游戏收藏册':'Game collection','游戏合集页面导航':'Game collection navigation','玩游戏':'Gaming',
  '项目珍藏':'GitHub picks','我推荐的 GitHub 项目':'GitHub projects I recommend','GitHub 项目推荐册':'GitHub recommendations','项目珍藏页面导航':'GitHub picks navigation',
  '个人手记':'Personal journal','目录':'Directory','离开大厅':'Leave lobby','返回大厅':'Back to lobby','↶ 返回大厅':'↶ Back to lobby',
  '访客进入庄园':'Enter as a guest','庄园主登录':'Owner sign in','管理庄园':'Manage manor','庄园主管理':'Owner controls',
  '编辑此页':'Edit this page','管理册':'Editor','庄园主':'Owner','返回管理册':'Back to editor',
  '个人档案目录':'Archive directory','直接阅读个人页面':'Browse the archive','大厅中的个人网页入口':'Personal pages in the lobby',
  '进入全屏':'Enter fullscreen','退出全屏':'Exit fullscreen','声音开':'Sound on','声音关':'Sound off',
  '关闭大厅音乐':'Mute lobby music','开启大厅音乐':'Play lobby music','关闭大厅音乐 · 庄园':'Mute lobby music · Manor',
  '关闭声音，包括音乐和音效':'Mute music and sound effects','开启声音，包括音乐和音效':'Enable music and sound effects',
  '关闭声音 · 大厅音乐与原版音效':'Mute lobby music and original sound effects','开启声音 · 大厅音乐与原版音效':'Enable lobby music and original sound effects',
  '减少动效':'Reduce motion','恢复动效':'Restore motion','当前已减少动效':'Reduced motion is on','恢复碎镜动画并进入':'Enter with the glass animation',
  '我喜欢的角色':'MY FAVOURITE CHARACTER','喜欢的角色':'Favourite character','玩具商':'Toy Merchant','安妮 · 莱斯特':'Annie Lester',
  '喜欢的角色：玩具商':'Favourite character: Toy Merchant','玩具商安妮的头像':'Portrait of Annie, the Toy Merchant',
  '第五人格角色玩具商的原版立绘':'Original Identity V artwork of the Toy Merchant',
  '精巧玩具':'Exquisite Toys','乘上木制飞翼':'Ride the Wooden Wings','安妮准备出发':'Annie is ready','安妮正在准备':'Annie is getting ready',
  '玩具还没准备好，请再点一次。':'The toys are not ready yet. Please try again.',
  '行走，靠近物件后按 E 阅读':'Move closer to an object, then press E to read','拖动观察房间 · Q / R 转动视角':'Drag to look around · Q / R to turn',
  '正在点亮侦探的油灯…':'Lighting the detective’s lantern…','阅读档案':'Read archive','回到入口':'Return to entrance',
  '阅读':'Read','靠近':'Approach','房间物件':'a room object','左侧摇杆行走 · 拖动画面观察房间':'Use the left joystick to walk · Drag to look around',
  '移动摇杆，拖动控制侦探':'Movement joystick: drag to move the detective',
  '旧侦探大厅，WASD 或方向键行走，拖动观察房间，靠近物件按 E 阅读':'Original detective lobby. Move with WASD or arrow keys, drag to look around, and press E near an object to read.',
  '画面已暂停，正在恢复大厅…':'The scene is paused. Restoring the lobby…',
  '此浏览器暂不支持三维大厅，可直接点击入口阅读。':'This browser cannot display the 3D lobby. Use the page links to browse.',
  '横屏浏览，进入完整庄园':'Turn your device sideways to explore the manor',
  '当前浏览器不支持网页全屏，可使用浏览器菜单或横屏查看。':'Fullscreen is unavailable. Use your browser menu or rotate your device.',
  '浏览器未允许进入全屏，请在浏览器菜单中开启全屏。':'Fullscreen was not allowed. Enable it from your browser menu.',
  '请点击全屏按钮退出。':'Use the fullscreen button to exit.',
  '大厅音乐暂未播放，请再次点击声音开关。':'The lobby music could not start. Please try the sound button again.',
  '一年级 WAM':'First-year WAM','国籍':'Nationality','出生城市':'Birthplace','联系邮箱':'Email','其他资格':'Other qualification','UNSW Sydney · 学校官网':'UNSW Sydney · Official website',
  '兴趣':'Interests','继续查看作品':'Explore projects','了解更多':'Learn more','名人墙尚未题名':'The wall awaits its stories',
  '重要的人，与他们的故事。':'People who matter, and their stories.','兴趣手记尚未公开。':'No interests have been published yet.',
  '作品尚未公开。':'No projects have been published yet.','课程记录尚未公开。':'No courses have been published yet.',
  '课程人格图':'Course persona tree','按学科排列的课程脉络；点击课程查看详情':'Courses by subject. Select a course for details.',
  '展开专业介绍':'Expand study introduction','本科':'Undergraduate','学习脉络':'Study journey','课程详情':'Course details',
  '返回脉络':'Back to tree','课程记录':'Course record','课程':'Course','查看课程手册':'Open course handbook','按学科分组':'Grouped by subject',
  '已完成':'Completed','正在学习':'In progress','计划学习':'Planned','上一页':'Previous','下一页':'Next',
  '数学':'Mathematics','计算机科学':'Computer science','物理与工程设计':'Physics & design','电气工程':'Electrical engineering',
  '宠物相册尚未展开':'The pet album is waiting','这里将收录它们的介绍与照片。':'Their stories and photographs will live here.',
  '相册':'Album','选择宠物相册':'Choose a pet album','相册目录':'Albums','宠物照片合集':'Pet photographs','相册大图':'Album photograph',
  '宠物介绍与照片合集':'Pet stories and photographs','关闭照片大图':'Close photograph','上一张照片':'Previous photograph','下一张照片':'Next photograph',
  '上一页宠物':'Previous pets','下一页宠物':'Next pets','照片尚未加入相册':'No photographs have been added yet.',
  '这张照片暂时无法显示':'This photograph is unavailable.','查看大图':'Enlarge','选择照片':'Choose a photograph',
  '无法打开私密预览':'Private preview unavailable','正在预览未发布的草稿':'Previewing an unpublished draft',
  '请先用庄园主账号登录，再从管理册重新打开预览。这个页面没有展示草稿。':'Sign in as the owner and reopen the preview from the editor. No draft is displayed here.',
  '选择作品':'Choose a project','交互演示':'Interactive demo','交互示意':'Interactive demo','作品展示':'Project preview','项目说明与图片':'Project notes & images',
  '查看 GitHub 项目 ↗':'View on GitHub ↗','查看 GitHub 源码':'View GitHub source','查看作品 ↗':'View project ↗','桌面工具':'Desktop utility',
  '屏序 SyncWallpaper':'SyncWallpaper','屏序':'SyncWallpaper','概览':'Overview','壁纸组合':'Wallpaper sets','显示器识别':'Displays','壁纸档案库':'Wallpaper library',
  '我的壁纸组合':'My wallpaper sets','自动匹配':'Auto match','主屏':'Main display','副屏':'Second display',
  '暮色秘境':'Twilight manor','深海夜航':'Deep-sea night','晨雾山间':'Misty mountains',
  '双屏已连接 · 已匹配示例组合':'Two displays connected · Demo set matched','断开副屏':'Disconnect display','连接副屏':'Connect display',
  '双屏已连接':'Two displays connected','副屏已断开 · 壁纸已切换':'Display disconnected · Wallpaper updated',
  '检测到副屏 · 自动恢复双屏壁纸':'Display detected · Dual wallpaper restored','副屏已断开 · 主屏壁纸保留':'Display disconnected · Main wallpaper kept',
  '主题':'Theme','秘境':'Manor','石墨':'Graphite','云白':'Cloud',
  '迪迦额度显示器':'Tiga Usage Monitor','演示额度 · 非真实账号':'Demo usage · No real account','迪迦满能量状态':'Tiga at full energy',
  '迪迦石化状态':'Petrified Tiga','迪迦红灯状态':'Tiga at low energy','五小时剩余 · 示例':'5-hour allowance left · Demo',
  '拖动滑块，观察原版人物三种状态':'Move the sliders to see all three character states',
  '示例额度已调整，人物根据两个账号的平均值变化':'Demo usage updated. The character follows the average of both accounts.',
  '切换光能环':'Show energy ring','切换光能条':'Show energy bar','预览石化':'Preview petrification','0% 示例额度 · 石化状态':'0% demo allowance · Petrified',
  'Codex 示例额度':'Codex demo allowance','Claude 示例额度':'Claude demo allowance',
  'CSE 空间助手':'CSE Space Helper','▱  CSE 空间助手':'▱  CSE Space Helper',
  '扫描服务器占用，清理旧开发组件，让作业有地方保存。':'Review storage and clear old development files to make room for coursework.',
  '安全示例数据 · 不连接学校账户':'Sample data · No university account connection',
  '旧版 VS Code Server':'Old VS Code Server','旧开发扩展缓存':'Old extension cache','包管理器下载缓存':'Package download cache',
  '示例存储占用':'Demo storage usage','已清理':'Cleared','扫描示例空间':'Scan demo storage','清理选中项':'Clear selected items',
  '扫描完成 · 勾选要清理的示例缓存':'Scan complete · Select demo cache to clear',
  '示例输入结果':'Demo text output','示例拼音':'Demo pinyin','试试 nihao / wuji / tian':'Try nihao / wuji / tian',
  '清空':'Clear','交互演示 · 示例词表，非完整输入引擎':'Interactive demo · Sample words, not a complete input engine',
  'SKY.无极输入法':'SKY Wuji IME','SPACE · SKY.无极':'SPACE · SKY Wuji',
  '栖窗 Perch':'Perch','点击最小化，再点击任务栏图标还原':'Minimise the window, then restore it from the taskbar',
  '窗口已收拢 · 点击任务栏中的「栖窗」还原':'Window minimised · Select Perch on the taskbar to restore it',
  '最小化演示窗口':'Minimise demo window','窗口动画':'Window animation','动画效果':'Animation effect','现代神奇效果':'Modern genie effect',
  '经典神奇效果':'Classic genie effect','动画时长':'Duration','启用还原动画':'Animate restoration','预览最小化':'Preview minimise',
  '▱ 栖窗':'▱ Perch','窗口已还原 · 可切换效果再次体验':'Window restored · Try another effect','Windows 交互演示':'Windows interaction demo',
  '说点啥':'Say Something','Sky 无极君特供版':'Sky Wuji edition','点击开始，观看一段示例语音转文字。':'Start a sample speech-to-text demonstration.',
  '● 开始示例':'● Start demo','■ 停止示例':'■ Stop demo','正在识别示例语音…':'Transcribing sample speech…',
  '示例已结束，可以重新开始。':'The demo has ended. You can start again.','交互演示 · 播放预设文字，不启用麦克风':'Interactive demo · Preset text, no microphone access',
  'Sky 天的庄园':'Sky Tian’s manor','合上档案':'Close archive','在这里认识 Sky 天，阅读个人档案。':'Meet Sky Tian and read the personal archive.',
  '打开作品档案，亲手体验每个项目。':'Open the project archive and try each interactive demo.',
  '记录重要的人，以及他们的故事。':'People who matter, and the stories they share.','交互演示 · 点击大厅入口':'Interactive demo · Select a lobby entrance',
  '跳过':'Skip','跳过动画':'Skip animation','进入庄园':'Enter the manor','正在准备庄园…':'Preparing the manor…',
  '缪斯印记过场动画':'Muse mark entrance animation','翻开日记':'Opening the journal','原版日记过场':'Original journal transition',
  '正在进入大厅':'Entering the lobby',
}));

export function uiText(source, locale = language) {
  if (locale !== 'en' || typeof source !== 'string') return source;
  const key = source.trim();
  const exact = WORDS.get(key);
  if (exact) return source.replace(key,exact);
  const patterns = [
    [/^(\d+) 门已完成$/,m=>`${m[1]} completed`], [/^(\d+) 门正在学习$/,m=>`${m[1]} in progress`],
    [/^已应用「(暮色秘境|深海夜航|晨雾山间)」示例组合$/,m=>`Applied the “${WORDS.get(m[1])}” demo set`],
    [/^已释放 (\d+) MB 示例空间 · 真实文件未受影响$/,m=>`Freed ${m[1]} MB of demo space · Real files are unchanged`],
  ];
  for (const [pattern,format] of patterns) { const match=key.match(pattern); if(match)return source.replace(key,format(match)); }
  return source;
}
export const getLanguage = () => language;
const contentSelectors = '[data-language-content],.showcase-tab strong,.showcase-tab small,.showcase-identity h3,.showcase-category,.showcase-summary,.showcase-detail-content>p,.showcase-fallback,.persona-university,.persona-degree,.persona-node-name,.persona-node-code,.persona-detail h3,.persona-detail-code,.persona-course-notes,.persona-introduction summary span,.persona-introduction-text,.wuji-entry output,.wuji-candidates';
const attributes = ['aria-label','title','placeholder','alt'];
const textSources = new WeakMap(), attributeSources = new WeakMap();
let observer;

function dynamicUI(source, element, attribute = '') {
  if (language !== 'en') return source;
  let match;
  if (element.closest('.room-interact') && (match=source.match(/^(按 E )?阅读(.+)$/))) return `${match[1] ? 'Press E to read ' : 'Read '}${match[2]}`;
  if (element.closest('.pet-gallery-host') && attribute) {
    if ((match=source.match(/^打开(.+)的相册$/))) return `Open ${match[1]}’s album`;
    if ((match=source.match(/^(.+)的介绍$/))) return `About ${match[1]}`;
    if ((match=source.match(/^(.+)，第(\d+)张照片$/))) return `${match[1]}, photograph ${match[2]}`;
    if ((match=source.match(/^放大(.+)的第(\d+)张照片$/))) return `Enlarge photograph ${match[2]} of ${match[1]}`;
    if ((match=source.match(/^第(\d+)张照片$/))) return `Photograph ${match[1]}`;
  }
  if (element.closest('.persona-node') && attribute && (match=source.match(/^(.*)，(已完成|正在学习|计划学习|课程记录)$/))) return `${match[1]}, ${uiText(match[2])}`;
  if (element.closest('.showcase-gallery') && attribute && (match=source.match(/^(.*) · 图片 (\d+)$/))) return `${match[1]} · Image ${match[2]}`;
  if (element.classList.contains('voice-output')) {
    const chinese='欢迎来到我的庄园。沧海星辰，尽在我手。',english='Welcome to my manor. A sea of stars, within my reach.';
    if (source && chinese.startsWith(source)) return english.slice(0,Math.ceil(english.length*source.length/chinese.length));
  }
  return source;
}

function translateTextNode(node) {
  const element=node.parentElement;
  if (!element || element.closest('script,style,svg,textarea,option[data-language-content]') || element.closest(contentSelectors)) return;
  const before=node.nodeValue;
  const previous=textSources.get(node);
  const source=previous && before===previous.rendered ? previous.source : before;
  const rendered=dynamicUI(uiText(source),element);
  textSources.set(node,{source,rendered});
  if (before!==rendered) node.nodeValue=rendered;
}
function translateAttributes(element) {
  if (element.closest('script,style,svg,.language-toggle')) return;
  let records=attributeSources.get(element);
  if (!records) {records=new Map();attributeSources.set(element,records);}
  for (const attribute of attributes) {
    const before=element.getAttribute(attribute);
    if (before===null)continue;
    const previous=records.get(attribute);
    const source=previous && before===previous.rendered ? previous.source : before;
    const dynamic=dynamicUI(source,element,attribute);
    const rendered=dynamic!==source ? dynamic : element.closest(contentSelectors) ? source : uiText(source);
    records.set(attribute,{source,rendered});
    if(before!==rendered)element.setAttribute(attribute,rendered);
  }
}
function translateSubtree(root) {
  if (!root?.isConnected)return;
  if (root.nodeType===Node.TEXT_NODE) {translateTextNode(root);return;}
  if (root.nodeType!==Node.ELEMENT_NODE)return;
  translateAttributes(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) {
    if(walker.currentNode.nodeType===Node.TEXT_NODE)translateTextNode(walker.currentNode);
    else translateAttributes(walker.currentNode);
  }
}
function updateTitle() {
  const scene=document.querySelector('.game-stage')?.dataset.scene || 'home';
  const data=window.SkyContent?.data;
  const name=data?.profile?.name || 'Sky 天';
  const title=scene==='home' ? uiText('序章') : scene==='lobby' ? uiText('个人大厅') : data?.sections?.[scene]?.title;
  if(title && document.title!==`${name} · ${title}`)document.title=`${name} · ${title}`;
  const caption=document.querySelector('.scene-caption');
  if(caption && data) {
    const value=scene==='home' ? data.profile.footer : scene==='lobby' ? '' : data.sections?.[scene]?.title || '';
    caption.dataset.languageContent='true';
    if(caption.textContent!==value)caption.textContent=value;
  }
}
export function refreshLanguageUI() {
  if(typeof document==='undefined')return;
  document.documentElement.lang=language==='en' ? 'en' : 'zh-CN';
  const button=document.querySelector('.language-toggle');
  if(button) {
    button.setAttribute('aria-label',language==='en' ? 'Switch to Chinese' : 'Switch to English');
    button.title=language==='en' ? '切换到中文' : 'Switch to English';
    button.querySelector('[data-language="zh"]')?.classList.toggle('is-selected',language==='zh');
    button.querySelector('[data-language="en"]')?.classList.toggle('is-selected',language==='en');
  }
  translateSubtree(document.body);updateTitle();
}
export function setLanguage(locale) {
  const next=locale==='en' ? 'en' : 'zh';
  if(next===language)return;
  language=next;
  try { localStorage.setItem(STORAGE_KEY,language); } catch { /* Storage can be disabled. */ }
  document.documentElement.lang=language==='en' ? 'en' : 'zh-CN';
  window.dispatchEvent(new CustomEvent('sky:languagechange',{detail:{language}}));
  refreshLanguageUI();
}

if(typeof document!=='undefined') {
  const initialize=()=>{
    document.querySelector('.language-toggle')?.addEventListener('click',()=>setLanguage(language==='zh'?'en':'zh'));
    refreshLanguageUI();
    observer=new MutationObserver(records=>{
      const roots=new Set();
      for(const record of records) {
        if(record.type==='attributes')translateAttributes(record.target);
        else if(record.type==='characterData')roots.add(record.target);
        else for(const added of record.addedNodes)roots.add(added);
      }
      for(const root of roots)translateSubtree(root);
    });
    // Do not observe per-frame transforms/classes in the 3D lobby.
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
    window.addEventListener('sky:scenechange',()=>queueMicrotask(updateTitle));
    window.addEventListener('sky:contentchange',()=>queueMicrotask(refreshLanguageUI));
  };
  window.SkyLanguage={get language(){return language;},setLanguage,uiText,refresh:refreshLanguageUI};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
}
