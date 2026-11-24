#!/bin/bash
# ERP Studio — Simülasyon Köprüsü / macOS uygulama üretimi.
# Bir kez çalıştırın: dist/ERP-Sim-Bridge.app (çift tıklanabilir) üretilir.
set -eu
cd "$(dirname "$0")/../.."

echo
echo "  ERP Studio - Simulasyon Koprusu / macOS uygulama uretimi"
echo "  ------------------------------------------------------"
echo "  Bu islem yalnizca BIR KEZ yapilir. Sonunda:"
echo "    dist/ERP-Sim-Bridge.app"
echo "  dosyasina cift tiklayarak kullanabilirsiniz."
echo

if [ "$(uname -s)" != "Darwin" ]; then
  echo "  [HATA] Bu betik yalnizca macOS uzerinde calisir."
  echo "  PyInstaller hedef isletim sisteminde calismalidir; Linux/Windows'ta"
  echo "  macOS uygulamasi uretilemez. macOS'te Baslat.command hemen calisir."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "  [HATA] python3 bulunamadi. https://www.python.org/downloads/macos/"
  exit 1
fi

echo "  Python: $(python3 --version)"
echo "  PyInstaller kuruluyor..."
python3 -m pip install --upgrade --quiet pyinstaller

echo "  Uygulama paketleniyor (ilk seferde 1-2 dakika)..."
python3 -m PyInstaller "server/sim_bridge/erp-sim-bridge-macos.spec" --noconfirm --clean

echo
if [ -d "dist/ERP-Sim-Bridge.app" ]; then
  echo "  [TAMAM] dist/ERP-Sim-Bridge.app hazir."
  echo "  Finder'da cift tiklayin; tarayicida http://localhost:8080/app/#/dashboard acilir."
  echo "  Simulasyonunuzun http://localhost:8000 uzerinde calisiyor olmasi yeterlidir."
  echo
  echo "  Not: Uygulama imzasizdir. macOS ilk acilista uyarirsa:"
  echo "    Sag tik -> Ac  veya  Sistem Ayarlari -> Gizlilik ve Guvenlik -> Yine de Ac"
else
  echo "  [UYARI] dist/ERP-Sim-Bridge.app bulunamadi; dist klasorunu kontrol edin."
  exit 1
fi
