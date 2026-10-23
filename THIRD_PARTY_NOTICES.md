# 第三方来源与许可

## GSAP

- 组件：GSAP 3.13.0。
- 本地文件：`dist/vendor/gsap.min.js`。
- 来源：[固定版本 npm 分发](https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js)。
- 作者及许可：GreenSock / Webflow；按其 [GSAP Standard License](https://gsap.com/standard-license/) 使用。
- 原始分发文件的版权头保持完整。该 npm 版本未单独包含 LICENSE 文件，因此保存了其原始 `package.json` 与 `README.md` 到 `licenses/`，其中含官方许可链接与声明。

## Cormorant Garamond

- 用途：拉丁字母展示字体，正体和斜体。
- 来源：[Google Fonts](https://fonts.google.com/specimen/Cormorant+Garamond)。
- 许可：SIL Open Font License 1.1，原文见 `licenses/CormorantGaramond-OFL.txt`。
- 使用 Google Fonts 提供的 Latin WOFF2 子集，以本地资源随网站分发。

## Noto Serif SC

- 用途：中文衬线字体。
- 来源：[Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+SC)。
- 许可：SIL Open Font License 1.1，原文见 `licenses/NotoSerifSC-OFL.txt`。
- 使用 Google Fonts 的文本子集服务生成本页用字 WOFF2，以本地资源随网站分发。子集覆盖主页、场景交互、开场动画与飞翼彩蛋的中文用字，字重范围为 400–700。原始返回样式记录在 `licenses/NotoSerifSC-source.css`，用字清单见 `licenses/NotoSerifSC-subset-characters.txt`；这些记录不作为运行时样式使用。

## 《第五人格》视觉素材

页面依据用户指定的 [《第五人格》官方网站](https://www.identityvgame.com/tw/) 和用户提供的缪斯印记图片制作，使用下列官方网页视觉素材与公开发布的原游戏截图。用户声明已取得相关合作授权；本项目据此用于 Sky 天的个人主页。游戏名称、官方图片与其他第三方素材的权利归其各自权利人所有，不因与本网站代码一同分发而转为 MIT 或其他开源许可。本来源记录本身不向第三方授予游戏素材的再利用权。

以下为最终网站保留的官方素材来源记录。

| 本地原始素材名称 | 官方来源 |
| --- | --- |
| `room.jpg` | [场景背景](https://www.identityvgame.com/pc/gw/20210609113612/img/bg2_95b8256.jpg) |
| `menu-story.png` | [故事入口](https://www.identityvgame.com/pc/gw/20210609113612/img/tw/btn_gs_06eb500.png) |
| `frame-feature.png` | [特色边框](https://www.identityvgame.com/pc/gw/20210609113612/img/fea_bg_d3fcd82.png) |

以上三项文件位于 `dist/assets/original/`。其中 `room.jpg` 仅重命名，用于封面等场景；`menu-story.png` 保留为手记图案素材，显示时通过 CSS 容器裁切原入口文字。`dist/assets/muse-reference.png` 来自用户提供的开场印记参考图；当前过场使用下述官方原图序列，此参考图不再用于过场渲染。

### 缪斯印记原版过场

- 文件目录：`dist/assets/muse-original/`，50 张无损 WebP，合计 3,567,260 字节。包括 44 张印记擦拭帧、5 张碎镜帧及磨砂玻璃背景。
- 来源：用户提供的《第五人格》官方 PC 游戏原资源，2026-10-23 仅只读提取必要过场数据；未运行游戏、读取账号或日志。资源路径为 `ui/dm65ui/res/loading.csb`、`system/loading/bg_loading.dds`、`image/ani_loading_symbol/symbol*.dds`、`image/ani_loading_glass/glassbroken*.dds`。资源内容均通过官方 THY 路径索引及 MD5 与包内记录匹配，未使用录屏或网络截图替代。[《第五人格》官网](https://id5.163.com/)公开 Android 包中的同名 ASTC 资源另用于核对，最终网页使用 PC 版材质。
- 原配置 MD5：`3c27128d095de8ec466e4f88ec1a1d0d`。网页按照配置的原坐标、缩放、贴图序列和透明度关键帧播放；原 Cocos 设计画布为 1334×750，速度参数为 0.666700005531311。网页的固定入场连续播放第 48–220 帧，约 4.30 秒；实际游戏加载阶段可能根据加载进度停留更久。
- **实际原图尺寸**：背景 1000×562，印记帧 434×296，碎镜帧 934×525。PC 与 Android 包的原像素尺寸相同，压缩格式不同。游戏原配置将后两者以约 1.43 倍放在画布上；此处沿用原配置，不将素材声称为 1080p、2K 或经过超分辨率处理的图片。
- 处理仅包括 PC 原 BC3/DXT5 数据解码、依据容器记录移除打包边缘，以及无损 WebP 格式转换；转换前后逐像素相等校验通过。没有重绘、生成补帧或额外玻璃飞片。浏览器为适应窗口而缩放原游戏画布。PC 更新版加载配置 MD5 为 `15a2a36f838fa0ed922c4ded6b1f6ee5`，其印记动画轨、坐标、缩放和速度与基础版完全相同；个人主页不包含游戏新增的地图、下载及活动提示节点。
- 每项交付文件的原始尺寸、大小和 SHA-256 记录于 `dist/assets/muse-original/provenance.json`。界面上的个人网站提示及跳过按钮由网页实现，不属于游戏原 UI 资产。
- 权利归属仍为《第五人格》／网易及相关权利人，按用户声明的合作授权用于此个人主页，不标为开源或免版税素材。

### 原版三维大厅渲染背景

- `dist/assets/original/lobby-render.png` 是本项目使用下述原版三维旧大厅数据在浏览器中直接渲染的 **1920 × 1080** 画面，用作内页背景和无法使用 WebGL 时的大厅后备画面。
- 房间几何、原 UV、贴图、摆放和画像姿态均来自原游戏资源，没有 AI 清理、补绘或生成内容。渲染采用本项目的网页灯光与镜面适配，不能等同于原游戏客户端截图。
- 1920 × 1080 是输出画面分辨率，模型纹理仍保持各自的原生分辨率，未进行超分辨率放大。

### 玩具商角色与技能素材

以下四项文件位于 `dist/assets/toy-merchant/`，原图来源为《第五人格》官方角色页面及技能资料。它们沿用上述官方素材的权利归属与项目授权说明。

| 本地文件 | 官方来源与用途 |
| --- | --- |
| `annie-fullbody.png` | [官方角色立绘原图](https://r.res.easebar.com/pic/20210618/586e14fa-f905-42b2-8ebd-d48756cfe660.png)，用于封面玩具商展示 |
| `annie-portrait.png` | [官方角色头像原图](https://r.res.easebar.com/pic/20210618/86d5b405-3fd5-4ae7-9642-c97e62b0206e.png)，用于档案旁的收藏卡 |
| `toybox-skill.png` | [「精巧玩具」官方技能图标](https://id5.res.netease.com/pc/gw/20220408094220/img/jn/qsz/31_w_1_abf5779.png)，用于封面技能装饰 |
| `glider-skill.png` | [「远眺」官方技能图标](https://id5.res.netease.com/pc/gw/20220408094220/img/jn/qsz/31_w_3_dc369ee.png)，用于封面木制飞翼彩蛋入口 |

角色立绘与头像见[官方玩具商角色页](https://www.identityvgame.com/tw/character/hunters/20210618/35349_954581.html)。技能图标及木制飞翼主题依据[官方角色资料页](https://id5.163.com/nrzx/role.html)和该页面的[官方技能数据](https://id5.res.netease.com/pc/gw/20220408094220/js/app/data-gonglue_c4c3873.js)。技能图标分别为复合玩具徽记与滑翔人物剪影；网页中的飞翼运动为本项目实现的交互效果。

## 《第五人格》原版大厅音乐

- 曲名：**《庄园》**；作曲：**王景飞**。
- 本地文件：`dist/assets/audio/identity-v-manor.mp3`。
- 官方来源：[《第五人格》音乐欣赏页](https://id5.163.com/nrzx/music.html)，该页面的[官方曲目数据](https://id5.res.netease.com/pc/gw/20220408094220/js/app/data_649e392.js)中，`musicData` 的 `id: 3` 条目将此文件标记为《庄园》，作者为王景飞。
- 下载地址：[网易官方 MP3 文件](https://nie.v.netease.com/nie/2020/1201/dfbe5023a66dcad566e991f9ecbe9601.mp3)。[BWIKI 曲目资料](https://wiki.biligame.com/dwrg/%E9%9F%B3%E4%B9%90_%E5%BA%84%E5%9B%AD)另将其记为登录后默认画面的场景音乐。
- 文件信息：约 120.03 秒，MP3，320 kbps，44.1 kHz，双声道，4,801,770 字节。直接保留官方文件字节，未转码、剪辑或合成。
- 播放方式：默认启用，以 35% 音量循环播放；浏览器拦截自动播放时在首次点击或按键后开始；跨场景连续，标签页隐藏时暂停。音量与循环由网页播放器控制，不改动音频文件。
- 权利归属：《第五人格》／网易及对应音乐权利人，作曲王景飞；依据用户声明的原游戏资源使用授权用于此个人主页。该原版曲目不标为免版税或开源素材。
- SHA-256：`749c3b73b54417bbd626df7969d1da286162db826e11569e271f6ad166f38283`。


## 原版三维旧大厅存档资源

- 原旧大厅 `dm65_main` 的场景、模型、材质及五张原光照图来自《第五人格》国际服版本 `1.0.1032449`（version code 83）的 2022 年资源存档。实际取得地址为 [Appsanny 版本存档页](https://www.appsanny.com/version/com.netease.idv.googleplay)公开链接的 [XAPK 存档](https://dl.appsanny.com/apk/com.netease.idv.googleplay1.0.1032449.xapk)。**这是公开镜像来源，不是网易官网直接下载，也不把镜像页面视作游戏素材授权页。**
- 仅通过 HTTP 分段读取目录与所需资源：`res/scene/model/dm65_main.npk`（11,249,000 字节）、`res/scene/scene_battle/dm65_main.npk`（3,371,276 字节），另从 `res/tex_critical.mini.npk` 读取地板报纸贴图的索引和单项数据；没有下载整个 2.2 GB 存档，也没有执行游戏或安装包。两个完整房间 NPK 的 ZIP CRC32 与长度校验通过，逐项路径签名、内容 MD5 及来源记录保存在研究目录中。
- 几何、原 UV、原摆放参数与光照图布局来自原资源；转换为浏览器可读取的格式时不凭截图补绘或生成替代房间。三件在当前版本中缺失的关键原模型，已经以原 NPK 路径签名及对应 GIM 的包围盒、子网格数、骨骼信息双重核验。贴图沿用原像素尺寸，不称为 2K/4K 重制或超分辨率版本。
- 模型包 SHA-256：`8af5f8b85299af7de868333afff834f258f8aa8515c690dbecd209b59527196f`；场景包 SHA-256：`806770ff1c566201b51e59554071675da44237487050c6fd18b49b9f3d0b480d`。完整存档只读取了必要片段，因此未声称核验完整 XAPK 的内容哈希。
- 素材权利归《第五人格》／网易及相关权利人所有，按用户声明的合作授权用于个人主页；存档来源、解析和格式转换均不改变其权利归属。
- 网页房间保留 125 个原场景实例、73 个原模型和五张 1024 × 1024 原光照图；所有需要的纹理均已补齐。地面画像使用原 `idle_2` 动作的最终骨骼姿态，原 `take_off` 结束姿态与其一致。
- 色彩处理采用原 `dm65_main` 的 16³ LUT（以 256 × 16 PNG 保存），不以另设滤镜替换原 LUT。22 个原点光／聚光保留源位置、颜色、强度与范围；网页着色器按原公式适配。原引擎完整的灯光枚举与选择机制未全部恢复，网页依据原优先级、范围及强度选择每物件最多四个点光和一个聚光。
- 墙面缪斯印记来自原 `mark_006.tga`（128 × 128）与 `miusibiaozhi_01.sfx` 场景项；原 NXBI 的 14 单位尺寸、RGBA=(134,54,53,165) 及场景位置、旋转和缩放已核对。网页用透明墙面四边形适配原粒子朝向与混合方式。
- 四处烛火沿用原火焰表面与纹理。为在网页中呈现烛光，另在原火焰中心加入四个暖色补光：颜色取自原火焰贴图，范围 2.25 米、强度 1.2 为网页适配值，不声称是原场景灯光参数。镜面使用原玻璃几何、遮罩和 0.6 反射系数进行浏览器平面反射适配；未声称复原原引擎全部 Bloom、景深或暗角处理。


## 原版三维旧侦探

- `dist/assets/detective/original-detective.glb`：从用户提供的官方 PC 安装资源只读转换。保留原模型的 9,076 个顶点、8,920 个三角面、75 根骨骼、原 UV、蒙皮权重和原 PC 贴图。原生贴图为 256×256 至 512×512，未生成、放大重绘或替换人物外观。
- 骨骼动画来自原 `hall_idle_2.cpdanimation`（6.3333 秒）与 `hall_walk_2.cpdanimation`（3.6 秒）。保留原始关键帧，仅转换为 glTF 播放格式；网页负责方向控制、移动与原动作间过渡。
- 油灯光源锚点来自 `detective.gim` 中 `bone003` 的原 Socket_0。
- 素材仍归《第五人格》／网易及相关权利人所有，按用户声明的合作授权用于个人主页。

## Three.js

WebGL 渲染与 glTF 加载使用 Three.js 0.186.1（MIT），本地分发以保证首次打开无需第三方 CDN。许可证见 `licenses/three-MIT.txt`。
