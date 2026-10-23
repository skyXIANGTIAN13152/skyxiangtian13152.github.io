# 庄园管理册

个人网址：https://skyxiangtian13152.github.io/

管理入口：https://sky-tian-manor-portfolio.perky-berry-1262.chatgpt.site/admin/

## 首次使用

在管理入口选择「首次连接 GitHub」，准备授权后，亲自在 GitHub 确认创建庄园应用。应用由自己的 GitHub 账号持有，只允许数字账号 ID `227148403` 完成设置和登录。随后安装时选择「Only select repositories」，只选 `skyxiangtian13152.github.io`。

应用需要该仓库的 Contents 写入权限以保存公开内容，以及 Actions 读取权限以确认 GitHub Pages 部署结果。网站不会要求输入 GitHub 密码。凭据在云端加密保存，不会进入公开源码或网页。

## 日常维护

使用 GitHub 登录后，可修改个人档案、作品、课程、兴趣和大厅入口。先保存草稿，再预览，确认后发布。更改后的公开内容会由两个网站共同读取；GitHub 静态备份的部署状态单独显示。恢复历史版本只会生成草稿，需要再次发布才对访客生效。

上传支持 JPEG、PNG、WebP、GIF，单张不超过 8 MiB。草稿及未发布的上传图片只有庄园主能读取。发布前关闭条目可见性，会从新公开文档中剔除相应条目；已经发布或被别人保存的旧版本不可能从其设备上收回。

## 架构与维护

- `public/`：游戏前台与管理册静态文件，GitHub Pages 的 `dist/` 镜像来源。
- `server/`：GitHub 授权、私有草稿、发布版本、图片访问控制。
- D1：内容、版本、短期会话和加密的授权配置。R2：图片文件。
- `.openai/hosting.json`：保持原 Sites 项目身份，声明 DB 和 BUCKET。
- `MANOR_SECRET`：仅通过 Sites 运行时秘密配置管理。不要更换它，除非同时准备重新连接 GitHub，因为已有授权资料以它加密。
- GitHub 写入路径固定为 `dist/content/site.json`，主分支 `main`。应用不能通过网站接口修改其他源码路径。

公开访问只读取已发布数据。编辑会话限定在管理站点同源，避免依赖第三方 Cookie。游客访问 GitHub Pages 不需要登录。

## 检查与开发

Node.js 22.13 或更新版本。安装依赖后，`npm run dev` 启动开发预览；`npm run build` 构建 Sites Worker。数据库变更通过 Drizzle 迁移，不能在处理请求时创建表。

`node --test tests/*.test.mjs` 检查真实 SQL 的权限、并发和发布边界。`node scripts/check.mjs public` 检查静态资源。`tests/admin-preview.mjs` 是仅本地的测试适配器，不属于 Worker 或静态发布产物，不连接真实 GitHub；不能作为生产登录入口。
