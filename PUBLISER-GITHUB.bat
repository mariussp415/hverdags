@echo off
setlocal
cd /d "%~dp0"
echo.
echo    H V E R D A G S  -  GitHub Pages
 echo.
echo Opprett forst et OFFENTLIG, TOMT repository kalt hverdags pa https://github.com/new
 echo.
where git.exe >nul 2>&1
if errorlevel 1 (
  echo Git er ikke installert. Installer fra https://git-scm.com/downloads
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js er ikke installert.
  pause
  exit /b 1
)
set /p USERNAME=GitHub brukernavn: 
if "%USERNAME%"=="" (
  echo Du ma skrive et brukernavn.
  pause
  exit /b 1
)
echo Lager package-lock og sjekker pakker ...
call npm.cmd install
if errorlevel 1 (
  echo npm install feilet. Ta vare pa feilmeldingen.
  pause
  exit /b 1
)
if not exist .git\config git init
if errorlevel 1 (
  echo git init feilet.
  pause
  exit /b 1
)
git branch -M main
git add .
git commit -m "Publiser Hverdags" || echo Hvis det sto nothing to commit, kan du fortsette.
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/%USERNAME%/hverdags.git
)
echo Publiserer til https://github.com/%USERNAME%/hverdags ...
git push -u origin main
if errorlevel 1 (
  echo Push feilet. Kontroller at repository finnes og at du har logget inn i GitHub.
  pause
  exit /b 1
)
echo.
echo Filene er sendt til GitHub! Aktiver Settings - Pages - GitHub Actions.
pause
