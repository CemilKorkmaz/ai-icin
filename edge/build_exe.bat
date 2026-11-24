@echo off
chcp 65001 >nul
setlocal
REM ===========================================================================
REM  ERP Edge Collector — tek .exe üretim betiği (Windows 10/11)
REM  Gereksinim: Python 3.10+ (https://www.python.org/downloads/windows/)
REM  Çıktı: dist\ERP-Edge-Collector.exe
REM ===========================================================================
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [HATA] Python bulunamadi. Python 3.10+ kurup PATH'e ekleyin.
  pause & exit /b 1
)

python -c "import PyInstaller" >nul 2>nul
if errorlevel 1 (
  echo PyInstaller kuruluyor...
  python -m pip install --upgrade pip
  python -m pip install pyinstaller==6.11.1
)

echo.
echo PyInstaller ile tek dosya uretiliyor...
python -m PyInstaller --noconfirm --clean erp-edge.spec
if errorlevel 1 (
  echo [HATA] Derleme basarisiz.
  pause & exit /b 1
)

if not exist "dist\config" mkdir "dist\config"
copy /Y "config\edge-config.json" "dist\config\" >nul
copy /Y "config\ornek-fabrika-profili.json" "dist\config\" >nul
if not exist "dist\data" mkdir "dist\data"
if not exist "dist\logs" mkdir "dist\logs"

echo.
echo ===========================================================================
echo  HAZIR: dist\ERP-Edge-Collector.exe
echo.
echo  Dagitim klasoru:
echo    dist\ERP-Edge-Collector.exe
echo    dist\config\edge-config.json          ^<- fabrikaya gore duzenlenir
echo    dist\config\ornek-fabrika-profili.json ^<- docs/12 profil paketi
echo    dist\data\edge.db                     ^<- ilk calistirmada olusur
echo    dist\logs\
echo.
echo  Ilk calistirma:  ERP-Edge-Collector.exe
echo  Sadece test:     ERP-Edge-Collector.exe --dry-run
echo  Arayuz:          http://127.0.0.1:8787
echo  Otomatik baslat: install-task.ps1 (PowerShell, yonetici olarak)
echo ===========================================================================
pause
