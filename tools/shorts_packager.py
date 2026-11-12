#!/usr/bin/env python3
"""
Unpause (playunpause.com) — Zero-AI-Slop Faceless Video & .srt SEO Packager
---------------------------------------------------------------------------
Turns any raw gameplay/screen recording (.mp4) into:
  1. Vertical Short / TikTok / Reel (1080x1920, raw game audio, TikTok safe-zone callouts + playunpause.com watermark)
  2. YouTube Search Video (1920x1080, raw game audio, step callouts + playunpause.com watermark)
  3. Natural-language keyword-indexed .srt subtitle file (so YouTube Search indexes silent clips cleanly)
  4. Human-written, zero-AI-tell upload title & description file

Usage:
  python tools/shorts_packager.py --input raw_clip.mp4 \
    --hook "PORT GELLHORN PAWN SAFE: 0419" \
    --step2 "BEHIND NEON CLOCK · $4,500 + SUPPRESSOR" \
    --keywords "Port Gellhorn pawn shop safe code 0419 and early suppressor location"

Self-test:
  python tools/shorts_packager.py --self-test
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def find_windows_font() -> str:
    candidates = [
        "C:/Windows/Fonts/bahnschrift.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p.replace("\\", "/").replace(":", "\\:")
    return "Sans"


def escape_ff_path(p: Path) -> str:
    return str(p.resolve()).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def write_srt(out_srt: Path, hook: str, step2: str, keywords: str) -> None:
    clean_topic = keywords.strip().rstrip(".")
    content = (
        "1\n"
        "00:00:00,000 --> 00:00:02,500\n"
        f"{hook}\n\n"
        "2\n"
        "00:00:02,500 --> 00:00:05,800\n"
        f"{step2} — check off every safe at playunpause.com.\n\n"
        "3\n"
        "00:00:05,800 --> 00:00:12,000\n"
        f"Exact walkthrough showing {clean_topic} with zero commentary.\n"
    )
    out_srt.write_text(content, encoding="utf-8")


def write_upload_copy(out_txt: Path, hook: str, step2: str, keywords: str) -> None:
    clean_title = f"{hook.title()} (Exact Combo in 5 Seconds)"
    body = f"""YOUTUBE SEARCH / SHORTS UPLOAD PACK
====================================
TITLE (<= 70 chars):
{clean_title[:70]}

DESCRIPTION (Paste on Related Search Video — clickable once ID-verified in YT Studio):
Exact answer right at 0:01: {hook} ({step2}).

Check off every safe code, test if 212 GB fits your console, or split squad heist cuts with zero pop-up ads:
https://playunpause.com

Guide details: {keywords}

SHORTS CAPTION:
{hook} — ad-free safe checklist & 212GB checker at playunpause.com (link on channel page)
"""
    out_txt.write_text(body, encoding="utf-8")


def build_video(
    ffmpeg_bin: str,
    input_mp4: Path,
    output_mp4: Path,
    width: int,
    height: int,
    hook: str,
    step2: str,
) -> None:
    font_path = find_windows_font()
    is_vertical = height > width

    top_fontsize = 54 if is_vertical else 48
    sub_fontsize = 34 if is_vertical else 32
    badge_fontsize = 32 if is_vertical else 28

    # Safe-zone Y coordinates:
    # Vertical 9:16 clears TikTok top search bar (y=0.14h) & bottom caption/right icons (centered y=0.72h)
    hook_y = int(height * 0.14) if is_vertical else int(height * 0.08)
    step2_y = int(height * 0.198) if is_vertical else int(height * 0.155)
    badge_y = int(height * 0.72) if is_vertical else int(height * 0.86)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        hook_file = tmp / "hook.txt"
        step2_file = tmp / "step2.txt"
        badge_file = tmp / "badge.txt"

        hook_file.write_text(hook.strip(), encoding="utf-8")
        step2_file.write_text(step2.strip(), encoding="utf-8")
        badge_file.write_text("playunpause.com", encoding="utf-8")

        hf = escape_ff_path(hook_file)
        sf = escape_ff_path(step2_file)
        bf = escape_ff_path(badge_file)

        vf_chain = (
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},"
            f"drawtext=fontfile='{font_path}':textfile='{hf}':expansion=none:"
            f"fontcolor=0xFFFFFF:fontsize={top_fontsize}:borderw=5:bordercolor=0x091322@0.95:"
            f"x=(w-text_w)/2:y={hook_y},"
            f"drawtext=fontfile='{font_path}':textfile='{sf}':expansion=none:"
            f"fontcolor=0x2CE5B5:fontsize={sub_fontsize}:borderw=4:bordercolor=0x091322@0.95:"
            f"x=(w-text_w)/2:y={step2_y},"
            f"drawtext=fontfile='{font_path}':textfile='{bf}':expansion=none:"
            f"fontcolor=0xFF5C3E:fontsize={badge_fontsize}:borderw=4:bordercolor=0x091322@0.92:"
            f"x=(w-text_w)/2:y={badge_y}"
        )

        cmd = [
            ffmpeg_bin,
            "-y",
            "-i",
            str(input_mp4),
            "-vf",
            vf_chain,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "21",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            str(output_mp4),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg render failed:\n{proc.stderr[-800:]}")


def run_self_test(ffmpeg_bin: str, out_dir: Path) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    sample_in = out_dir / "synthetic_raw_clip.mp4"

    gen_cmd = [
        ffmpeg_bin,
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1280x720:rate=30:duration=3",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=3",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        str(sample_in),
    ]
    res = subprocess.run(gen_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Failed to synthesize test input:", res.stderr, file=sys.stderr)
        return 1

    # Include %, $, :, and apostrophe to prove expansion=none textfile immunity!
    hook = "PORT GELLHORN SAFE: 0419 (100%)"
    step2 = "MGR'S CLOCK · $4,500 + SUPPRESSOR"
    keywords = "the Port Gellhorn pawn shop safe code 0419 and free early suppressor pickup"

    short_mp4 = out_dir / "test_short_9x16.mp4"
    search_mp4 = out_dir / "test_search_16x9.mp4"
    srt_file = out_dir / "test_keywords.srt"
    copy_file = out_dir / "test_upload_copy.txt"

    build_video(ffmpeg_bin, sample_in, short_mp4, 1080, 1920, hook, step2)
    build_video(ffmpeg_bin, sample_in, search_mp4, 1920, 1080, hook, step2)
    write_srt(srt_file, hook, step2, keywords)
    write_upload_copy(copy_file, hook, step2, keywords)

    for artifact in (short_mp4, search_mp4, srt_file, copy_file):
        if not artifact.exists() or artifact.stat().st_size == 0:
            print(f"Missing expected output: {artifact}", file=sys.stderr)
            return 1

    print(f"[OK] Self-test passed. Generated safe-zone Short ({short_mp4.stat().st_size} B), Search MP4, .srt & copy in {out_dir}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Unpause Silent Faceless Video + .srt Packager")
    parser.add_argument("--input", type=str, help="Path to raw gameplay .mp4")
    parser.add_argument("--hook", type=str, default="EXACT SAFE CODE: 0419", help="Top headline callout")
    parser.add_argument("--step2", type=str, default="NO INTRO · CHECK OFF AT PLAYUNPAUSE.COM", help="Sub-line callout")
    parser.add_argument("--keywords", type=str, default="the exact safe code and 212 GB console storage check", help="Natural topic phrase for .srt")
    parser.add_argument("--outdir", type=str, default=str(Path(__file__).resolve().parent / "out"))
    parser.add_argument("--self-test", action="store_true", help="Run synthetic FFmpeg pipeline smoke test")
    args = parser.parse_args()

    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        print("Error: ffmpeg not found in PATH.", file=sys.stderr)
        return 1

    out_dir = Path(args.outdir)
    if args.self_test:
        return run_self_test(ffmpeg_bin, out_dir)

    if not args.input:
        parser.error("--input <clip.mp4> is required unless running --self-test")

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"Input file not found: {in_path}", file=sys.stderr)
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = in_path.stem
    short_out = out_dir / f"{stem}_short_9x16.mp4"
    search_out = out_dir / f"{stem}_search_16x9.mp4"
    srt_out = out_dir / f"{stem}_keywords.srt"
    copy_out = out_dir / f"{stem}_upload_copy.txt"

    build_video(ffmpeg_bin, in_path, short_out, 1080, 1920, args.hook, args.step2)
    build_video(ffmpeg_bin, in_path, search_out, 1920, 1080, args.hook, args.step2)
    write_srt(srt_out, args.hook, args.step2, args.keywords)
    write_upload_copy(copy_out, args.hook, args.step2, args.keywords)

    print(f"[Unpause Packager] Done!\n  Short (9:16):  {short_out}\n  Search (16:9): {search_out}\n  SEO .srt:      {srt_out}\n  Upload Copy:   {copy_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
