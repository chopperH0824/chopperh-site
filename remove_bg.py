#!/usr/bin/env python3
"""
去除公司 logo 背景色，输出透明底 PNG 到 images/logos/
用法: python remove_bg.py
"""
import os
import shutil
from pathlib import Path
from PIL import Image
import numpy as np

SRC_DIR = Path("next")
OUT_DIR = Path("images/logos")
OUT_DIR.mkdir(parents=True, exist_ok=True)

LOGOS = [
    ("颜小芋.png",  "logo-yxy.png"),
    ("亿道信息.png", "logo-yidao.png"),
    ("火火兔.png",  "logo-hhtu.png"),
    ("乐漾.png",   "logo-leyang.png"),
]

def remove_bg(img: Image.Image, tolerance: int = 30) -> Image.Image:
    """把图片四角颜色视为背景色，将近似颜色替换为透明。"""
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.int32)

    # 取四角颜色均值作为背景色参考
    corners = [
        data[0, 0, :3],
        data[0, -1, :3],
        data[-1, 0, :3],
        data[-1, -1, :3],
    ]
    bg = np.mean(corners, axis=0)

    # 计算每像素与背景色的距离
    diff = np.abs(data[:, :, :3] - bg)
    mask = np.max(diff, axis=2) < tolerance

    # 将背景像素设为透明
    data[:, :, 3] = np.where(mask, 0, data[:, :, 3])
    return Image.fromarray(data.astype(np.uint8), "RGBA")


def try_rembg(src_path: Path):
    try:
        from rembg import remove
        with open(src_path, "rb") as f:
            result = remove(f.read())
        import io
        return Image.open(io.BytesIO(result)).convert("RGBA")
    except ImportError:
        return None
    except Exception as e:
        print(f"  rembg 失败: {e}")
        return None


for src_name, dst_name in LOGOS:
    src_path = SRC_DIR / src_name
    dst_path = OUT_DIR / dst_name
    if not src_path.exists():
        print(f"⚠️  找不到文件: {src_path}")
        continue

    print(f"处理 {src_name} → {dst_name}")
    result = try_rembg(src_path)
    if result is None:
        print(f"  使用 Pillow 颜色距离法")
        img = Image.open(src_path)
        result = remove_bg(img, tolerance=40)

    result.save(dst_path, "PNG")
    print(f"  ✓ 已保存 {dst_path}")

# vivo 直接复制 SVG
vivo_src = SRC_DIR / "vivo.svg"
vivo_dst = OUT_DIR / "logo-vivo.svg"
shutil.copy2(vivo_src, vivo_dst)
print(f"复制 vivo.svg → {vivo_dst} ✓")

print("\n全部完成！输出目录:", OUT_DIR)
