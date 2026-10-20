@echo off
title Cloudflare Quick Tunnel - PulsAI
cd /d "%~dp0.."

echo ========================================================
echo       CLOUDFLARE QUICK TUNNEL PARA PULSAI
echo ========================================================
echo.
echo NOTA: La URL generada por Quick Tunnel es TEMPORAL.
echo Si cierras esta ventana o reinicias el tunel, la URL cambiara.
echo Debes copiar la URL https://*.trycloudflare.com y configurarla
echo en OLLAMA_HOST en Vercel o tu entorno remoto de Pulso.
echo.
echo Conectando al Gateway local (http://127.0.0.1:11435)...
echo.

.\cloudflared.exe tunnel --url http://127.0.0.1:11435
pause
