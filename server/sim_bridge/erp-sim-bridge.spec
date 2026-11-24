# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec — Windows'ta tek dosya `ERP-Sim-Bridge.exe`.

Üretim:  server\\sim_bridge\\build_exe.bat
Çıktı:   dist\\ERP-Sim-Bridge.exe

Exe'nin içinde ERP Studio'nun statik dosyaları (`app/`), varsayılan köprü
ayarı ve örnek fabrika profili taşınır. İlk çalıştırmada `config.json`,
`config/ornek-fabrika-profili.json` ve `data/ingest.db` **exe'nin yanına**
oluşturulur; böylece exe salt okunur bir klasörden bile çalışabilir.
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
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
