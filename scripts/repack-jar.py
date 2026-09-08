#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确重打包 seal-backend jar：
- 只替换/新增 git 中已改动 .java 对应的 class（28 个条目）
- 其余条目原样复制，保持 STORED/DEFLATE 压缩方式不变
- 先写到临时文件，验证通过后再替换正式 jar
"""
import zipfile, os, shutil, subprocess, sys

PROJECT = r"E:/代码/java/seal-backend"
JAR = os.path.join(PROJECT, "target", "seal-backend-1.0.0.jar")
OUT = os.path.join(PROJECT, "target", "seal-backend-1.0.0.jar.new")
CLASSES = r"C:/Users/85428/AppData/Local/Temp/seal-restart/app/BOOT-INF/classes"

def git_changed_java_files():
    mod = subprocess.run(["git", "diff", "--name-only"], cwd=PROJECT,
                         capture_output=True, text=True).stdout.split()
    unt = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"],
                         cwd=PROJECT, capture_output=True, text=True).stdout.split()
    return [f for f in mod + unt
            if f.endswith(".java") and f.startswith("src/main/java/")]

def java_to_class_prefix(jf):
    rel = jf[len("src/main/java/"):-len(".java")]
    return "BOOT-INF/classes/" + rel

def main():
    z = zipfile.ZipFile(JAR, "r")
    names = set(z.namelist())

    # 计算目标 class 条目（更新 + 新增）
    targets = []  # (jar条目名, 源文件绝对路径或 None 表示新增用临时class)
    for jf in git_changed_java_files():
        prefix = java_to_class_prefix(jf)
        matched = [n for n in names
                   if n == prefix + ".class" or n.startswith(prefix + "$")]
        for m in matched:
            targets.append(m)
        if not matched:
            targets.append(prefix + ".class")

    targets = sorted(set(targets))
    print("目标 class 条目数:", len(targets))

    # 校验：每个 target 的 class 都能在临时编译目录找到
    missing = []
    for t in targets:
        rel = t[len("BOOT-INF/classes/"):]
        fp = os.path.join(CLASSES, rel.replace("/", os.sep))
        if not os.path.exists(fp):
            missing.append((t, fp))
    if missing:
        print("!! 以下 class 在临时编译目录中缺失，无法打包:")
        for t, fp in missing:
            print("  ", t)
        sys.exit(1)

    target_set = set(targets)
    new_data = {}
    for t in targets:
        rel = t[len("BOOT-INF/classes/"):]
        fp = os.path.join(CLASSES, rel.replace("/", os.sep))
        new_data[t] = open(fp, "rb").read()

    # 写新 jar
    replaced = 0
    added = 0
    kept = 0
    written = set()
    with zipfile.ZipFile(OUT, "w") as zout:
        for info in z.infolist():
            data = z.read(info.filename)
            if info.filename in target_set:
                data = new_data[info.filename]
                replaced += 1
                # 重新以 DEFLATE 写入（class 原就是 DEFLATE）
                zi = zipfile.ZipInfo(info.filename)
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = info.external_attr
                zi.create_system = info.create_system
                zi.date_time = info.date_time
                zout.writestr(zi, data)
            else:
                # 原样保留：压缩方式、属性、时间都复制
                zi = zipfile.ZipInfo(info.filename)
                zi.compress_type = info.compress_type
                zi.external_attr = info.external_attr
                zi.create_system = info.create_system
                zi.date_time = info.date_time
                zi.extra = info.extra
                zi.comment = info.comment
                zout.writestr(zi, data)
                kept += 1
            written.add(info.filename)

        # 追加原 jar 中不存在的新增条目（如 BusinessTypeController）
        for t in targets:
            if t not in written:
                zi = zipfile.ZipInfo(t)
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.date_time = (2026, 9, 7, 16, 0, 0)
                zout.writestr(zi, new_data[t])
                added += 1
                written.add(t)

    print(f"替换 {replaced} 个, 新增 {added} 个, 保留 {kept} 个")
    z.close()

    # 校验新 jar
    zn = zipfile.ZipFile(OUT, "r")
    # 1. BusinessTypeController 已加入
    print("BusinessTypeController 已加入:", "BOOT-INF/classes/com/rongcheng/seal/controller/BusinessTypeController.class" in zn.namelist())
    # 2. lib 仍为 STORED
    lib_stored = sum(1 for i in zn.infolist()
                     if i.filename.startswith("BOOT-INF/lib/") and i.filename.endswith(".jar") and i.compress_type == 0)
    print("lib 中 STORED 的嵌套 jar 数(应=84):", lib_stored)
    # 3. 条目总数不变 + 新增 1
    print("原条目数:", len(names), "新条目数:", len(zn.namelist()))
    zn.close()
    print("输出:", OUT)

if __name__ == "__main__":
    main()
