# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec — ERP-Edge-Collector.exe

Tek dosya, konsol penceresi yok, yanına `config/` ve `data/` klasörleri kopyalanır.
Kullanım:  pyinstaller --noconfirm --clean erp-edge.spec
"""
from PyInstaller.utils.hooks import collect_submodules
import os

datas = [
    ('erp_edge/ui/index.html', 'erp_edge/ui'),
    ('erp_edge/ui/app.css', 'erp_edge/ui'),
    ('erp_edge/ui/app.js', 'erp_edge/ui'),
    ('config/edge-config.json', 'config'),
    ('config/ornek-fabrika-profili.json', 'config'),
]

a = Analysis(
    ['main.py'],
    pathex=[os.path.abspath('.')],
    binaries=[],
    datas=datas,
    hiddenimports=['sqlite3', 'http.server', 'urllib.request', 'hmac', 'hashlib', 'webbrowser'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'numpy', 'pandas', 'PyQt5', 'matplotlib'],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ERP-Edge-Collector',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version='version_info.txt' if os.path.exists('version_info.txt') else None,
    icon='erp-edge.ico' if os.path.exists('erp-edge.ico') else None,
)
