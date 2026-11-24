"""PyInstaller giriş noktası: tek dosya `ERP-Sim-Bridge.exe`.

Windows'ta `build_exe.bat` bu dosyayı paketler. Exe çift tıklandığında
`run.py` ile aynı davranışı gösterir: ERP Studio'yu :8080'de açar, kullanıcının
:8000'deki simülasyonuna bağlanır ve tarayıcıyı simülasyon ekranında açar.
"""
from __future__ import annotations

import multiprocessing
import sys

from server.sim_bridge.run import main

if __name__ == '__main__':
    multiprocessing.freeze_support()
    sys.exit(main())
