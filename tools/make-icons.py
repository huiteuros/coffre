"""Génère les icônes de l'appli (porte de coffre + cadran laiton) dans icons/.
Usage : python tools/make-icons.py   (nécessite Pillow)
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
BG = (15, 18, 20)
RING = (8, 10, 11)
STEEL = (54, 62, 68)
STEEL_LIGHT = (91, 102, 110)
RIVET = (122, 134, 141)
SPOKE = (201, 208, 212)
BRASS = (214, 170, 79)
BRASS_LIGHT = (241, 213, 142)
BRASS_DARK = (59, 44, 16)
LED = (255, 75, 58)


def draw_vault(size, scale):
    """Dessine la porte ; scale = part du carré occupée par la porte (0,8 pour l'icône « maskable »)."""
    S = size * 4  # suréchantillonnage pour des bords lisses
    img = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(img)
    c = S / 2
    R = S / 2 * scale

    def disc(r, fill, outline=None, width=0):
        d.ellipse([c - r, c - r, c + r, c + r], fill=fill, outline=outline, width=width)

    disc(R, RING)
    # Porte : dégradé simple en anneaux concentriques
    for i in range(40):
        t = i / 39
        col = tuple(int(STEEL_LIGHT[k] * (1 - t) + STEEL[k] * t) for k in range(3))
        disc(R * 0.93 * (1 - t * 0.02), col)
    disc(R * 0.93, None, outline=(11, 13, 14), width=int(S * 0.006))
    # Rivets
    for i in range(12):
        a = i / 12 * math.tau
        x, y = c + math.sin(a) * R * 0.82, c - math.cos(a) * R * 0.82
        r = R * 0.035
        d.ellipse([x - r, y - r, x + r, y + r], fill=RIVET)
    # Rayons de la roue
    for i in range(3):
        a = i / 3 * math.pi
        dx, dy = math.sin(a) * R * 0.62, -math.cos(a) * R * 0.62
        d.line([c - dx, c - dy, c + dx, c + dy], fill=SPOKE, width=int(R * 0.07))
    for i in range(6):
        a = i / 6 * math.tau
        x, y = c + math.sin(a) * R * 0.62, c - math.cos(a) * R * 0.62
        r = R * 0.07
        d.ellipse([x - r, y - r, x + r, y + r], fill=SPOKE)
    # Cadran laiton
    disc(R * 0.36, BRASS_DARK)
    for i in range(20):
        t = i / 19
        col = tuple(int(BRASS_LIGHT[k] * (1 - t) + BRASS[k] * t) for k in range(3))
        disc(R * 0.34 * (1 - t * 0.35), col)
    for i in range(20):
        a = i / 20 * math.tau
        r1, r2 = R * (0.27 if i % 5 == 0 else 0.3), R * 0.34
        d.line([c + math.sin(a) * r1, c - math.cos(a) * r1, c + math.sin(a) * r2, c - math.cos(a) * r2],
               fill=BRASS_DARK, width=int(R * (0.02 if i % 5 == 0 else 0.01)) or 1)
    disc(R * 0.09, (42, 32, 16))
    # Repère rouge
    tip = c - R * 0.4
    d.polygon([(c, tip + R * 0.04), (c - R * 0.05, tip - R * 0.05), (c + R * 0.05, tip - R * 0.05)], fill=LED)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
draw_vault(192, 0.96).save(OUT / "icon-192.png")
draw_vault(512, 0.96).save(OUT / "icon-512.png")
draw_vault(512, 0.78).save(OUT / "icon-maskable-512.png")   # contenu dans la zone sûre (80 %)
draw_vault(180, 0.86).save(OUT / "apple-touch-icon.png")    # iOS arrondit les coins lui-même
draw_vault(32, 1.0).save(OUT / "favicon-32.png")
print("Icônes écrites dans", OUT)
