#!/usr/bin/env python3
"""Generate crisp Obsidian-Studio PNG icons and bespoke 1200x630 OpenGraph cards for Unpause."""
from pathlib import Path
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OG_DIR = PUBLIC / "og"

BG_DARK = (9, 9, 11)
CARD_BG = (17, 18, 25)
CARD_INNER = (24, 26, 36)
BORDER_SUBTLE = (42, 46, 62)
TEXT_PRIMARY = (248, 250, 252)
TEXT_MUTED = (182, 193, 212)
INDIGO = (129, 140, 248)


def find_font(candidates, size):
    for path in candidates:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


BOLD_FONTS = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\bahnschrift.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
REG_FONTS = [
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
MONO_FONTS = [
    r"C:\Windows\Fonts\consolab.ttf",
    r"C:\Windows\Fonts\lucon.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
]


OG_CARDS = [
    {
        "filename": "../og-cover.png",
        "accent": (129, 140, 248),
        "category": "UNPAUSE · SECOND-SCREEN STUDIO",
        "headline": "Instant Console Storage & Game Math Decks",
        "sub": "GTA VI PS5 & Xbox Space Check, Safe Vault, Warzone 300 HP TTK, Minecraft Nether 8x & EA FC 27 Tax.",
        "pills": ["10 GAMES", "ZERO ADS", "INSTANT MATH"],
    },
    {
        "filename": "gta-6-storage.png",
        "accent": (56, 189, 248),
        "category": "GTA VI STORAGE CHECKER",
        "headline": "Will GTA VI Fit On Your Console?",
        "sub": "212 GB PS5 & 225 GB Xbox Space Check, +35 GB Patch Buffer & Mbps Download ETA.",
        "pills": ["212-225 GB", "+35 GB PATCH", "PS5 · XSX · XSS"],
    },
    {
        "filename": "gta-6-safes.png",
        "accent": (244, 114, 182),
        "category": "GTA VI KEYPAD VAULT",
        "headline": "Vice City Safe & Door Combinations",
        "sub": "Instant District Lookup & Interactive 10-Key Tone Simulator Across Port Gellhorn, Vice Beach & Keys.",
        "pills": ["6 VAULT PREVIEWS", "AUDIO KEYPAD", "DISTRICT FILTER"],
    },
    {
        "filename": "gta-6-heist.png",
        "accent": (52, 211, 153),
        "category": "GTA VI SQUAD HEIST SPLITTER",
        "headline": "Integer-Exact 100% Heist Cut Math",
        "sub": "Deduct Support Crew Fees, Copy Squad Chat Receipts & Project Two-Character Market Compounding.",
        "pills": ["4-WAY SPLIT", "ZERO REMAINDER", "MARKET COMPOUND"],
    },
    {
        "filename": "gta-6-nightrun.png",
        "accent": (167, 139, 250),
        "category": "GTA VI SESSION PLANNER",
        "headline": "45-120 Min Weeknight Pause Routes",
        "sub": "Built for Late-Night Players: Spoiler-Free Missables Shield & Cross-Device Session Checkpoints.",
        "pills": ["45M / 90M / 120M", "NO SPOILERS", "PAUSE SHIELD"],
    },
    {
        "filename": "cod-warzone.png",
        "accent": (251, 146, 60),
        "category": "COD WARZONE · BO7 / MW4",
        "headline": "300 HP Weapon TTK & Headshot Solver",
        "sub": "Side-by-Side AR & SMG Kill Speed, Range Dropoff Milliseconds & Exact Shots-to-Kill Matrix.",
        "pills": ["300 HP ARMOR", "HS REDUCTION", "META vs CHALLENGER"],
    },
    {
        "filename": "ea-fc-27.png",
        "accent": (74, 222, 128),
        "category": "EA SPORTS FC 27 ULTIMATE TEAM",
        "headline": "Instant 5% Transfer Market Tax Solver",
        "sub": "Zero-Loss Flip Minimum Sell Target, Net Coin Profit & 11-Player SBC Squad OVR Calculator.",
        "pills": ["5% EA TAX", "MIN SELL FLOOR", "SBC OVR MATH"],
    },
    {
        "filename": "minecraft.png",
        "accent": (52, 211, 153),
        "category": "MINECRAFT · JAVA & BEDROCK",
        "headline": "Exact 8:1 Nether Portal Coordinate Link",
        "sub": "Stop Wrong-Cave Portal Linking Forever. Convert X/Z Coordinates, View Chunk Borders & Stronghold Triangulation.",
        "pills": ["8:1 X / Z SYNC", "16x16 CHUNKS", "JAVA + BEDROCK"],
    },
    {
        "filename": "roblox.png",
        "accent": (96, 165, 250),
        "category": "ROBLOX CREATOR ECONOMY",
        "headline": "DevEx USD Cashout & 30% Fee Math",
        "sub": "Calculate Exact Marketplace Cut After 30% Tax, Studio Group Payout Splits & Verified 2025/2026 USD Rates.",
        "pills": ["DEVEX USD", "30% TAX", "GROUP SPLITS"],
    },
    {
        "filename": "cs2.png",
        "accent": (250, 204, 21),
        "category": "COUNTER-STRIKE 2 PREMIER",
        "headline": "Loss Bonus Ladder & Next-Round Economy",
        "sub": "Track $1,400 to $3,400 Consecutive Loss Payouts and Instant CT / T Full-Buy vs Eco Thresholds.",
        "pills": ["$1400-$3400", "NEXT BUY FLOOR", "CT & T ECONOMIES"],
    },
    {
        "filename": "valorant.png",
        "accent": (248, 113, 113),
        "category": "VALORANT COMPETITIVE TOOL",
        "headline": "Next-Round Creds & RR Rank Climb Math",
        "sub": "Balance Vandal + Heavy Shield Floors, Bonus Rounds & Wins Needed to Hit Your Next Competitive Division.",
        "pills": ["3900 FULL BUY", "MIN SAVE MATH", "RR CLIMB ETA"],
    },
    {
        "filename": "fortnite.png",
        "accent": (56, 189, 248),
        "category": "FORTNITE BATTLE PASS TRACKER",
        "headline": "Daily XP Quota & Level 200 Finish Date",
        "sub": "Calculate Exact Levels & XP Needed Per Day With Daily Bonus, UEFN Creative & LEGO Modes.",
        "pills": ["80K XP / LVL", "LVL 100 & 200", "DAILY TARGET"],
    },
    {
        "filename": "apex-legends.png",
        "accent": (251, 113, 133),
        "category": "APEX LEGENDS PACK TRACKER",
        "headline": "500-Pack Heirloom Pity & Level Packs",
        "sub": "Exact Free Apex Packs Across Prestige Tiers 0-3 (Lvl 1-500) Plus Ranked RP Promotion Ladder.",
        "pills": ["199 FREE L1-500", "500 PACK PITY", "RP LADDER"],
    },
    {
        "filename": "gta-online.png",
        "accent": (74, 222, 128),
        "category": "GTA ONLINE CAYO & HEISTS",
        "headline": "12% Fencing Fee & 2-4 Player Cut Math",
        "sub": "Exact Secondary Gold/Cocaine Bag Fill Value, Pavel + Fence Cuts, Elite Bonus & Squad Payouts.",
        "pills": ["12% NPC FEES", "BAG CAPACITY", "ELITE BONUS"],
    },
]

# Clean label override on cod card pill so it reads sharp
OG_CARDS[5]["pills"][2] = "AR vs SMG DIFF"


def wrap_lines(draw, text, font, max_width, max_lines=2):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
                current = word
            else:
                lines.append(word)
                current = ""
            if len(lines) == max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    # Append remaining words cleanly if last line fits, else ellipsis
    consumed = sum(len(l.split()) for l in lines)
    if consumed < len(words) and lines:
        rem = " ".join([lines[-1]] + words[consumed:])
        while rem and draw.textbbox((0, 0), rem + "...", font=font)[2] > max_width:
            rem = rem[:-1].rstrip()
        lines[-1] = f"{rem}..."
    return lines


def draw_brand_mark(draw, x, y, size, accent):
    # Rounded square badge + pause bars + mini play triangle
    draw.rounded_rectangle([x, y, x + size, y + size], radius=int(size * 0.24), fill=(26, 29, 43), outline=accent, width=2)
    bar_w = max(3, int(size * 0.14))
    bar_h = int(size * 0.44)
    bar_y = y + (size - bar_h) // 2
    draw.rounded_rectangle([x + int(size * 0.25), bar_y, x + int(size * 0.25) + bar_w, bar_y + bar_h], radius=2, fill=TEXT_PRIMARY)
    tri_left = x + int(size * 0.50)
    tri_right = x + int(size * 0.79)
    tri_mid_y = y + size // 2
    draw.polygon(
        [(tri_left, bar_y), (tri_left, bar_y + bar_h), (tri_right, tri_mid_y)],
        fill=accent,
    )


def render_og_card(spec):
    W, H = 1200, 630
    accent = spec["accent"]
    img = Image.new("RGBA", (W, H), (*BG_DARK, 255))

    # Soft radial ambient glow top-left and top-right
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for r in range(420, 20, -25):
        alpha = int(14 * (1 - r / 420) ** 2)
        gdraw.ellipse([180 - r, 80 - r, 180 + r, 80 + r], fill=(accent[0], accent[1], accent[2], alpha))
        gdraw.ellipse([1040 - r, 520 - r, 1040 + r, 520 + r], fill=(INDIGO[0], INDIGO[1], INDIGO[2], alpha))
    img = Image.alpha_composite(img, glow)

    # Subtle obsidian studio grid composited properly onto dark canvas
    grid_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_layer)
    for gx in range(0, W, 60):
        grid_draw.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 11), width=1)
    for gy in range(0, H, 60):
        grid_draw.line([(0, gy), (W, gy)], fill=(255, 255, 255, 11), width=1)

    # Studio elevated card container & translucent category pill layer
    cx0, cy0, cx1, cy1 = 46, 40, W - 46, H - 40
    grid_draw.rounded_rectangle(
        [cx0, cy0, cx1, cy1],
        radius=24,
        fill=(*CARD_BG, 246),
        outline=(*BORDER_SUBTLE, 255),
        width=2,
    )
    grid_draw.rounded_rectangle([cx0 + 24, cy0, cx1 - 24, cy0 + 5], radius=3, fill=(*accent, 235))

    f_brand = find_font(BOLD_FONTS, 24)
    f_url = find_font(MONO_FONTS, 20)
    f_cat = find_font(MONO_FONTS, 19)
    f_h1 = find_font(BOLD_FONTS, 58)
    f_sub = find_font(REG_FONTS, 26)
    f_pill = find_font(MONO_FONTS, 20)

    cat_text = spec["category"]
    cat_bbox = grid_draw.textbbox((0, 0), cat_text, font=f_cat)
    cat_w = (cat_bbox[2] - cat_bbox[0]) + 48
    cat_x0 = cx1 - 46 - cat_w
    grid_draw.rounded_rectangle(
        [cat_x0, 82, cat_x0 + cat_w, 124],
        radius=21,
        fill=(accent[0], accent[1], accent[2], 34),
        outline=(accent[0], accent[1], accent[2], 185),
        width=2,
    )
    grid_draw.ellipse([cat_x0 + 16, 98, cat_x0 + 26, 108], fill=(*accent, 255))

    img = Image.alpha_composite(img, grid_layer)
    draw = ImageDraw.Draw(img)

    # Top bar: Logo + UNPAUSE on left, category text on right
    pad_x = 92
    draw_brand_mark(draw, pad_x, 78, 46, accent)
    draw.text((pad_x + 62, 80), "UNPAUSE", font=f_brand, fill=TEXT_PRIMARY)
    draw.text((pad_x + 62, 108), "playunpause.com", font=f_url, fill=TEXT_MUTED)
    draw.text((cat_x0 + 34, 92), cat_text, font=f_cat, fill=TEXT_PRIMARY)

    # Headline (wrapped to max 2 lines)
    max_text_w = (cx1 - 46) - pad_x
    h1_lines = wrap_lines(draw, spec["headline"], f_h1, max_text_w, max_lines=2)
    hy = 172 if len(h1_lines) == 2 else 196
    for line in h1_lines:
        draw.text((pad_x, hy), line, font=f_h1, fill=TEXT_PRIMARY)
        hy += 70

    # Subtitle (wrapped to max 2 lines)
    sub_y = max(hy + 14, 326)
    sub_lines = wrap_lines(draw, spec["sub"], f_sub, max_text_w, max_lines=2)
    for line in sub_lines:
        draw.text((pad_x, sub_y), line, font=f_sub, fill=TEXT_MUTED)
        sub_y += 38

    # Divider line above footer strip
    draw.line([(pad_x, 462), (cx1 - 46, 462)], fill=(*BORDER_SUBTLE, 200), width=1)

    # Metric Pills left + CTA right
    px = pad_x
    for pill in spec["pills"]:
        pbox = draw.textbbox((0, 0), pill, font=f_pill)
        pw = (pbox[2] - pbox[0]) + 34
        draw.rounded_rectangle(
            [px, 488, px + pw, 540],
            radius=12,
            fill=(*CARD_INNER, 255),
            outline=(accent[0], accent[1], accent[2], 145),
            width=2,
        )
        draw.text((px + 17, 503), pill, font=f_pill, fill=TEXT_PRIMARY)
        px += pw + 16

    cta_label = "FREE · NO POPUP ADS"
    cbox = draw.textbbox((0, 0), cta_label, font=f_cat)
    cw = (cbox[2] - cbox[0]) + 36
    cx_pill = cx1 - 46 - cw
    draw.rounded_rectangle(
        [cx_pill, 488, cx_pill + cw, 540],
        radius=12,
        fill=(accent[0], accent[1], accent[2], 235),
    )
    draw.text((cx_pill + 18, 503), cta_label, font=f_cat, fill=(9, 11, 17))

    out_path = (OG_DIR / spec["filename"]).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)
    return out_path


def render_app_icon(size, filename):
    # Render 4x supersampled then downsample with LANCZOS for crisp edges
    scale = 4
    S = size * scale
    img = Image.new("RGBA", (S, S), (*BG_DARK, 255))
    draw = ImageDraw.Draw(img)

    margin = int(S * 0.08)
    draw.rounded_rectangle(
        [margin, margin, S - margin, S - margin],
        radius=int(S * 0.22),
        fill=(22, 24, 34, 255),
        outline=(*INDIGO, 235),
        width=max(4, int(S * 0.03)),
    )

    bar_w = int(S * 0.13)
    bar_h = int(S * 0.44)
    bar_x = int(S * 0.27)
    bar_y = (S - bar_h) // 2
    draw.rounded_rectangle(
        [bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
        radius=int(S * 0.04),
        fill=(*TEXT_PRIMARY, 255),
    )

    tri_left = int(S * 0.49)
    tri_right = int(S * 0.77)
    tri_mid = S // 2
    draw.polygon([(tri_left, bar_y), (tri_left, bar_y + bar_h), (tri_right, tri_mid)], fill=(56, 189, 248, 255))

    final_img = img.resize((size, size), resample=Image.Resampling.LANCZOS).convert("RGB")
    out_path = PUBLIC / filename
    final_img.save(out_path, format="PNG", optimize=True)
    return out_path


def main():
    OG_DIR.mkdir(parents=True, exist_ok=True)
    generated = []
    for spec in OG_CARDS:
        generated.append(render_og_card(spec))
    # Keep legacy /og-image.png synced with /og-cover.png
    cover = Image.open(PUBLIC / "og-cover.png")
    cover.save(PUBLIC / "og-image.png", format="PNG", optimize=True)
    generated.append(PUBLIC / "og-image.png")

    for sz, fname in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        generated.append(render_app_icon(sz, fname))

    print(f"[Unpause Assets] Generated {len(generated)} brand & OpenGraph PNG assets successfully.")


if __name__ == "__main__":
    main()
