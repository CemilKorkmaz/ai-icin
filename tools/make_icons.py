#!/usr/bin/env python3
"""PWA ikonlarını (192/512 PNG) saf Python ile üretir — harici kütüphane gerekmez.

Kullanım: python3 tools/make_icons.py
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app', 'assets')


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)


def render(size):
    px = bytearray()
    radius = size * 0.22
    for y in range(size):
        row = bytearray(b'\x00')  # PNG filtre tipi 0
        for x in range(size):
            # Köşe yuvarlaklığı (kenar pikselleri şeffaf)
            cx = min(x, size - 1 - x)
            cy = min(y, size - 1 - y)
            if cx < radius and cy < radius:
                dx, dy = radius - cx, radius - cy
                if dx * dx + dy * dy > radius * radius:
                    row += b'\x00\x00\x00\x00'
                    continue
            t = (x / size * 0.55 + y / size * 0.45)
            r = int(0x43 + (0x08 - 0x43) * t)
            g = int(0x38 + (0x91 - 0x38) * t)
            b = int(0xCA + (0xB2 - 0xCA) * t)

            # Üç sütun (beyaz, hafif şeffaflık)
            bars = [(0.23, 0.56, 0.125, 0.21, 0.78), (0.40, 0.43, 0.125, 0.34, 0.88), (0.575, 0.29, 0.125, 0.48, 1.0)]
            for bx, by, bw, bh, alpha in bars:
                if bx <= x / size <= bx + bw and by <= y / size <= by + bh:
                    r = int(r * (1 - alpha) + 255 * alpha)
                    g = int(g * (1 - alpha) + 255 * alpha)
                    b = int(b * (1 - alpha) + 255 * alpha)
            # Üstteki çatı/ok çizgisi
            roof_y = 0.345 - 0.135 * abs(0.5 - x / size) / 0.5
            if 0.23 <= x / size <= 0.77 and abs(y / size - roof_y) < 0.026:
                r = g = b = 255
            row += bytes((max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), 255))
        px += row
    raw = zlib.compress(bytes(px), 9)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', raw)
    png += chunk(b'IEND', b'')
    return png


def main():
    os.makedirs(OUT, exist_ok=True)
    for size in (192, 512):
        path = os.path.join(OUT, f'icon-{size}.png')
        with open(path, 'wb') as f:
            f.write(render(size))
        print('yazıldı:', path)


if __name__ == '__main__':
    main()
