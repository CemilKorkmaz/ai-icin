@echo off
chcp 65001 >nul
setlocal
title ERP Studio - Tek Tik Test Ortami
cd /d "%~dp0"
set "PYTHONUTF8=1"

echo.
echo  ============================================================
echo   ERP Studio - Tek Tik Test Ortami (Windows)
echo  ============================================================
echo   ERP, simulasyon ve edge ekranlari birlikte acilir.
echo   Bu pencere acik kaldikca test ortami calisir.
echo  ============================================================
echo.

if not exist "tools\hepsi.py" (
  echo  [HATA] tools\hepsi.py bulunamadi.
  echo  Dosyayi depo kokunden calistirdiginizdan emin olun.
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
  echo  Kurulum: https://www.python.org/downloads/
  echo  Kurulumda "Add python.exe to PATH" kutusunu isaretleyin.
  pause
  exit /b 1
)

echo  Python ile baslatiliyor: %PY%
%PY% tools\hepsi.py %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo  Baslatici kapandi. Yukaridaki mesaji okuyun.
  echo  Sik durum: 8080 portunda eski bir pencere acik.
  pause
)
exit /b %RC%
