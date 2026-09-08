# -*- coding: utf-8 -*-
"""重启准备：备份 jar → 解压到 ASCII 路径 → 用 javac 全量编译 src 覆盖 BOOT-INF/classes。
不碰正在运行的 8080，只做静态准备。
"""
import os
import shutil
import zipfile
import subprocess
import datetime

JDK = r"C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin"
JAVAC = os.path.join(JDK, "javac.exe")
PROJECT = r"E:\代码\java\seal-backend"
JAR = os.path.join(PROJECT, "target", "seal-backend-1.0.0.jar")
STAGE = r"C:\Users\85428\AppData\Local\Temp\seal-restart"
APP = os.path.join(STAGE, "app")
CLASSES = os.path.join(APP, "BOOT-INF", "classes")
LIB = os.path.join(APP, "BOOT-INF", "lib")

# 1. 备份（只备一次）
bak = os.path.join(PROJECT, "target",
                   "seal-backend-1.0.0.jar.bak-" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S"))
if not os.path.exists(bak):
    shutil.copy2(JAR, bak)
print("备份 jar:", bak)

# 2. 解压
if os.path.isdir(APP):
    shutil.rmtree(APP)
os.makedirs(APP, exist_ok=True)
with zipfile.ZipFile(JAR) as z:
    z.extractall(APP)
print("解压完成, BOOT-INF/classes 条目:", sum(1 for i in zipfile.ZipFile(JAR).infolist()
                                          if i.filename.startswith("BOOT-INF/classes/")))

# 3. 编译 src/main/java → CLASSES（相对路径，避免 argfile 中文路径被平台编码破坏）
# 编译期 classpath 用 m2 全量仓库（含 lombok 等 provided 依赖），运行时才用 fat jar 的 BOOT-INF/lib
M2 = r"C:\Users\85428\.m2\repository"
m2jars = []
for root, _d, files in os.walk(M2):
    for f in files:
        if f.endswith(".jar") and "sources" not in f and "javadoc" not in f:
            m2jars.append(os.path.join(root, f).replace("\\", "/"))
print("m2 依赖:", len(m2jars))

src = os.path.join(PROJECT, "src", "main", "java")
sources = []
for root, _d, files in os.walk(src):
    for f in files:
        if f.endswith(".java"):
            sources.append(os.path.relpath(os.path.join(root, f), PROJECT).replace("\\", "/"))
print("源文件:", len(sources))

cp = CLASSES.replace("\\", "/") + ";" + ";".join(m2jars)
d = CLASSES.replace("\\", "/")
args = ["-encoding", "UTF-8", "-nowarn", "-proc:full", "-parameters", "-cp", cp, "-d", d] + sources

argfile = os.path.join(STAGE, "compile_args.txt")
with open(argfile, "w", encoding="utf-8") as fh:
    fh.write("\n".join(args) + "\n")

proc = subprocess.run([JAVAC, "@" + argfile], cwd=PROJECT,
                      capture_output=True, text=True, encoding="utf-8", errors="replace")
err = (proc.stderr or "") + (proc.stdout or "")
lines = [ln for ln in err.splitlines() if ln.strip()]
print("compile exit:", proc.returncode)
print("输出行数:", len(lines))
for ln in lines[:60]:
    print(ln)
print("DONE")
