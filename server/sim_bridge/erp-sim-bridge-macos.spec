# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec — macOS `ERP-Sim-Bridge.app`.

Üretim:  server/sim_bridge/build_macos.sh
Çıktı:   dist/ERP-Sim-Bridge.app  (+ dist/ERP-Sim-Bridge Unix ikilisi)

Windows spec'inden iki farkı vardır: pencere yoktur (`console=False`) ve
PyInstaller'ın macOS uygulama paketi (`BUNDLE`) üretilir. Hatalar pencere
olmadığı için `run.py` içindeki `osascript` ile ileti olarak gösterilir.
"""
import os

ROOT = os.path.abspath(os.path.join(SPECPATH, '..', '..'))

a = Analysis(
    [os.path.join(ROOT, 'server', 'sim_bridge', 'exe_entry.py')],
    pathex=[ROOT, os.path.join(ROOT, 'edge')],
    binaries=[],
    datas=[
        (os.path.join(ROOT, 'app'), 'app'),
        (os.path.join(ROOT, 'index.html'), '.'),
        (os.path.join(ROOT, 'edge', 'config', 'ornek-fabrika-profili.json'), 'config'),
        (os.path.join(ROOT, 'edge', 'erp_edge', '__init__.py'), 'edge/erp_edge'),
        (os.path.join(ROOT, 'edge', 'erp_edge', 'sim_map.py'), 'edge/erp_edge'),
    ],
    hiddenimports=[
        'server.sim_bridge.app',
        'server.sim_bridge.demo_sim',
        'server.sim_bridge.sim_client',
        'server.sim_bridge.store',
        'erp_edge.sim_map',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'pydoc'],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ERP-Sim-Bridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

app = BUNDLE(
    exe,
    name='ERP-Sim-Bridge.app',
    icon=None,
    bundle_identifier='com.erpstudio.simbridge',
    info_plist={
        'CFBundleDisplayName': 'ERP Sim Bridge',
        'CFBundleName': 'ERP-Sim-Bridge',
        'CFBundleShortVersionString': '1.4.2',
        'NSHighResolutionCapable': True,
        'LSMinimumSystemVersion': '10.15',
        'LSApplicationCategoryType': 'public.app-category.business',
    },
)
