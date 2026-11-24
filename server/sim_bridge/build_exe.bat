@echo off
chcp 65001 >nul
title ERP Sim Bridge - exe uretimi
cd /d "%~dp0..\.."

echo.
echo  ERP Studio - Simulasyon Koprusu / Windows exe uretimi
echo  ----------------------------------------------------
echo  Bu islem yalnizca BIR KEZ yapilir. Sonunda:
echo    dist\ERP-Sim-Bridge.exe
echo  dosyasini cift tiklayarak kullanabilirsiniz.
echo.

set "PY="
where py >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  where python >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY (
  echo  [HATA] Python bulunamadi.
  echo  Python 3.9+ kurun: https://www.python.org/downloads/
  echo  Kurulumda "Add python.exe to PATH" kutusunu isaretleyin.
  pause
  exit /b 1
)

echo  Python: %PY%
echo  PyInstaller kuruluyor...
%PY% -m pip install --upgrade --quiet pyinstaller
if errorlevel 1 (
  echo  [HATA] PyInstaller kurulamadi. Internet baglantisini kontrol edin.
  pause
  exit /b 1
)

echo  Exe paketleniyor (ilk seferde 1-2 dakika)...
%PY% -m PyInstaller "server\sim_bridge\erp-sim-bridge.spec" --noconfirm --clean
if errorlevel 1 (
  echo.
  echo  [HATA] Paketleme basarisiz. Yukaridaki mesaji kontrol edin.
  pause
  exit /b 1
)

echo.
if exist "dist\ERP-Sim-Bridge.exe" (
  echo  [TAMAM] dist\ERP-Sim-Bridge.exe hazir.
  echo  Bu dosyaya cift tiklayin; tarayicida http://localhost:8080/app/#/dashboard acilir.
  echo  Simulasyonunuzun http://localhost:8000 uzerinde calisiyor olmasi yeterlidir.
) else (
  echo  [UYARI] dist\ERP-Sim-Bridge.exe bulunamadi; dist klasorunu kontrol edin.
)
echo.
pause
