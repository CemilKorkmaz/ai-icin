@echo off
chcp 65001 >nul
title ERP Studio - Canli Simulasyon
cd /d "%~dp0"

echo.
echo  ============================================================
echo   ERP Studio - Canli Simulasyon
echo  ============================================================
echo   Sizin simulasyonunuz : http://localhost:8000
echo   ERP Studio           : http://localhost:8080/app/#/dashboard
echo.
echo   Simulasyonunuzu once her zamanki gibi baslatin.
echo   Bu pencere acik kaldikca kopru calisir; kapatirsaniz durur.
echo  ============================================================
echo.

rem Bir kez uretilmis gercek exe varsa onu kullan (Python gerekmez).
if exist "dist\ERP-Sim-Bridge.exe" (
  echo  ERP-Sim-Bridge.exe baslatiliyor...
  "dist\ERP-Sim-Bridge.exe" --host 127.0.0.1 --port 8080 --open
  if errorlevel 1 (
    echo.
    echo  Kopru kapandi. Yukaridaki mesaji okuyun.
    pause
    exit /b 1
  )
  exit /b 0
)

if not exist "server\sim_bridge\run.py" (
  echo  [HATA] server\sim_bridge\run.py bulunamadi.
  echo  Baslat.bat dosyasini depo kokunde calistirdiginizdan emin olun.
  pause
  exit /b 1
)

set "PY="
where py >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  where python >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY (
  echo  [HATA] Python bulunamadi.
  echo.
  echo  Simulasyonunuz Python ile calistigi icin Python zaten kurulu olmali.
  echo  Kurulu degilse: https://www.python.org/downloads/
  echo  Kurulumda "Add python.exe to PATH" kutusunu isaretleyin.
  echo.
  echo  Alternatif: server\sim_bridge\build_exe.bat ile bir kez
  echo  ERP-Sim-Bridge.exe uretin; sonra Python gerekmez.
  pause
  exit /b 1
)

echo  Python ile baslatiliyor: %PY%
%PY% server\sim_bridge\run.py --host 127.0.0.1 --port 8080 --open
if errorlevel 1 (
  echo.
  echo  Kopru kapandi. Yukaridaki mesaji okuyun.
  echo  Sik durum: 8080 portunda eski bir pencere acik.
  pause
  exit /b 1
)
exit /b 0
