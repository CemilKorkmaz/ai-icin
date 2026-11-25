#!/bin/bash
# ERP Studio — Tek Tık Test Ortamı (macOS)
# Finder'da çift tıklayın: ERP, simülasyon ve edge ekranları açılır.
set -u
cd "$(dirname "$0")" || { echo "Depo klasörü açılamadı."; exit 1; }
export PYTHONUTF8=1

if [ ! -f "tools/hepsi.py" ]; then
  echo "[HATA] tools/hepsi.py bulunamadı."
  echo "Dosyayı depo kökünden çalıştırdığınızdan emin olun."
  read -r -p "Kapatmak için Enter'a basın..." _
  exit 1
fi

PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

if [ -z "$PY" ]; then
  echo "[HATA] Python 3 bulunamadı."
  echo "Kurulum: https://www.python.org/downloads/macos/"
  echo "Alternatif: server/sim_bridge/build_macos.sh ile bir kez .app üretin."
  read -r -p "Kapatmak için Enter'a basın..." _
  exit 1
fi

"$PY" tools/hepsi.py "$@"
status=$?
if [ "$status" -ne 0 ]; then
  echo
  echo "Başlatıcı kapandı (kod $status). Yukarıdaki mesajı okuyun."
  echo "Sık durum: 8080 portunda eski bir pencere açık."
  read -r -p "Kapatmak için Enter'a basın..." _
fi
exit "$status"
