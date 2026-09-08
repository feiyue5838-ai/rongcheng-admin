# -*- coding: utf-8 -*-
"""用 javac 手工编译 seal-backend 的 src/main/java，验证代码可编译（本机无 maven）。
注意：javac @argfile 不支持嵌套 @file，且 argfile 读的是平台编码，故一律用相对路径 + cwd 切到项目根。
"""
import os
import subprocess
import sys

JDK = r"C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin"
JAVAC = os.path.join(JDK, "javac.exe")
M2 = r"C:\Users\85428\.m2\repository"
PROJECT = r"E:\代码\java\seal-backend"

jars = []
for root, _dirs, files in os.walk(M2):
    for f in files:
        if f.endswith(".jar") and "sources" not in f and "javadoc" not in f:
            jars.append(os.path.join(root, f).replace("\\", "/"))
print("jars:", len(jars))

sources = []
for root, _dirs, files in os.walk(os.path.join(PROJECT, "src", "main", "java")):
    for f in files:
        if f.endswith(".java"):
            rel = os.path.relpath(os.path.join(root, f), PROJECT).replace("\\", "/")
            sources.append(rel)
print("sources:", len(sources))

os.makedirs(os.path.join(PROJECT, "target", "verify-classes"), exist_ok=True)

args = ["-encoding", "UTF-8", "-nowarn", "-proc:full",
        "-cp", ";".join(jars),
        "-d", "target/verify-classes"] + sources

argfile = os.path.join(PROJECT, "_verify_args.txt")
with open(argfile, "w", encoding="utf-8") as fh:
    fh.write("\n".join(args) + "\n")

proc = subprocess.run([JAVAC, "@_verify_args.txt"], cwd=PROJECT,
                      capture_output=True, text=True, encoding="utf-8", errors="replace")
err = (proc.stderr or "") + (proc.stdout or "")
lines = [ln for ln in err.splitlines() if ln.strip()]
print("exit:", proc.returncode)
print("output lines:", len(lines))
for ln in lines[:80]:
    print(ln)
sys.exit(0)
