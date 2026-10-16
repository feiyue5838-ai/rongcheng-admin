@echo off
chcp 65001 >nul
rem 双击本文件启动 seal 后端（8080）。窗口保持打开即为服务运行中，关掉窗口即停服务。
rem 凭据自动从 E:\代码\java\runtime\mysql-local\app.env 读取，无需手填。
cd /d "%~dp0..\..\java\seal-backend"
echo Starting seal-backend on http://127.0.0.1:8080 ...
python "%~dp0launch-backend.py"
echo.
echo [backend exited] press any key to close
pause >nul
