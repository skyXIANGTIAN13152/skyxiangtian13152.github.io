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

以上三项文件位于 `dist/assets/original/`。其中 `room.jpg` 仅重命名，用于封面等场景；`menu-story.png` 保留为手记图案素材，显示时通过 CSS 容器裁切原入口文字。`dist/assets/muse-reference.png` 来自用户提供的开场印记参考图，封面进入大厅时的「匹配成功」碎镜过场通过本地 CSS 与 SVG 呈现。

### 旧大厅截图与 AI 清理衍生图

- 最终网页文件：`dist/assets/original/lobby-cleaned.png`，分辨率 **1672 × 941**，用于封面之后的旧大厅及相关内页背景。
- 原始游戏截图：**2560 × 1441**，按原生尺寸下载；来源为[豌豆荚上的《第五人格》页面](https://m.wandoujia.com/apps/7683749/7244072810026036214.html)，[直接图片来源](https://android-imgs.25pp.com/fs08/2022/03/22/5/bd29f8b927625d174dcf81400f1be95b.png)。该公开页面为截图来源，不是游戏官方素材授权页。
- 处理方式：使用 AI 图像编辑工具对上述原游戏截图进行清理，移除游戏界面、漂浮菜单文字、键盘提示、聊天、帧率提示、通知红点、右下角悬浮日记，以及中央侦探和其手持灯笼；对被遮挡的房间表面进行补绘。
- 保留目标：以原截图的房间几何、物件位置、镜头、构图、墙面符号和光照为基础保留旧大厅布局。清理图是原截图的编辑衍生图，不是从头生成的新房间，也未使用用户提供的模糊截图作为编辑源。
- 分辨率说明：**2560 × 1441 是源截图尺寸；1672 × 941 是实际交付清理图尺寸**。最终文件不标为原始 2K，也不声称是未修改的原游戏截图。

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
- 播放方式：用户点击后以 35% 音量循环播放；跨场景连续，标签页隐藏时暂停。音量与循环由网页播放器控制，不改动音频文件。
- 权利归属：《第五人格》／网易及对应音乐权利人，作曲王景飞；依据用户声明的原游戏资源使用授权用于此个人主页。该原版曲目不标为免版税或开源素材。
- SHA-256：`749c3b73b54417bbd626df7969d1da286162db826e11569e271f6ad166f38283`。
