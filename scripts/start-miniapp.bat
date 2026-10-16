@echo off
chcp 65001 >nul
rem 双击本文件启动小程序前端编译监听（产物 E:\代码\taro\dist2）。
rem 看到「编译成功 / 监听文件修改中」即为就绪；关掉窗口即停止监听。
cd /d "%~dp0..\..\taro"
echo Building mini-program (weapp) into dist2 ...
"D:\NodeJS\node.exe" "D:\NodeJS\node_modules\npm\bin\npm-cli.js" run dev:weapp
echo.
echo [watcher exited] press any key to close
pause >nul
