#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全量重打包：把重新编译（含 -parameters）后的 BOOT-INF/classes 全部 class 替换进 jar。
- BOOT-INF/classes 下的 .class 全部替换为新编译版本
- BOOT-INF/lib 的 84 个 STORED 嵌套 jar 原样保留
- 其余非 class 资源（yml/sql 等）原样保留
"""
import zipfile, os

JAR = r"E:/代码/java/seal-backend/target/seal-backend-1.0.0.jar"
OUT = r"E:/代码/java/seal-backend/target/seal-backend-1.0.0.jar.new"
CLASSES = r"C:/Users/85428/AppData/Local/Temp/seal-restart/app/BOOT-INF/classes"

def main():
    z = zipfile.ZipFile(JAR, "r")

    # 收集新编译的所有 class
    new_classes = {}
    for root, _d, files in os.walk(CLASSES):
        for f in files:
            if f.endswith(".class"):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, CLASSES).replace("\\", "/")
                new_classes["BOOT-INF/classes/" + rel] = full
    print("新编译 class 数:", len(new_classes))

    replaced = 0
    kept = 0
    added = 0
    written = set()
    with zipfile.ZipFile(OUT, "w") as zout:
        for info in z.infolist():
            data = z.read(info.filename)
            if info.filename in new_classes:
                with open(new_classes[info.filename], "rb") as fh:
                    data = fh.read()
                zi = zipfile.ZipInfo(info.filename)
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = info.external_attr
                zi.create_system = info.create_system
                zi.date_time = info.date_time
                zout.writestr(zi, data)
                replaced += 1
            else:
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

        # 追加 jar 中不存在的新增 class（如 BusinessTypeController）
        for name, full in new_classes.items():
            if name not in written:
                with open(full, "rb") as fh:
                    data = fh.read()
                zi = zipfile.ZipInfo(name)
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.date_time = (2026, 9, 7, 17, 0, 0)
                zout.writestr(zi, data)
                added += 1

    print(f"替换 {replaced} 个, 新增 {added} 个, 保留 {kept} 个")

    # 校验
    zn = zipfile.ZipFile(OUT, "r")
    print("zip 完整性:", "OK" if zn.testzip() is None else "损坏")
    lib_stored = sum(1 for i in zn.infolist()
                     if i.filename.startswith("BOOT-INF/lib/") and i.filename.endswith(".jar") and i.compress_type == 0)
    print("lib STORED 嵌套 jar 数(应=84):", lib_stored)
    print("BusinessTypeController 在:", "BOOT-INF/classes/com/rongcheng/seal/controller/BusinessTypeController.class" in zn.namelist())
    zn.close()
    print("输出:", OUT)

if __name__ == "__main__":
    main()
