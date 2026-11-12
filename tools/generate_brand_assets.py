#!/usr/bin/env python3
"""Generates crisp brand PNG assets in unpause/public/ using FFmpeg lavfi + drawtext."""

import os
import shutil
import subprocess
from pathlib import Path

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
FFMPEG = shutil.which("ffmpeg")


def find_font() -> str:
    for p in ("C:/Windows/Fonts/bahnschrift.ttf", "C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"):
        if os.path.exists(p):
            return p.replace("\\", "/").replace(":", "\\:")
    return "Sans"


def render_og_cover() -> None:
    font = find_font()
    out = PUBLIC_DIR / "og-cover.png"
    vf = (
        "drawbox=x=0:y=0:w=1200:h=630:color=0xF6F1E7:t=fill,"
        "drawbox=x=48:y=48:w=1104:h=534:color=0xFFFFFF:t=fill,"
        "drawbox=x=48:y=48:w=1104:h=534:color=0x171D28:t=4,"
        "drawbox=x=48:y=48:w=1104:h=16:color=0xFF4726:t=fill,"
        "drawbox=x=96:y=110:w=250:h=46:color=0xFF4726:t=fill,"
        f"drawtext=fontfile='{font}':text='PLAYUNPAUSE.COM':fontcolor=0xFFFFFF:fontsize=24:x=114:y=123,"
        f"drawtext=fontfile='{font}':text='UNPAUSE':fontcolor=0x121722:fontsize=92:x=96:y=190,"
        f"drawtext=fontfile='{font}':text='Answer in 3 seconds. Back to the game.':fontcolor=0x4A5567:fontsize=38:x=96:y=302,"
        "drawbox=x=96:y=384:w=1008:h=136:color=0x0C1629:t=fill,"
        f"drawtext=fontfile='{font}':text='212 GB CONSOLE FIT   |   SAFE CODES   |   HEIST SPLITS   |   NIGHT ROUTES':fontcolor=0x2CE5B5:fontsize=27:x=126:y=438"
    )
    subprocess.run(
        [FFMPEG, "-y", "-f", "lavfi", "-i", "color=c=0xF6F1E7:s=1200x630:d=1", "-vf", vf, "-frames:v", "1", "-update", "1", str(out)],
        check=True,
        capture_output=True,
    )


def render_app_icon(size: int, filename: str) -> None:
    font = find_font()
    out = PUBLIC_DIR / filename
    pad = max(8, size // 14)
    inner = size - pad * 2
    fs = int(size * 0.46)
    vf = (
        f"drawbox=x=0:y=0:w={size}:h={size}:color=0xFF4726:t=fill,"
        f"drawbox=x={pad}:y={pad}:w={inner}:h={inner}:color=0x171D28:t={max(3, size // 48)},"
        f"drawtext=fontfile='{font}':text='U►':fontcolor=0xFFFFFF:fontsize={fs}:x=(w-text_w)/2:y=(h-text_h)/2"
    )
    subprocess.run(
        [FFMPEG, "-y", "-f", "lavfi", "-i", f"color=c=0xFF4726:s={size}x{size}:d=1", "-vf", vf, "-frames:v", "1", "-update", "1", str(out)],
        check=True,
        capture_output=True,
    )


if __name__ == "__main__":
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    render_og_cover()
    render_app_icon(180, "apple-touch-icon.png")
    render_app_icon(192, "icon-192.png")
    render_app_icon(512, "icon-512.png")
    print("[OK] Generated og-cover.png, apple-touch-icon.png, icon-192.png, icon-512.png")
