@echo off
title SharedMemoryLocalDB

cd /d "c:\Playground\Tools\SharedMemoryLocalDB"

echo Starting API server...
start "API Server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo Starting ngrok tunnel...
start "ngrok tunnel" cmd /k "ngrok http --domain=unconcreted-supereligible-madalynn.ngrok-free.dev 3000"

echo.
echo Both processes started. You can close this window.
