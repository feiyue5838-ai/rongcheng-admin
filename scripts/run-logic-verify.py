# -*- coding: utf-8 -*-
"""编译并运行 VerifyOutletLogic，classpath = 刚编译出的 verify-classes + 本地 m2 依赖。
Windows 命令行长度有限，改用 javac/java 的 @argfile（JDK 9+ 两者都支持）。
"""
import os
import subprocess

JDK = r"C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin"
JAVAC = os.path.join(JDK, "javac.exe")
JAVA = os.path.join(JDK, "java.exe")
M2 = r"C:\Users\85428\.m2\repository"
PROJECT = r"E:\代码\java\seal-backend"
CLASSES = os.path.join(PROJECT, "target", "verify-classes")
TMP = r"C:\Users\85428\AppData\Local\Temp\outlet-logic-verify"
SRC = r"E:\代码\admin\scripts\VerifyOutletLogic.java"

jars = []
for root, _d, files in os.walk(M2):
    for f in files:
        if f.endswith(".jar") and "sources" not in f and "javadoc" not in f:
            jars.append(os.path.join(root, f))
cp = ";".join(jars)
os.makedirs(TMP, exist_ok=True)

# argfile 按平台编码解析，中文路径会被破坏 —— 把编译产物复制到纯 ASCII 路径再入 classpath
import shutil
SAFE_CLASSES = os.path.join(TMP, "classes")
if os.path.isdir(SAFE_CLASSES):
    shutil.rmtree(SAFE_CLASSES)
shutil.copytree(CLASSES, SAFE_CLASSES)
print("classes copied:", sum(len(f) for _r, _d, f in os.walk(SAFE_CLASSES)))
CLASSES = SAFE_CLASSES

def write(name, lines):
    p = os.path.join(TMP, name)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return p

a1 = write("javac_args.txt", ["-encoding", "UTF-8", "-nowarn",
                              "-cp", CLASSES + ";" + cp, "-d", TMP, SRC])
r1 = subprocess.run([JAVAC, "@" + a1], capture_output=True, text=True,
                    encoding="utf-8", errors="replace")
print("compile exit:", r1.returncode)
if r1.stderr.strip():
    print(r1.stderr[:2000])

if r1.returncode == 0:
    a2 = write("java_args.txt", ["-cp", TMP + ";" + CLASSES + ";" + cp, "VerifyOutletLogic"])
    r2 = subprocess.run([JAVA, "@" + a2], capture_output=True, text=True,
                        encoding="utf-8", errors="replace")
    print(r2.stdout)
    if r2.stderr.strip():
        print("STDERR:", r2.stderr[:1500])
    print("run exit:", r2.returncode)
