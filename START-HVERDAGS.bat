@echo off
setlocal
cd /d "%~dp0"
echo.
echo   H V E R D A G S  1.0
echo.
if not exist ".env.local" (
  echo MANGLER .env.local. Opprett denne fra .env.local.example
  echo og fyll inn Supabase Project URL og publishable key.
  echo Les START-HER.txt for instruksjoner.
  echo.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js er ikke installert. Besok https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\.bin\next.cmd" (
  echo Installerer pakker ...
  call npm.cmd install
  if errorlevel 1 (
    echo Installasjonen feilet. Kopier feilmeldingen.
    pause
    exit /b 1
  )
)
echo.
echo Appen starter ... Apne http://localhost:3000
call npm.cmd run dev
if errorlevel 1 pause
