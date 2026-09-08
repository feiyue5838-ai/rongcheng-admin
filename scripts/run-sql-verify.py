# -*- coding: utf-8 -*-
"""编译并运行 VerifyOutletSql：mock Mapper 驱动 OutletService，抓取生成的 SQL。
需要 classpath = 刚编译出的 verify-classes + 本地 m2 依赖（含 mockito）。
"""
import os
import shutil
import subprocess

JDK = r"C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin"
JAVAC = os.path.join(JDK, "javac.exe")
JAVA = os.path.join(JDK, "java.exe")
M2 = r"C:\Users\85428\.m2\repository"
PROJECT = r"E:\代码\java\seal-backend"
TMP = r"C:\Users\85428\AppData\Local\Temp\outlet-sql-verify"
SRC = r"E:\代码\admin\scripts\VerifyOutletSql.java"

jars = []
for root, _d, files in os.walk(M2):
    for f in files:
        if f.endswith(".jar") and "sources" not in f and "javadoc" not in f:
            jars.append(os.path.join(root, f))
cp = ";".join(jars)
os.makedirs(TMP, exist_ok=True)

# 中文路径在 @argfile 里会按平台编码解析失败，先复制到纯 ASCII 路径
SAFE = os.path.join(TMP, "classes")
if os.path.isdir(SAFE):
    shutil.rmtree(SAFE)
shutil.copytree(os.path.join(PROJECT, "target", "verify-classes"), SAFE)

with open(os.path.join(TMP, "javac_args.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(["-encoding", "UTF-8", "-nowarn", "-cp", SAFE + ";" + cp, "-d", TMP, SRC]) + "\n")
r1 = subprocess.run([JAVAC, "@" + os.path.join(TMP, "javac_args.txt")],
                    capture_output=True, text=True, encoding="utf-8", errors="replace")
print("compile exit:", r1.returncode)
if r1.stderr.strip():
    print(r1.stderr[:3000])

if r1.returncode == 0:
    with open(os.path.join(TMP, "java_args.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(["-Dfile.encoding=UTF-8", "-cp", TMP + ";" + SAFE + ";" + cp,
                            "VerifyOutletSql"]) + "\n")
    r2 = subprocess.run([JAVA, "@" + os.path.join(TMP, "java_args.txt")],
                        capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(r2.stdout)
    if r2.stderr.strip():
        print("STDERR:", r2.stderr[:2500])
    print("run exit:", r2.returncode)
