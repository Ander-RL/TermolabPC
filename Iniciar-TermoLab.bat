@echo off
chcp 65001 >nul
title TermoLab PC — Servidor Local
cd /d "%~dp0"

echo ==================================================
echo   TermoLab PC — Iniciando panel en tiempo real
echo ==================================================
echo.
echo   URL: http://localhost:3000
echo   Para cerrar la aplicacion, simplemente cierra esta ventana.
echo.

if not exist "node_modules" (
  echo [!] No se encontro node_modules. Instalando dependencias...
  call npm install --legacy-peer-deps
)

start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
call npm run dev

echo.
echo [!] El servidor se ha detenido.
pause
