# ERP Edge Collector — Windows oturum açılışında otomatik başlatma.
# Yönetici PowerShell ile:  powershell -ExecutionPolicy Bypass -File install-task.ps1
# Kaldırmak için:           Unregister-ScheduledTask -TaskName "ERP Edge Collector" -Confirm:$false

$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot 'dist\ERP-Edge-Collector.exe'
if (-not (Test-Path $exe)) { throw "Önce build_exe.bat çalıştırın: $exe bulunamadı" }

$action  = New-ScheduledTaskAction -Execute $exe -Argument '--no-browser' -WorkingDirectory (Split-Path $exe)
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
              -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName 'ERP Edge Collector' -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Description 'Fabrika sensör verilerini SQLite ve ERP''ye aktarır (docs/13)' -Force | Out-Null
Write-Host '✓ Görev oluşturuldu: oturum açıldığında ajan --no-browser ile başlar.'
Write-Host '  Elle başlatma: Start-ScheduledTask -TaskName "ERP Edge Collector"'
Write-Host '  Arayüz: http://127.0.0.1:8787'
