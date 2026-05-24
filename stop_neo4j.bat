@echo off
title TFG-B2B — Stop Stack

cd /d "%~dp0"

echo.
echo  ==========================================
echo   TFG-B2B ^| Stop Stack
echo  ==========================================
echo.
echo  Choose an option:
echo.
echo    [1] Stop all services  (graph data preserved)
echo    [2] Stop + Wipe DB     (deletes all graph data)
echo    [3] Cancel
echo.
set /p choice=" Enter 1, 2 or 3: "

if "%choice%"=="1" goto stop
if "%choice%"=="2" goto wipe
goto cancel

:stop
call :kill_services
docker compose down
echo.
echo  All services stopped. Graph data is preserved.
goto end

:wipe
echo.
echo  WARNING: This will permanently delete ALL graph data.
set /p confirm=" Type YES to confirm: "
if /i not "%confirm%"=="YES" (
    echo  Cancelled.
    goto end
)
call :kill_services
docker compose down -v
echo.
echo  All services stopped and graph data deleted.
goto end

:cancel
echo  Cancelled.
goto end

:: ── Helper: kill backend + frontend ─────────────────────────────────────────
:kill_services
echo.
echo  Stopping FastAPI backend...
taskkill /fi "windowtitle eq TFG-B2B Backend*" /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo  Stopping Next.js frontend...
taskkill /fi "windowtitle eq TFG-B2B Frontend*" /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo  Stopping Neo4j container...
exit /b 0

:end
echo.
pause
