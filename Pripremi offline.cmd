@echo off
cd /d "%~dp0"
echo Priprema muzike za lokalnu igru... Potrebna je internet veza.
node scripts\prepare-offline-music.mjs
pause
