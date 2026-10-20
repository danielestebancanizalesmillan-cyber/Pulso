@echo off
title PulsAI Local Service (Gateway + Ollama)
cd /d "%~dp0.."

echo ========================================================
echo       PULSAI LOCAL GATEWAY & OLLAMA RUNNER
echo ========================================================

:: 1. Iniciar Ollama en segundo plano si no está corriendo
powershell -Command "Get-Process ollama* -ErrorAction SilentlyContinue" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Iniciando servidor Ollama...
    start "" /B "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    timeout /t 3 >nul
) else (
    echo [*] Servidor Ollama ya se encuentra en ejecucion.
)

:: 2. Iniciar Gateway seguro local en puerto 11435
echo [*] Iniciando PulsAI Gateway en 127.0.0.1:11435...
node gateway\pulsai-gateway.mjs
pause
