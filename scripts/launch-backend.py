# -*- coding: utf-8 -*-
"""前台阻塞启动 seal-backend（供 run_in_background 使用，保证进程在后台任务生命周期内常驻）。
从 D:/rongcheng-admin/server/.env 读 JWT 密钥，设置 DB 环境变量后 java -jar 前台运行。
"""
import os
import subprocess
import sys

JAR = r"E:\代码\java\seal-backend\target\seal-backend-1.0.0.jar"
ENV_FILE = r"D:\rongcheng-admin\server\.env"
JAVA = r"C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin\java.exe"

def read_env(path):
    d = {}
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip()
            if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
                v = v[1:-1]
            d[k] = v
    return d

env = dict(os.environ)
env.update(read_env(ENV_FILE))

env["SPRING_PROFILES_ACTIVE"] = "mysql"
env["DB_USERNAME"] = "seal"
env["DB_PASSWORD"] = "seal123456"
env["SERVER_PORT"] = "8080"
# 应用要求 JWT_SECRET_USER（NestJS .env 键名为 JWT_SECRET）
if "JWT_SECRET_USER" not in env and "JWT_SECRET" in env:
    env["JWT_SECRET_USER"] = env["JWT_SECRET"]

print("启动:", JAVA, "-jar", JAR, flush=True)
proc = subprocess.run([JAVA, "-jar", JAR], cwd=r"E:\代码\java\seal-backend",
                      env=env, stdout=sys.stdout, stderr=sys.stderr)
print("java 进程退出, code =", proc.returncode, flush=True)
sys.exit(proc.returncode)
