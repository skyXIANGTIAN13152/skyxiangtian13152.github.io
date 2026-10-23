@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 20 或更新版本：https://nodejs.org/
  pause
  exit /b 1
)
echo 预览服务启动后，请在浏览器打开 http://127.0.0.1:4173
echo 关闭此窗口将停止预览。
node scripts/serve.mjs
pause
