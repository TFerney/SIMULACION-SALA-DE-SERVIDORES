@echo off
title Gemelo Digital 3D - UDES
cd /d "%~dp0"

echo ===================================================
echo   GEMELO DIGITAL 3D - SALA DE SERVIDORES Y CFD
echo   Universidad de Santander (UDES)
echo   Iniciando servidor local y abriendo navegador...
echo ===================================================
echo.

:: Intentar con Python si esta instalado
where python >nul 2>&1
if %errorlevel% equ 0 (
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

:: Alternativa nativa con PowerShell (no requiere instalar nada)
echo Iniciando servidor HTTP nativo con PowerShell...
start http://localhost:8000
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8000/'); $listener.Start(); Write-Host 'Servidor activo en http://localhost:8000/ - Presiona Ctrl+C para salir'; while($listener.IsListening){ $context = $listener.GetContext(); $req = $context.Request; $res = $context.Response; $path = '.' + $req.RawUrl.Split('?')[0]; if($path -eq './') { $path = './index.html' }; if(Test-Path $path){ $bytes = [System.IO.File]::ReadAllBytes($path); $ext = [System.IO.Path]::GetExtension($path).ToLower(); if($ext -eq '.html'){$res.ContentType = 'text/html; charset=utf-8'} elseif($ext -eq '.js'){$res.ContentType = 'application/javascript; charset=utf-8'} elseif($ext -eq '.css'){$res.ContentType = 'text/css; charset=utf-8'} elseif($ext -eq '.json'){$res.ContentType = 'application/json'}; $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length) } else { $res.StatusCode = 404 }; $res.OutputStream.Close() }"

:end
