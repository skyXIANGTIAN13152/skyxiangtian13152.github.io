# EdgeOne Pages Git 自动部署

使用现有仓库 `skyXIANGTIAN13152/skyxiangtian13152.github.io`，不需要复制一份源码或重新制作网页。
根目录 `edgeone.json` 已声明部署设置，网站产物在 `dist`；只检查现有产物，不安装依赖。

## 已关联的项目

- 腾讯云项目：`sky-tian-manor`（`makers-hjhklefwrigo`）。
- [项目概览](https://console.cloud.tencent.com/edgeone/makers/project/makers-hjhklefwrigo/index)
- [访问网站](https://sky-tian-manor-aogvwszi.edgeone.dev/)
- Git 来源：本仓库 `main` 分支；生产环境自动部署已开启。
- 加速区域：全球可用区（不含中国大陆）。
- 首次部署：`dp8h9xczdy4a`，提交 `1d0ca0686c1c6c16e55457784292dac61a5c26e9`，构建及部署成功。

项目网址始终跟随最新生产部署；带部署编号的地址仅代表那一次构建，请分享上面的项目网址。
依照[腾讯云域名说明](https://cloud.tencent.com/document/product/1552/127403)，默认域名在非中国大陆网络可直接访问；
中国大陆网络使用默认域名有预览链接及有效期限制。面向中国大陆长期分享应绑定自己的域名，
本项目所选加速区域添加自定义域名无需备案。平台并不保证永久免费或永久托管。

## 首次连接

1. 在原腾讯云账号进入 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)。
2. 保留原来的直接上传项目，创建新的「导入 Git 仓库」项目。
3. 连接 GitHub 时，只选择 `skyxiangtian13152.github.io` 仓库。
4. 设置生产分支 `main`、框架「其他 / Other」、根目录 `./`。
5. 确认输出目录 `dist`、构建命令 `npm run check`、Node.js `22.11.0`。安装命令由配置文件覆盖，无需下载依赖。
6. 选择需要的加速区域、完成首次部署，检查返回的正式网址及部署记录中的提交。

不要选模板克隆或直接上传；应将当前仓库作为 Git 来源关联。
GitHub `main` 更新后由 EdgeOne 自动创建新部署。测试这条连接时，应确认更新后的提交出现在 EdgeOne 部署历史中。

## 原网址和庄园主管理

直接上传的旧项目无法原地改成 Git 集成。新项目会分配新默认域名；旧项目和旧默认网址继续保留。
如已使用自定义域名，应在新项目验证正常后再处理域名绑定。

管理后台仍为：
`https://sky-tian-manor-portfolio.perky-berry-1262.chatgpt.site/admin/`

`dist/admin/index.html` 会跳转到现有安全后台。已发布内容的 GitHub 快照保存在 `dist/content/site.json`，
庄园主发布时更新这个文件，也会触发关联的 EdgeOne 项目自动部署。

新项目网址同时接入现有管理后台的公开内容：

- `content-client.js` 用确切项目网址识别静态镜像，读取原管理后台的公开内容和图片。
- 原后台仅在公开内容和公开图片的 CORS 白名单中加入该确切域名。
- 管理操作继续在原后台同源完成，不开放编辑、草稿或登录会话跨域权限。

## 官方说明

- [Git 仓库导入与自动部署](https://pages.edgeone.ai/document/importing-a-git-repository)
- [直接上传项目不能切换 Git 集成](https://edgeone.ai/document/173731777484574720)
- [edgeone.json 构建配置](https://edgeone.cloud.tencent.com/pages/document/162936771610066944)

后续修改本仓库的 `main` 分支，或通过庄园主管理册发布内容，均会触发新的生产部署。
如需确认同步情况，在腾讯云「构建部署」中检查提交编号是否与 GitHub 最新提交一致。
