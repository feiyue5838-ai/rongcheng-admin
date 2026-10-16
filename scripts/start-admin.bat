@echo off
chcp 65001 >nul
rem 双击本文件启动管理后台前端（http://localhost:5185）。
rem 窗口保持打开即为运行中，关掉窗口即停服务。
cd /d "%~dp0.."
echo Starting admin dev server on http://localhost:5185 ...
"D:\NodeJS\node.exe" "D:\NodeJS\node_modules\npm\bin\npm-cli.js" run dev -- --host localhost --port 5185 --strictPort
echo.
echo [admin dev exited] press any key to close
pause >nul
