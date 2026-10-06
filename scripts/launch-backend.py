# -*- coding: utf-8 -*-
"""前台阻塞启动 seal-backend（供 run_in_background 使用，保证进程在后台任务生命周期内常驻）。

凭据来源（2026-09-26 本机加固后）：
- 数据库运行账号：E:\\代码\\java\\runtime\\mysql-local\\app.env（seal_local_app@localhost，仅 DML）
  说明：旧的 seal@localhost 已被安全加固锁定，不能再用于启动。
- JWT 三套密钥：同一 app.env（与生产注入方式一致，不落明文代码）。

用法：python E:/代码/admin/scripts/launch-backend.py
"""
import os
import subprocess
import sys

JAR = r"E:\代码\java\seal-backend\target\seal-backend-1.0.0.jar"
APP_ENV_FILE = r"E:\代码\java\runtime\mysql-local\app.env"
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


if not os.path.exists(APP_ENV_FILE):
    print("缺少本机数据库配置:", APP_ENV_FILE, flush=True)
    sys.exit(2)

env = dict(os.environ)
local = read_env(APP_ENV_FILE)

env["SPRING_PROFILES_ACTIVE"] = "mysql"
env["DB_USERNAME"] = local.get("MYSQL_USERNAME", "")
env["DB_PASSWORD"] = local.get("MYSQL_PASSWORD", "")
for key in ("JWT_SECRET_ADMIN", "JWT_SECRET_USER", "JWT_SECRET_OUTLET"):
    if local.get(key):
        env[key] = local[key]
env["SERVER_PORT"] = env.get("SERVER_PORT", "8080")

missing = [k for k in ("DB_USERNAME", "DB_PASSWORD", "JWT_SECRET_ADMIN",
                       "JWT_SECRET_USER", "JWT_SECRET_OUTLET") if not env.get(k)]
if missing:
    print("配置缺失，无法启动:", ",".join(missing), flush=True)
    sys.exit(2)

print("启动:", JAVA, "-jar", JAR, flush=True)
proc = subprocess.run([JAVA, "-jar", JAR], cwd=r"E:\代码\java\seal-backend",
                      env=env, stdout=sys.stdout, stderr=sys.stderr)
print("java 进程退出, code =", proc.returncode, flush=True)
sys.exit(proc.returncode)
