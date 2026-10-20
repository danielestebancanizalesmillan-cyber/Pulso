@echo off
title PulsAI — Arranque Completo
cd /d "%~dp0.."

echo.
echo  ╔════════════════════════════════════════╗
echo  ║   PulsAI — Sistema Completo v2.0       ║
echo  ╚════════════════════════════════════════╝
echo.
echo  Este script lanza:
echo    1. Gateway local (127.0.0.1:11435)
echo    2. Tunnel Cloudflare (URL publica automatica)
echo    3. Publica la URL en Vercel Blob
echo.
echo  Mantén esta ventana abierta mientras uses PulsAI.
echo  Para detener, cierra esta ventana o presiona Ctrl+C.
echo.
pause

node gateway\start-pulsai-full.mjs

pause
