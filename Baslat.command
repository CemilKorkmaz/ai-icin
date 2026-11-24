#!/bin/bash
# ERP Studio — Simülasyon Köprüsü / macOS çift tık başlatıcı.
# Finder'da bu dosyaya çift tıklayın: köprü başlar, tarayıcı Simülasyon ekranında açılır.
set -u
cd "$(dirname "$0")" || { echo "Depo klasörü açılamadı."; exit 1; }

cat <<'BILGI'

  ============================================================
   ERP Studio - Simulasyon Baglantisi (macOS)
  ============================================================
   Sizin simulasyonunuz : http://localhost:8000
   ERP Studio           : http://localhost:8080/app/#/sim

   Simulasyonunuzu once her zamanki gibi baslatin.
   Bu Terminal penceresi acik kaldikca kopru calisir.
   Kapatmak icin Ctrl+C veya pencereyi kapatin.
  ============================================================

BILGI

# Bir kez üretilmiş .app varsa onu kullan (Python gerekmez).
if [ -d "dist/ERP-Sim-Bridge.app" ]; then
  echo "  ERP-Sim-Bridge.app açılıyor..."
  open "dist/ERP-Sim-Bridge.app"
  exit 0
fi

# PyInstaller'ın tek dosya Unix çıktısı varsa doğrudan çalıştır.
if [ -x "dist/ERP-Sim-Bridge" ]; then
  echo "  dist/ERP-Sim-Bridge çalıştırılıyor..."
  exec "./dist/ERP-Sim-Bridge" --host 127.0.0.1 --port 8080 --open
fi

if [ ! -f "server/sim_bridge/run.py" ]; then
  echo "  [HATA] server/sim_bridge/run.py bulunamadı."
  echo "  Baslat.command dosyasını depo kökünde çalıştırdığınızdan emin olun."
  read -r -p "  Kapatmak için Enter'a basın..." _
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
  echo "  [HATA] Python 3 bulunamadı."
  echo "  Simülasyonunuz Python ile çalışıyorsa Python zaten kuruludur."
  echo "  Kurulu değilse: https://www.python.org/downloads/macos/"
  echo "  Alternatif: server/sim_bridge/build_macos.sh ile bir kez"
  echo "  dist/ERP-Sim-Bridge.app üretin; sonra Python gerekmez."
  osascript -e 'display alert "Python bulunamadı" message "Simülasyon köprüsü için Python 3 gerekir. python.org adresinden kurun veya build_macos.sh ile uygulama üretin." as critical' >/dev/null 2>&1 || true
  read -r -p "  Kapatmak için Enter'a basın..." _
  exit 1
fi

echo "  Python ile başlatılıyor: $PY"
"$PY" server/sim_bridge/run.py --host 127.0.0.1 --port 8080 --open
status=$?
if [ "$status" -ne 0 ]; then
  echo
  echo "  Köprü kapandı (kod $status). Yukarıdaki mesajı okuyun."
  echo "  Sık durum: 8080 portunda eski bir pencere açık."
  read -r -p "  Kapatmak için Enter'a basın..." _
fi
exit "$status"
