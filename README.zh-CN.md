# Sky 天 · 个人主页

网站地址：[skyxiangtian13152.github.io](https://skyxiangtian13152.github.io/)  
代码仓库：[skyXIANGTIAN13152/skyxiangtian13152.github.io](https://github.com/skyXIANGTIAN13152/skyxiangtian13152.github.io)

以 Sky 天与玩具商的封面、缪斯印记碎镜过场、《第五人格》旧大厅和双页手记组成的中文个人主页。采用桌面优先的 16:9 游戏式场景，个人信息、课程和项目来自本人提供的内容。

## 浏览方式

推荐使用电脑横屏浏览，也可点击右上角的全屏按钮。画面以 1280 × 720 为设计尺寸，在不同窗口中保持 16:9 等比缩放，周围按需留黑边；页面不依赖上下滚动。

打开网站先看到 Sky 天与玩具商的封面。点击「点击进入游戏」，画面显示「匹配成功」并播放缪斯印记碎镜过场，然后进入旧大厅。封面与大厅是两个独立场景；左上角 Sky 天标志可返回封面。

完整打开分享链接或刷新页面时，都会从封面开始；即使链接带有 `#lobby` 或其他内页位置，也不会跳过封面。进入大厅后，点击「离开大厅」可回到封面，再次点击「点击进入游戏」可重新进入。

进入大厅后，四个入口分布在房间中。鼠标悬停或使用键盘选中入口时会出现高亮，点击文字即可进入对应内页：

| 大厅入口 | 内页内容 |
| --- | --- |
| 关于我 | 原有双页个人手记与个人介绍 |
| 作品集 | SyncWallpaper 项目介绍、双屏连接交互示意与真实 GitHub 链接 |
| 专业学习 | UNSW Quantum Engineering & Computer Science，以及 ELEC2134、COMP2521、MATH2069 三门当前课程 |
| 兴趣爱好 | Codex 兴趣页面 |

内页顶部导航与底部进度标记可切换场景；也可点击「返回大厅」或按 Escape 回到房间。关于我页面仍可通过「继续查看作品」进入作品场景。

玩具商原版立绘保留在封面，封面上的「放飞木制飞翼」可触发短暂的滑翔彩蛋；打开档案后，可在双页手记旁看到玩具商头像收藏卡。游戏角色均有明确标注，与 Sky 的个人身份区分。

手机上保留同一横屏画面，375px 宽度下等比缩放、不产生横向滚动。竖屏时显示横屏观看提示；转为横屏可获得更大的画面。当前设计按横屏场景呈现，不会转换为竖向长页面。

## 直接在电脑上打开

1. 解压整个项目。
2. 打开 `dist` 文件夹，双击 `index.html`。
3. 保留同一文件夹内的样式、脚本、字体和图片；无需安装依赖或联网下载资源。

网页中的 GitHub 项目链接需要网络连接。所有视觉效果、字体、动画库与大厅音乐均包含在项目内。

## 本地预览

如电脑已安装 Node.js 20 或更新版本，在项目文件夹打开终端，运行：

```text
npm start
```

浏览器打开 **http://127.0.0.1:4173**。按 `Ctrl+C` 停止预览。若端口被占用，运行 `npm start -- 4174`，然后打开对应端口。

无需运行 `npm install`，也无需构建。`dist` 中的文件就是最终网站。

## 部署到 GitHub Pages

1. 将本项目完整上传到 GitHub 仓库的 `main` 分支。仓库根目录应直接包含 `dist`、`scripts`、`package.json` 和 `.github`，不要再套一层文件夹。若使用 GitHub Desktop，提交时确保 `.github/workflows/pages.yml` 也被包含。
2. 在 GitHub 仓库打开 **Settings → Pages**。
3. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
4. 打开 **Actions → Publish Sky homepage → Run workflow**，选择 `main` 后运行。以后每次向 `main` 推送修改会自动更新网站。
5. 等待部署任务出现绿色对勾，在 **Settings → Pages** 打开生成的网站地址。

普通项目仓库和个人主页仓库都可使用，资源采用相对路径，无需调整仓库名前缀。若仓库的默认分支不是 `main`，将 `.github/workflows/pages.yml` 中的 `branches: [main]` 改为实际分支名。

此流程依据 [GitHub 官方自定义 Pages 工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 文件说明

| 位置 | 用途 |
| --- | --- |
| `dist/index.html` | 页面内容与结构 |
| `dist/style.css`、`dist/scenes.css` | 基础视觉与固定 16:9 场景版式 |
| `dist/lobby.css` | 旧大厅背景、四个房间入口与封面衔接 |
| `dist/details.css` | 专业学习、兴趣爱好两张内页 |
| `dist/app.js` | 场景切换、全屏、声音与作品示意交互 |
| `dist/loader.css`、`dist/loader.js` | 缪斯印记碎裂过场 |
| `dist/toys.css`、`dist/toys.js` | 木制飞翼点击彩蛋 |
| `dist/assets` | 本地图片、字体等资源 |
| `dist/assets/audio/identity-v-manor.mp3` | 《第五人格》原版大厅音乐《庄园》 |
| `dist/vendor/gsap.min.js` | 固定版本的 GSAP 3.13.0 |
| `.github/workflows/pages.yml` | GitHub Pages 自动发布流程 |
| `scripts/serve.mjs` | 仅监听本机的零依赖预览服务 |
| `scripts/check.mjs` | 检查静态资源引用与 JavaScript 语法 |
| `THIRD_PARTY_NOTICES.md`、`licenses` | 第三方来源与许可记录 |

## 修改与检查

修改 `dist` 内相应文件后刷新浏览器即可。发布前可运行：

```text
npm run check
```

中文字体包含目前页面用字的轻量子集。新增其他汉字时会使用系统宋体作为后备；如希望完全一致，可重新生成 Noto Serif SC 子集。

网站不使用账号系统、表单、分析统计或服务端接口。个人介绍使用 Sky 天、UNSW 学习信息、playing codex 兴趣和 SyncWallpaper 项目资料；玩具商作为游戏角色主题元素展示。

## 入场动画与声音

在封面点击「点击进入游戏」时，会播放约 2.7 秒的「匹配成功」缪斯印记碎镜动画；可按「跳过」或 Escape 直接进入大厅。底部「减少动效／恢复动效」会保存本机偏好，首次访问遵循系统的减少动态效果设置。启用动效后，大厅右下方的「重播过场」可再次播放。

系统开启减少动态效果时，网站默认跳过碎镜动画，封面会显示「当前已减少动效」。点击旁边的「恢复碎镜动画并进入」可一键恢复动画并进入大厅；这项手动选择会保存到当前浏览器，后续访问沿用所选偏好。

大厅音乐使用《第五人格》原版曲目《庄园》（王景飞），默认关闭。点击右上角声音按钮后，以 35% 音量循环播放，切换封面、大厅和内页时保持连续；切换到其他标签页会自动暂停，返回后在音乐仍开启的情况下继续播放。再次点击声音按钮即可关闭。

作品区为明确标注的交互示意，不是在网页中运行桌面应用。点击「断开副屏／连接副屏」即可查看示意变化；真实项目通过 GitHub 按钮打开。
